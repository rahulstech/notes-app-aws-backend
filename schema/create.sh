#!/bin/bash

echo "creating docker services"
sudo docker compose up -d

echo "wait for 5 seconds to start local dynamodb properly"
sleep 5

# following AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required by the aws cli.
# however local dynamodb does not required any of these execpt the endpoint url. so you can set
# any values here that aws dynamodb create-table command functions properly. no need to change your .env
# and don't need to use this region and credentials while using local dynamodb via aws sdk
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=dummy
export AWS_SECRET_ACCESS_KEY=dummy

echo "creating tables"
aws dynamodb create-table \
  --cli-input-json "file://$PWD/user_notes.table.json" \
  --endpoint-url http://localhost:8000
