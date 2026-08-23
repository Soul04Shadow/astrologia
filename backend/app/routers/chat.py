from __future__ import annotations

import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings, provider_config
from app.db import ChatMessage, ChatSession, Profile, SessionLocal, get_db
from app.routers.charts import _chart_for_profile
from app.schemas import ChatRequest
from app.services.llm import LLMError, stream_chat
from app.services.prompt import build_system_prompt
from app.services.tools import TOOLS, execute

router = APIRouter(prefix="/chat", tags=["chat"])


def _history_messages(db: Session, profile_id: int, session_id: int | None = None) -> list[dict]:
    s = get_settings()
    q = select(ChatMessage).where(ChatMessage.profile_id == profile_id)
    if session_id is not None:
        q = q.where(ChatMessage.session_id == session_id)
    msgs = db.scalars(q.order_by(ChatMessage.created_at.desc()).limit(s.max_history_messages)).all()
    msgs.reverse()
    return [{"role": m.role, "content": m.content} for m in msgs]


def _get_or_create_default_session(db: Session, profile_id: int) -> ChatSession:
    sess = db.scalars(
        select(ChatSession).where(ChatSession.profile_id == profile_id).order_by(ChatSession.created_at)
    ).first()
    if not sess:
        sess = ChatSession(profile_id=profile_id, title="First consultation")
        db.add(sess)
        db.flush()
    return sess


