#!/bin/bash
set -e

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
S3_TEST_CONTAINER=s3-test
S3_TEST_EP_PORT=5002
S3_TEST_REGION=ap-south-1

# Export environment variables
export S3_ENDPOINT=http://localhost:$S3_TEST_EP_PORT
export S3_BUCKET=test-bucket

# Stop previous container if running
docker stop $S3_TEST_CONTAINER > /dev/null 2>&1 || true

# Start LocalStack SQS
docker run --rm -d \
  -p $S3_TEST_EP_PORT:4566 \
  -e SERVICES="s3" \
  -e S3_REGION=$S3_TEST_REGION \
  -e REGION=$S3_TEST_REGION \
  --name $S3_TEST_CONTAINER localstack/localstack

# Wait for LocalStack to be ready
echo "Waiting for S3 to start..."
MAX_RETRIES=5
for ((i=1; i<=MAX_RETRIES; i++)); do
  if aws s3 --endpoint-url "$S3_ENDPOINT" ls > /dev/null 2>&1; then
    echo "S3 is ready!"
    break
  fi

  sleep 2

  if [ $i -eq $MAX_RETRIES ]; then
    echo "Fail to start S3"
    exit 1
  fi
done

# Create the queue
echo "Creating necessary bucket(s)"
aws s3 --endpoint-url "$S3_ENDPOINT" mb s3://$S3_BUCKET > /dev/null 2>&1;

# Run integration tests
npx nx test @notes-app/storage-service --configuration=integration

# Stop container
docker stop $S3_TEST_CONTAINER > /dev/null 2>&1 || true