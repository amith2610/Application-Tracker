#!/bin/sh
set -e
# Run migrations against DATABASE_URL (must be set; e.g. file:/data/dev.db)
# Use node to run Prisma CLI (npx/prisma not on PATH in minimal runner image)
node node_modules/prisma/build/index.js migrate deploy
# Start the app (standalone server.js)
exec node server.js
