import os

# Tests must NEVER touch the real configured DB or auth.
# Force local SQLite + local-auth mode BEFORE any app import reads settings.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_JWT_SECRET"] = ""
os.environ["ALLOWED_EMAILS"] = ""
os.environ["ADMIN_EMAILS"] = ""
