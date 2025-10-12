#!/bin/bash
set -e

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
SQS_TEST_CONTAINER=sqs-test
SQS_TEST_EP_PORT=5001
SQS_TEST_REGION=ap-south-1
SQS_QUEUE_NAME=test-queue

# Stop previous container if running
docker stop $SQS_TEST_CONTAINER > /dev/null 2>&1 || true

# Start LocalStack SQS
docker run --rm -d \
  -p $SQS_TEST_EP_PORT:4566 \
  -e SERVICES="sqs" \
  -e DYNAMODB_REGION=$SQS_TEST_REGION \
  -e REGION=$SQS_TEST_REGION \
  --name $SQS_TEST_CONTAINER localstack/localstack

# Export endpoint for tests
export SQS_ENDPOINT=http://localhost:$SQS_TEST_EP_PORT

# Wait for LocalStack to be ready
echo "Waiting for SQS to start..."
for i in {1..5}; do
  if aws sqs list-queues --endpoint-url "$SQS_ENDPOINT" > /dev/null 2>&1; then
    echo "SQS is ready!"
    break
  fi
  sleep 2
done

if ! aws sqs list-queues --endpoint-url "$SQS_ENDPOINT" > /dev/null 2>&1; then
  echo "SQS is not ready!"
  exit 1
fi


# Create the queue
echo "Creating necessary queue(s)"
queue_url_json=$(aws sqs create-queue --endpoint-url "$SQS_ENDPOINT" --queue-name $SQS_QUEUE_NAME)

# Export queue url
export SQS_URL=$(node -pe "JSON.parse(process.argv[1]).QueueUrl" "$queue_url_json")

# Run integration tests
npx nx test @notes-app/queue-service --configuration=integration

# Stop container
docker stop $SQS_TEST_CONTAINER > /dev/null 2>&1 || true
