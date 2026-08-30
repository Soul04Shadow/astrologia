# tool-calling-deep - Work Plan

## TL;DR (For humans)
**What you'll get:** The AI can now think and calculate before answering — if you ask "what happens in June?" it will quietly compute that month's transit/panchang/dasha itself and then answer, instead of guessing from the birth chart alone. You’ll see small “consulted transit” badges when it does.

**Why this approach:** We let the chat call your existing Swiss-Ephemeris engine as tools (no new astro math), so answers stay exact but now multi-step. Dosha tools will just plug in later.

**What it will NOT do:** No new dosha/Shadbala math (Track B), no RAG/vector DB, no hosting change.

**Effort:** Medium (5 todos + final, 1 day)
**Risk:** Low — 6 tools on already-tested engine, tool_choice auto, fallback to direct answer if provider doesn’t support tools
**Decisions to sanity-check:** 6 tools on existing engine ok? Tool loop in chat router (not LLM service) ok?

Your next move: approve this plan, then worker adds `fix/tools-deep` from `fix/chat-sessions:bb12201`. Or request high-accuracy review.

---

> TL;DR (machine): Medium/Low — 6 engine-backed function tools + chat tool-loop + streaming chips, branch fix/tools-deep from bb12201

## Scope
### Must have
- Branch `fix/tools-deep` from `fix/chat-sessions:bb12201`
- `backend/app/services/tools.py` — 6 OpenAI function specs + executors: `get_chart_snapshot`, `get_transit(at_date)`, `get_panchang(at_date)`, `get_dasha_at(at_date)`, `get_yogas`, `get_navamsa` (all call `engine/*` with birth lat/lon/tz from chart)
- `backend/app/services/llm.py:19` `stream_chat(messages, tools, tool_choice)` passthrough + streaming `tool_calls` parse
- `backend/app/routers/chat.py:48` tool-loop: send `tools`, intercept `tool_calls` deltas, execute `tools.execute(name, args, chart)`, append `tool` messages, re-stream until stop (max 5 turns), touch session updated_at
- `backend/app/services/prompt.py:42` add one line "If a calculation at another date would help, call a tool first, then answer" + existing guardrails
- Frontend `chat/[id]/page.tsx:99` chips for `event: tool_call` ("Consulted …") + streaming still works

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO dosha/Shadbala/D10 (Track B)
- NO vector DB or RAG
- NO hosting/auth/payment
- NO committing .env/app.db

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: tests-after + pytest (mock tool_calls) + next build
- Framework: `pytest` + `TestClient` + `next build`
- Evidence: `.omo/evidence/task-<N>-tool-calling-deep.log`

## Execution strategy
### Parallel execution waves
Wave 1: T1 branch, T2 tools registry — sequential. Wave 2: T3 llm passthrough + prompt, T4 chat tool-loop — T4 depends T2/T3. Wave 3: T5 frontend chips + TL, T6 tests+build — T6 after T5.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| 1 Branch | — | 2,3,4,5,6 | — |
| 2 Tools registry | 1 | 4,6 | 3 |
| 3 LLM passthrough + prompt | 1 | 4,6 | 2 |
| 4 Chat tool-loop | 2,3 | 5,6 | — |
| 5 Frontend chips | 4 | 6 | — |
| 6 Tests+build | 5 | — | — |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [ ] 1. Branch fix/tools-deep from bb12201
  What to do: `git status` clean except .omo, `git branch --show-current` is `fix/chat-sessions`, run `git checkout -b fix/tools-deep` (fallback checkout if exists). Must NOT edit files.
  Parallelization: Wave 1 | Blocked by: — | Blocks: 2,3,4,5,6
  References: fix/chat-sessions:bb12201, .omo/plans/tool-calling-deep.md
  Acceptance criteria: `git branch --show-current` == `fix/tools-deep`; `git log --oneline -1` parent is bb12201
  QA scenarios: happy branch created; failure branch exists → checkout; Evidence .omo/evidence/task-1-tool-calling-deep.log
  Commit: N | —

