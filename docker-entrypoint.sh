#!/bin/sh
set -e
# Run migrations against DATABASE_URL (must be set; e.g. file:/data/dev.db)
npx prisma migrate deploy
# Start the app (standalone server.js or npm run start)
exec node server.js
