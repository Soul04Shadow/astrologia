from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profiles: Mapped[list["Profile"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    birth_date: Mapped[str] = mapped_column(String(10))
    birth_time: Mapped[str] = mapped_column(String(5))
    place_name: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    tz_name: Mapped[str] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    sessions: Mapped[list["ChatSession"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    owner: Mapped["User | None"] = relationship(back_populates="profiles")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    profile: Mapped[Profile] = relationship(back_populates="sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"))
    session_id: Mapped[int | None] = mapped_column(ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    profile: Mapped[Profile] = relationship(back_populates="messages")
    session: Mapped[ChatSession | None] = relationship(back_populates="messages")


_settings = get_settings()

_connect_args: dict = {}
if _settings.database_url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
elif _settings.database_url.startswith("postgresql"):
    _connect_args["prepare_threshold"] = None

engine = create_engine(
    _settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _migrate_existing_messages(db=None) -> None:
    close_after = False
    if db is None:
        db = SessionLocal()
        close_after = True
    try:
        from sqlalchemy import select

        profiles = db.scalars(select(Profile)).all()
        for profile in profiles:
            default_session = db.scalars(
                select(ChatSession).where(ChatSession.profile_id == profile.id).order_by(ChatSession.created_at)
            ).first()
            if not default_session:
                default_session = ChatSession(profile_id=profile.id, title="First consultation")
                db.add(default_session)
                db.flush()
            # assign orphan messages
            db.execute(
                text("UPDATE chat_messages SET session_id = :sid WHERE profile_id = :pid AND session_id IS NULL"),
                {"sid": default_session.id, "pid": profile.id},
            )
        db.commit()
    finally:
        if close_after:
            db.close()


def init_db() -> None:
    Base.metadata.create_all(engine)
    # column-exists check for existing app.db (idempotent migration for session_id)
    try:
        insp = inspect(engine)
        if "chat_messages" in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns("chat_messages")]
            if "session_id" not in cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE chat_messages ADD COLUMN session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages (session_id)"))
        if "profiles" in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns("profiles")]
            if "user_id" not in cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE profiles ADD COLUMN user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE"))
                    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_profiles_user_id ON profiles (user_id)"))
    except Exception:
        pass
    # ensure index exists even if column existed but index missing
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages (session_id)"))
    except Exception:
        pass
    try:
        _migrate_existing_messages()
    except Exception:
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