- [ ] 2. Tool registry 6 tools (+ own QA)
  What to do: Create `backend/app/services/tools.py` with `TOOLS: list[dict]` OpenAI specs: `get_transit({at_date: string required, format date})`, `get_panchang({at_date})`, `get_dasha_at({at_date})`, `get_yogas (no params)`, `get_navamsa (no params)`, `get_chart_snapshot (no params)` each with description + parameters jsonSchema; `async def execute(name, args, chart)` calls `engine/*` with `chart["birth_details"]` lat/lon/tz and returns `json.dumps(result)`. Bad date → raise ValueError.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 4 | Can parallelize with: 3
  References: backend/app/engine/core.py, transits.py, panchang.py, dasha.py, yogas.py, navamsa.py, backend/app/services/llm.py
  Acceptance criteria: `workdir: backend` `.\.venv\Scripts\python.exe -c "from app.services.tools import TOOLS; assert len(TOOLS)==6"`; `workdir: backend` `.\.venv\Scripts\python.exe -c "import asyncio, json; from app.services.tools import execute; from app.engine import compute_full_chart; c=compute_full_chart(1990,5,21,14,30,'Asia/Kolkata',28.61,77.20); print(asyncio.run(execute('get_transit', {'at_date':'2027-06-01'}, c)))"` returns JSON with positions
  QA scenarios: happy — 6 tools JSON Schema validate via `jsonschema` and execute returns JSON; failure — `execute("get_transit", {"at_date":"bad"}, chart)` raises ValueError not crash; Evidence .omo/evidence/task-2-tool-calling-deep.log (execute outputs)
  Commit: N | —

- [ ] 3. LLM passthrough (+ fragment-safe) + prompt hint
  What to do: In `backend/app/services/llm.py:19` add params `tools: list|None=None, tool_choice: str|None=None` to `stream_chat` and `complete_chat`, set `payload["tools"]=tools` / `payload["tool_choice"]=tool_choice` only if not None (keep `stream_chat(messages, provider=...)` backward compat). Change return type to `AsyncGenerator[dict, None]` where dict is `{"type":"delta","content":str}` or `{"type":"tool_calls","tool_calls":[{id,name,arguments}]}`. For streaming, accumulate fragments: `buffer: dict[id] -> {name, arguments: str}` on each `delta.get("tool_calls")` chunk concat `arguments`, parse `json.loads` only when `finish_reason=="tool_calls"` or `accumulated.arguments` is complete JSON — then yield full tool_calls. In `backend/app/services/prompt.py:42` add after persona: "If a calculation at another date would help, call a tool first, then answer. Think step-by-step before answering." Keep guardrails. Must NOT break non-tool streams.
  Parallelization: Wave 1 | Blocked by: 1 | Blocks: 4 | Can parallelize with: 2
  References: backend/app/services/llm.py:19 stream_chat, backend/app/services/prompt.py:42 build_system_prompt, OpenAI tool_calls fragment spec
  Acceptance criteria: `workdir: backend` `.\.venv\Scripts\python.exe -c "import inspect; assert 'tools' in inspect.signature(__import__('app.services.llm', fromlist=['stream_chat']).stream_chat).parameters"` and same for `complete_chat`; `stream_chat` with `tools=None` still yields `type delta` as before
  QA scenarios: happy — fragmented tool_calls (2 chunks `{"at_` + `"date":"2027`) re-assembled correctly; failure — tools=None stream unchanged; Evidence .omo/evidence/task-3-tool-calling-deep.log (fragment test)
  Commit: N | —

