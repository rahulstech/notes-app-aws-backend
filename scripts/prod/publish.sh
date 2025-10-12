#!/bin/bash

set -e 

npm run build:auth-service

npm run build:note-service

npm run build:queue-service

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
MICROSERVICES_DIR=$(realpath "$SCRIPT_DIR/../../dist/microservices")
PUBLISH_OUTPUT_DIR=$(realpath "$SCRIPT_DIR/../../publish")

if [ -e "$PUBLISH_OUTPUT_DIR" ]; then
    rm -r "$PUBLISH_OUTPUT_DIR"    
fi

mkdir "$PUBLISH_OUTPUT_DIR"

echo "Creating zip files"

zip -r "$PUBLISH_OUTPUT_DIR/auth-service-lambda.zip" "$MICROSERVICES_DIR/auth-service" > /dev/null 2>&1

zip -r "$PUBLISH_OUTPUT_DIR/note-service-lambda.zip" "$MICROSERVICES_DIR/note-service" > /dev/null 2>&1

zip -r "$PUBLISH_OUTPUT_DIR/queue-service-lambda.zip" "$MICROSERVICES_DIR/queue-service" > /dev/null 2>&1

echo "Done"