@router.post("/{profile_id}")
def chat(profile_id: int, payload: ChatRequest, session_id: int | None = Query(None), db: Session = Depends(get_db)):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # resolve session
    resolved_session: ChatSession | None = None
    if session_id is not None:
        resolved_session = db.get(ChatSession, session_id)
        if not resolved_session or resolved_session.profile_id != profile_id:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        resolved_session = _get_or_create_default_session(db, profile_id)
        session_id = resolved_session.id

    try:
        chart = _chart_for_profile(profile)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Chart calculation failed: {e}")

    system_prompt = build_system_prompt(chart, name=profile.name, language=payload.language)
    history = _history_messages(db, profile_id, session_id)

    # auto-title from first message (40 chars) if default title
    if not history and resolved_session.title in ("First consultation", "New chat"):
        resolved_session.title = payload.message.strip()[:40] or resolved_session.title

    # touch updated_at
    resolved_session.updated_at = datetime.utcnow()
    db.add(resolved_session)
    db.commit()
    db.refresh(resolved_session)

    user_msg = ChatMessage(profile_id=profile.id, session_id=session_id, role="user", content=payload.message,
                           language=payload.language)
    db.add(user_msg)
    db.commit()

    messages = [{"role": "system", "content": system_prompt}, *history,
                {"role": "user", "content": payload.message}]

    cfg = provider_config(payload.provider, payload.model)

    # capture for closure (use new SessionLocal inside stream)
    saved_profile_id = profile.id
    saved_session_id = session_id
    saved_provider = payload.provider or get_settings().llm_provider
    saved_model = cfg["model"]
    saved_language = payload.language
    # need to ensure db session is not used inside async stream directly; use SessionLocal there
    # commit already done; close outer? but outer will be closed after return

    async def _safe_stream(msgs, provider: str | None = None, model: str | None = None, tools: list[dict] | None = None, tool_choice: str | None = None, with_tools: bool | None = None, force_no_tool: bool = False):
        # Determine effective provider/model
        eff_provider = provider if provider is not None else payload.provider
        eff_model = model if model is not None else saved_model
        # Handle with_tools / force_no_tool legacy flags for backward compat
        # force_no_tool means call with tool_choice="none" and no tools
        if force_no_tool:
            # try with model + tool_choice none
            try:
                async for ev in stream_chat(msgs, provider=eff_provider, model=eff_model, tool_choice="none"):
                    yield ev
                return
            except TypeError as e:
                msg = str(e)
                if "model" in msg or "tool_choice" in msg or "unexpected" in msg:
                    try:
                        async for ev in stream_chat(msgs, provider=eff_provider, tool_choice="none"):
                            yield ev
                        return
                    except TypeError as e2:
                        if "tool_choice" in str(e2) or "unexpected" in str(e2):
                            async for ev in stream_chat(msgs, provider=eff_provider):
                                yield ev
                            return
                        raise
                raise
        # if caller used with_tools flag explicitly
        if with_tools is not None:
            if with_tools:
                tools = TOOLS
                tool_choice = "auto"
            else:
                tools = None
                tool_choice = None
        # if tools/tool_choice not explicitly provided but with_tools was True before, handled above
        # Now forward to stream_chat with fallback for old mocks
        # Normalize: if tools is None and tool_choice is None, just call with provider+model
        try:
            async for ev in stream_chat(msgs, provider=eff_provider, model=eff_model, tools=tools, tool_choice=tool_choice):
                yield ev
            return
        except TypeError as e:
            msg = str(e)
            if "model" in msg or "tools" in msg or "tool_choice" in msg or "unexpected" in msg:
                # try without model
                try:
                    async for ev in stream_chat(msgs, provider=eff_provider, tools=tools, tool_choice=tool_choice):
                        yield ev
                    return
                except TypeError as e2:
                    msg2 = str(e2)
                    if "tools" in msg2 or "tool_choice" in msg2 or "unexpected" in msg2:
                        # try with just model
                        try:
                            async for ev in stream_chat(msgs, provider=eff_provider, model=eff_model):
                                yield ev
                            return
                        except TypeError as e3:
                            if "model" in str(e3) or "unexpected" in str(e3):
                                async for ev in stream_chat(msgs, provider=eff_provider):
                                    yield ev
                                return
                            raise
                    raise
            raise

    async def event_stream():
        full_reply: list[str] = []
        try:
            yield f"data: {json.dumps({'event': 'start', 'provider': saved_provider})}\n\n"
            outer_messages = list(messages)  # copy to allow tool additions
            # Gemini OpenAI endpoint requires thought_signature for tools → disable tool-loop for gemini for now (fallback to static grounded prompt)
            use_tools = saved_provider != "gemini"
            # tool-loop up to 5 turns (disabled for gemini)
            for turn in range(5):
                got_tool_calls = None
                # buffer delta for this turn
                turn_had_delta = False
                if use_tools:
                    stream_iter = _safe_stream(outer_messages, provider=payload.provider, model=saved_model, tools=TOOLS, tool_choice="auto")
                else:
                    stream_iter = _safe_stream(outer_messages, provider=payload.provider, model=saved_model)
                async for event in stream_iter:
                    # handle backward compat: string delta
                    if isinstance(event, str):
                        full_reply.append(event)
                        turn_had_delta = True
                        yield f"data: {json.dumps({'delta': event})}\n\n"
                        continue
                    if not isinstance(event, dict):
                        continue
                    etype = event.get("type")
                    if etype == "delta":
                        content = event.get("content") or ""
                        if content:
                            full_reply.append(content)
                            turn_had_delta = True
                            yield f"data: {json.dumps({'delta': content})}\n\n"
                    elif etype == "reasoning":
                        r_content = event.get("content") or ""
                        if r_content:
                            yield f"data: {json.dumps({'event': 'reasoning', 'delta': r_content})}\n\n"
                    elif etype == "tool_calls":
                        got_tool_calls = event.get("tool_calls") or []
                        # break inner loop to handle tool execution
                        break
                    else:
                        # unknown type, ignore
                        continue

                if got_tool_calls:
                    # if last turn, force final answer without tools
                    if turn == 4:
                        # try to get final answer without tool choice
                        try:
                            async for event in _safe_stream(outer_messages, provider=payload.provider, model=saved_model, tool_choice="none", force_no_tool=True):
                                if isinstance(event, str):
                                    full_reply.append(event)
                                    yield f"data: {json.dumps({'delta': event})}\n\n"
                                elif isinstance(event, dict) and event.get("type") == "delta":
                                    c = event.get("content") or ""
                                    if c:
                                        full_reply.append(c)
                                        yield f"data: {json.dumps({'delta': c})}\n\n"
                        except LLMError as e:
                            yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"
                            return
                        break

                    # execute each tool call
                    for tc in got_tool_calls:
                        tc_id = tc.get("id") or "call_0"
                        name = tc.get("name") or "unknown"
                        raw_args = tc.get("arguments") or "{}"
                        # parse args for frontend chip
                        try:
                            args_obj = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
                            if not isinstance(args_obj, dict):
                                args_obj = {}
                        except Exception:
                            args_obj = {}
                            # also try to keep raw if parse fails, but chip will show empty
                            try:
                                args_obj = json.loads(raw_args) if isinstance(raw_args, str) else {}
                            except:
                                args_obj = {"_raw": raw_args}

                        # yield tool_call event to frontend (must be data: JSON)
                        try:
                            yield f"data: {json.dumps({'event': 'tool_call', 'name': name, 'args': args_obj})}\n\n"
                        except Exception:
                            # fallback
                            yield f"data: {json.dumps({'event': 'tool_call', 'name': name, 'args': {}})}\n\n"

                        # execute tool
                        try:
                            result = await execute(name, args_obj, chart)
                        except ValueError as ve:
                            # spec: ValueError -> error_tool event not crash
                            try:
                                yield f"data: {json.dumps({'event': 'error_tool', 'detail': str(ve)})}\n\n"
                            except:
                                pass
                            result = json.dumps({"error": str(ve)}, ensure_ascii=False)
                        except Exception as e:
                            try:
                                yield f"data: {json.dumps({'event': 'error_tool', 'detail': str(e)})}\n\n"
                            except:
                                pass
                            result = json.dumps({"error": str(e)}, ensure_ascii=False)

                        # append tool call + result to outer_messages for next iteration
                        # OpenAI format: assistant with tool_calls, then tool with tool_call_id
                        try:
                            outer_messages.append({
                                "role": "assistant",
                                "tool_calls": [{"id": tc_id, "type": "function", "function": {"name": name, "arguments": raw_args if isinstance(raw_args, str) else json.dumps(raw_args)}}]
                            })
                        except Exception:
                            outer_messages.append({"role": "assistant", "content": ""})
                        outer_messages.append({"role": "tool", "tool_call_id": tc_id, "content": result})

                    # continue outer loop to re-stream with updated messages
                    continue
                else:
                    # no tool calls -> we already streamed delta for this turn, break outer loop (answer complete)
                    # if we had no delta but also no tool_calls, it means empty response, break anyway
                    break

            content = "".join(full_reply)
            # save assistant message and touch session using new sync session
            try:
                db2 = SessionLocal()
                try:
                    assistant_msg = ChatMessage(profile_id=saved_profile_id, session_id=saved_session_id, role="assistant", content=content,
                                                provider=saved_provider,
                                                language=saved_language)
                    db2.add(assistant_msg)
                    # touch session again on assistant reply
                    sess = db2.get(ChatSession, saved_session_id)
                    if sess:
                        sess.updated_at = datetime.utcnow()
                        db2.add(sess)
                    db2.commit()
                finally:
                    db2.close()
            except Exception:
                # rollback safe, but still yield done
                pass
            yield f"data: {json.dumps({'event': 'done'})}\n\n"
        except LLMError as e:
            try:
                db2 = SessionLocal()
                db2.rollback()
                db2.close()
            except:
                pass
            yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"
        except Exception as e:
            try:
                db2 = SessionLocal()
                db2.rollback()
                db2.close()
            except:
                pass
            yield f"data: {json.dumps({'event': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
