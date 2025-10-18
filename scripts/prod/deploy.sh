#!/bin/bash

set -e

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
ROOT_DIR=$(realpath "$SCRIPT_DIR/../..")
PUBLISH_DIR="$ROOT_DIR/publish"
ENV_FILE=$(realpath $1)

SERVICES=("auth-service" "note-service" "queue-service" "playground")

updateLambdaFunction() {
    FUNCTION_NAME="notes-app-$1"
    ZIP_FILE="fileb://$PUBLISH_DIR/$1-lambda.zip"
    FUNCTION_ENV_FILE="file://$2"

    # upload code
    echo "Upload function code $FUNCTION_NAME"
    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file $ZIP_FILE > /dev/null 2>&1

    echo "Waiting for $FUNCTION_NAME update finish"
    sleep 5

    # update environment variables
    echo "Update environment variable $FUNCTION_NAME"
    aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment $FUNCTION_ENV_FILE  > /dev/null 2>&1
}

ENV_CONTENT=$(cat $ENV_FILE)
TEMP_FUNCTION_ENV_FILE="$SCRIPT_DIR/environment.json"
echo "{\"Variables\": $ENV_CONTENT}" > $TEMP_FUNCTION_ENV_FILE

if [ ! -z "$2" ]; then
    for service in ${SERVICES[@]}
    do
        if [ "$service" == "$2" ]; then
            updateLambdaFunction $service $TEMP_FUNCTION_ENV_FILE
            break
        fi
    done
else
    for service in ${SERVICES[@]}
    do
    updateLambdaFunction $service $TEMP_FUNCTION_ENV_FILE
    done
fi

echo "Done"

