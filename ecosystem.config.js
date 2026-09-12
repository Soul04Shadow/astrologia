module.exports = {
  apps: [
    {
      name: "astrologia-backend",
      cwd: "/home/soulshadow/astrologia/backend",
      script: "/home/soulshadow/astrologia/backend/.venv/bin/uvicorn",
      args: "app.main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      restart_delay: 3000,
      env: {
        PYTHONUNBUFFERED: "1",
      },
    },
    {
      name: "astrologia-frontend",
      cwd: "/home/soulshadow/astrologia/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      interpreter: "node",
      restart_delay: 3000,
    },
  ],
};
