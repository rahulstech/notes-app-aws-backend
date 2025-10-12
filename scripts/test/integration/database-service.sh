#!/bin/bash
set -e

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
DDB_TEST_EP_PORT=5000
DDB_TEST_REGION=ap-south-1
DDB_TEST_CONTAINER=dynamodb-test

# Stop previous container if running
docker stop $DDB_TEST_CONTAINER > /dev/null 2>&1 || true

# Start LocalStack DynamoDB
docker run --rm -d \
  -p $DDB_TEST_EP_PORT:4566 \
  -e SERVICES="dynamodb" \
  -e DYNAMODB_REGION=$DDB_TEST_REGION \
  -e REGION=$DDB_TEST_REGION \
  --name $DDB_TEST_CONTAINER localstack/localstack

# Export endpoint for tests
export DYNAMODB_ENDPOINT=http://localhost:$DDB_TEST_EP_PORT

# Wait for LocalStack to be ready
echo "Waiting for DynamoDB to start..."
for i in {1..10}; do
  if aws dynamodb list-tables --endpoint-url "$DYNAMODB_ENDPOINT" > /dev/null 2>&1; then
    echo "DynamoDB is ready!"
    break
  fi
  sleep 2
done

# Create the table
echo "Creating necessary table(s)"
aws dynamodb create-table \
  --endpoint-url "$DYNAMODB_ENDPOINT" \
  --cli-input-json "file://$SCRIPT_DIR/user_notes.table.json" > /dev/null

# Export test table name
export DYNAMODB_TEST_TABLE_NAME="user_notes"

# Run integration tests
npx nx test @notes-app/database-service --configuration=integration

# Stop container
docker stop $DDB_TEST_CONTAINER > /dev/null 2>&1 || true
