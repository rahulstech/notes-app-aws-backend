#!/bin/bash
set -e

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
USER_NOTES_TABLE_JSON_FILE=$(realpath "$SCRIPT_DIR/../../data/database/user_notes.table.json")
DDB_DEV_EP_PORT=7000
DDB_DEV_REGION=ap-south-1
DDB_DEV_CONTAINER=dynamodb-dev
DYNAMODB_LOCAL_ENDPOINT_URL=http://localhost:$DDB_DEV_EP_PORT

# Stop previous container if running
echo "Stoping existing container"
docker stop $DDB_DEV_CONTAINER > /dev/null 2>&1 || true

# Start LocalStack DynamoDB
echo "Creating and running container"
docker run --rm -d \
  -p $DDB_DEV_EP_PORT:4566 \
  -e SERVICES="dynamodb" \
  -e DEFAULT_REGION=$DDB_DEV_REGION \
  --name $DDB_DEV_CONTAINER localstack/localstack

# Wait for LocalStack to be ready
echo "Waiting for DynamoDB to start..."
MAX_RETRIES=5
for ((i=1; i<=MAX_RETRIES; i++)); do
  if aws dynamodb list-tables --endpoint-url "$DYNAMODB_LOCAL_ENDPOINT_URL" > /dev/null 2>&1; then
    echo "DynamoDB is ready!"
    break
  fi

  sleep 2

  if [ $i -eq $MAX_RETRIES ]; then
    echo "Fail to start DynamoDB"
    exit 1
  fi
done

# Create the table
echo "Creating necessary table(s)"
aws dynamodb create-table \
  --endpoint-url "$DYNAMODB_LOCAL_ENDPOINT_URL" \
  --cli-input-json "file://$USER_NOTES_TABLE_JSON_FILE" > /dev/null

echo "Done"
