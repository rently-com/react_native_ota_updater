#!/usr/bin/env bash
# Use this script to start docker containers for local development (Database and Redis)

# TO RUN ON WINDOWS:
# 1. Install WSL (Windows Subsystem for Linux) - https://learn.microsoft.com/en-us/windows/wsl/install
# 2. Install Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/install/
# 3. Open WSL - `wsl`
# 4. Run this script - `./start-services.sh`

# On Linux and macOS you can run this script directly - `./start-services.sh`

# Database configuration
DB_CONTAINER_NAME="ota-db"
DB_USER="ota_user"
DB_PASSWORD=password
DB_PORT=5432
DB_NAME="ota"

# Redis configuration
REDIS_CONTAINER_NAME="ota-redis"
REDIS_PORT=6379

# To DB Dump the Staging DB to localhost:
# pg_dump "" | psql "postgres://ota_user:password@localhost:5432/ota"

# Function to source .env file and get actual values
source_env() {
  if [ -f ".env" ]; then
    # Export variables from .env file, ignoring comments and empty lines
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
  fi
}

# Function to check if database should be started locally
should_start_database() {
  if [ ! -f ".env" ]; then
    echo "No .env file found, starting database container..."
    return 0
  fi

  # Source the .env file to get actual values
  source_env

  # Check if DATABASE_URL is set and points to localhost
  if [ -n "$DATABASE_URL" ]; then
    if [[ "$DATABASE_URL" == *"@localhost"* ]] || [[ "$DATABASE_URL" == *"@127.0.0.1"* ]]; then
      echo "Database URL in .env points to localhost, starting database container..."
      return 0
    else
      echo "Database URL in .env points to hosted service, skipping database container startup..."
      return 1
    fi
  else
    echo "No DATABASE_URL found in .env, starting database container..."
    return 0
  fi
}

# Function to start database container
start_database() {
  echo "Starting database container..."

  if [ "$(docker ps -q -f name=$DB_CONTAINER_NAME)" ]; then
    echo "Database container '$DB_CONTAINER_NAME' already running"
    return 0
  fi

  if [ "$(docker ps -q -a -f name=$DB_CONTAINER_NAME)" ]; then
    docker start "$DB_CONTAINER_NAME"
    echo "Existing database container '$DB_CONTAINER_NAME' started"
    return 0
  fi

  docker run -d \
    --name $DB_CONTAINER_NAME \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASSWORD" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT":5432 \
    docker.io/postgres && echo "Database container '$DB_CONTAINER_NAME' was successfully created"
}

# Function to start Redis container
start_redis() {
  echo "Starting Redis container..."

  if [ "$(docker ps -q -f name=$REDIS_CONTAINER_NAME)" ]; then
    echo "Redis container '$REDIS_CONTAINER_NAME' already running"
    return 0
  fi

  if [ "$(docker ps -q -a -f name=$REDIS_CONTAINER_NAME)" ]; then
    docker start "$REDIS_CONTAINER_NAME"
    echo "Existing Redis container '$REDIS_CONTAINER_NAME' started"
    return 0
  fi

  docker run -d \
    --name $REDIS_CONTAINER_NAME \
    -p "$REDIS_PORT":6379 \
    docker.io/redis:alpine && echo "Redis container '$REDIS_CONTAINER_NAME' was successfully created"
}

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo -e "Docker is not installed. Please install docker and try again.\nDocker install guide: https://docs.docker.com/engine/install/"
  exit 1
fi

# Determine if database should be started and store the result
START_DB=false
if should_start_database; then
  START_DB=true
fi

# Start services
echo "Starting development services..."
echo "================================"

# Start database only if configured for localhost
if [ "$START_DB" = true ]; then
  start_database
  echo ""
else
  echo "Skipping database startup (using hosted database)"
  echo ""
fi

start_redis
echo ""

echo "================================"
echo "Services started successfully!"

# Show connection details based on what was started
echo ""
echo "Add these URLs to your .env file:"
if [ "$START_DB" = true ]; then
  echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME"
fi
echo "REDIS_URL=redis://localhost:$REDIS_PORT"