- [ ] 4. Chat tool-loop (deep reasoning, SSE event: tool_call fix, max 5 fallback)
  What to do: In `backend/app/routers/chat.py:48` `chat()` keep `session_id Query(None)` alias, load chart, build `messages=[system,*history,user]`, then `for turn in range(5):` → `async for event in stream_chat(messages, tools=TOOLS, tool_choice="auto")` where event is `{"type":"delta"}` or `{"type":"tool_calls"}`. If `tool_calls`: if `turn==4` (last) break and force `stream_chat(messages, tool_choice="none")` else execute each via `tools.execute` (try/except → error json), append `{"role":"assistant","tool_calls":...}` + `{"role":"tool","tool_call_id":id, "content":result}` to messages, yield SSE `data: {"event":"tool_call","name":name,"args":args}\n\n` (use `data:` JSON, not `event:` line) to frontend, continue loop; else collect delta, yield `data: {"delta": delta}\n\n`. After loop save assistant message with session_id, touch session updated_at (`db` is sync Session inside async stream — use `db.commit` before `event_stream` and `SessionLocal()` new session inside stream for tool updates). Must handle `ValueError` from tools → `data: {"event":"error_tool","detail":str}` not crash. `db.rollback()` safe.
  Parallelization: Wave 2 | Blocked by: 2,3 | Blocks: 5,6
  References: backend/app/routers/chat.py:48 event_stream, backend/app/services/tools.py, backend/app/services/llm.py, backend/app/db.py SessionLocal
  Acceptance criteria: TestClient mock: first `stream_chat` returns `{"type":"tool_calls","tool_calls":[{"id":"1","name":"get_transit","arguments":'{"at_date":"2027-06-01"}'}]}` then second returns `{"type":"delta","content":"answer with June"}` → SSE contains `data: {"event":"tool_call"}` + `data: {"delta":"answer"` and DB saved assistant contains "June"; session updated_at changed
  QA scenarios: happy — tool then answer; failure — tool `ValueError` yields `event:error_tool` and still returns final delta; Evidence .omo/evidence/task-4-tool-calling-deep.log
  Commit: N | —

- [ ] 5. Frontend tool chips (tool_call event)
  What to do: In `frontend/src/app/chat/[id]/page.tsx:99 send()` add state `toolCalls: {id,name,args}[]` cleared on new send; SSE parse: `const obj=JSON.parse(line.slice(5)); if(obj.event==="tool_call"){ setToolCalls(prev=>[...prev, obj]); } else if(obj.delta){ setStreamText(...) } else if(obj.event==="error_tool")...`. Render chips above streamed answer: `🔧 Consulted {name} {args.at_date}` collapsible, under header. Keep existing `translatedCache`, markdown, typing dots. Must NOT break non-tool streams (`obj.delta` path still works).
  Parallelization: Wave 2 | Blocked by: 4 | Blocks: 6
  References: frontend/src/app/chat/[id]/page.tsx:99 send SSE (parses `data:` JSON, checks `event.delta`/`event.event`), frontend/src/components/*, backend/api translate
  Acceptance criteria: `workdir: frontend` `npm.cmd run build` passes 0 errors; mock SSE `data: {"event":"tool_call","name":"get_transit","args":{"at_date":"2027-06-01"}}` renders chip without breaking delta streaming
  QA scenarios: happy — chip shown; failure — no tool_calls still streams normally; Evidence .omo/evidence/task-5-tool-calling-deep.log
  Commit: N | —

- [ ] 6. Tests + build green (full suite)
  What to do: Add `backend/tests/test_tools.py` (6 tools JSON Schema + execute returns JSON, bad date raises) and `test_api_tool_loop.py` (TestClient mocks `stream_chat` to return tool_calls then delta). Run `workdir: backend` `.\.venv\Scripts\python.exe -m pytest tests -v` expect 24+3=27 passed. Run `workdir: frontend` `npm.cmd run build` (Windows `npm.cmd`, linux `npm`). Must handle stale app.db via create_all.
  Parallelization: Wave 3 | Blocked by: 5 | Blocks: —
  References: backend/tests/test_api.py, backend/app/services/tools.py
  Acceptance criteria: pytest 27 passed 0 failed; next build exit 0
  QA scenarios: happy 27 passed; failure tool timeout handled (execute mock raises → error_tool event); Evidence .omo/evidence/task-6-tool-calling-deep.log
  Commit: Y | feat(chat): tool-calling deep reasoning with 6 engine tools

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit — all Must have on fix/tools-deep present, no dosha.math, .env not committed
- [ ] F2. Code quality review — tools use engine only, guardrails intact, llm.py backward compat
- [ ] F3. Real manual QA — ask "June 2027 career?" → see tool chip then grounded answer with June transit dates
- [ ] F4. Scope fidelity — fix/tools-deep is revertible atop bb12201, master untouched

## Commit strategy
- One commit on `fix/tools-deep` at T6: `feat(chat): tool-calling deep reasoning with 6 engine tools`

## Success criteria
- `git branch --show-current` == `fix/tools-deep`, `pytest 27 passed`, `next build 0`
- User can ask date-specific question and see tool chip → answer cites concrete transit/dasha dates from that date, not just birth chart
- No regression: sessions, translation, D1/D9, PDF still work
