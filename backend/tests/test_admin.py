from fastapi.testclient import TestClient

from app.db import SessionLocal, User
from app.main import app
from app.services.auth import get_current_user

ADMIN_USER = User(id="local-admin", email="admin@example.com", name="Super Admin")
REGULAR_USER = User(id="regular-user", email="user@regular.com", name="Regular User")


def _login_as(user: User):
    app.dependency_overrides[get_current_user] = lambda: user


def teardown_function():
    app.dependency_overrides.clear()


def test_admin_endpoints_as_admin():
    with TestClient(app) as client:
        # Ensure user exists in db
        with SessionLocal() as db:
            if not db.get(User, ADMIN_USER.id):
                db.add(ADMIN_USER)
                db.commit()

        _login_as(ADMIN_USER)

        # 1. Overview
        res = client.get("/api/admin/overview")
        assert res.status_code == 200
        data = res.json()
        assert "metrics" in data
        assert "diagnostics" in data

        # 2. Add to allowlist
        res = client.post("/api/admin/allowlist", json={"email": "tester@example.com", "notes": "Beta Tester 1"})
        assert res.status_code == 200
        assert res.json()["email"] == "tester@example.com"

        # 3. List allowlist
        res = client.get("/api/admin/allowlist")
        assert res.status_code == 200
        emails = [it["email"] for it in res.json()]
        assert "tester@example.com" in emails

        # 4. Users list
        res = client.get("/api/admin/users")
        assert res.status_code == 200
        users = res.json()
        assert len(users) >= 1

        # 5. Settings get & update
        res = client.get("/api/admin/settings")
        assert res.status_code == 200
        assert "providers" in res.json()

        res = client.put("/api/admin/settings", json={"default_provider": "gemini"})
        assert res.status_code == 200

        # 6. Prompt get, update, reset
        res = client.get("/api/admin/prompt")
        assert res.status_code == 200
        prompt_data = res.json()
        assert "persona" in prompt_data
        assert "guidelines" in prompt_data

        res = client.put("/api/admin/prompt", json={"persona": "Custom Astrologer Persona"})
        assert res.status_code == 200

        res = client.get("/api/admin/prompt")
        assert res.json()["persona"] == "Custom Astrologer Persona"
        assert res.json()["is_overridden"] is True

        res = client.post("/api/admin/prompt/reset")
        assert res.status_code == 200
        res = client.get("/api/admin/prompt")
        assert res.json()["is_overridden"] is False

        # 7. Remove from allowlist
        res = client.delete("/api/admin/allowlist/tester@example.com")
        assert res.status_code == 200
        assert res.json()["deleted"] is True


def test_admin_endpoints_forbidden_for_non_admin():
    with TestClient(app) as client:
        with SessionLocal() as db:
            if not db.get(User, REGULAR_USER.id):
                db.add(REGULAR_USER)
                db.commit()

        _login_as(REGULAR_USER)

        res = client.get("/api/admin/overview")
        assert res.status_code == 403
        assert "Admin" in res.json()["detail"]

        res = client.post("/api/admin/allowlist", json={"email": "bad@example.com"})
        assert res.status_code == 403
