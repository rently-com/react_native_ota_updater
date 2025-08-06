#!/bin/bash
set -e

# Install only migration dependencies
echo "Installing migration dependencies"
cd scripts
pnpm install --prod

echo "Running database migrations"
pnpm run db:migrate:prod &
PID=$!
# Wait for migration to finish
wait $PID


