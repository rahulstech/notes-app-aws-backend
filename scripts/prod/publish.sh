#!/bin/bash

set -e 

SCRIPT_DIR=$(realpath $(dirname ${BASH_SOURCE[0]}))
ROOT_DIR=$(realpath "$SCRIPT_DIR/../../")
DIST_DIR="$ROOT_DIR/dist"
EXTERNAL_MODULES_DIR="$DIST_DIR/external_modules"
MICROSERVICES_DIR="$DIST_DIR/microservices"
PUBLISH_OUTPUT_DIR="$ROOT_DIR/publish"

PROJECTS=("auth-service" "note-service" "queue-service" "playground")

buildProject() {
    PROJECT_NAME=$1
    echo "Building $PROJECT_NAME"
    npm run build:$PROJECT_NAME > /dev/null 2>&1
}

generateDeployBundle() {
    PROJECT_NAME=$1
    if [ "$PROJECT_NAME" == "playground" ]; then
        PROJECT_DIR="$MICROSERVICES_DIR/note-service/$PROJECT_NAME"
    else 
        PROJECT_DIR="$MICROSERVICES_DIR/$PROJECT_NAME"
    fi
    echo "Bundle $PROJECT_NAME"
    cd "$PROJECT_DIR"
    cp -r "$EXTERNAL_MODULES_DIR/node_modules" "./node_modules"
    zip -r "$PUBLISH_OUTPUT_DIR/$PROJECT_NAME-lambda.zip" . > /dev/null 2>&1
}

echo "Creating minimum node modules"

if [ ! -e "$DIST_DIR" ]; then
    mkdir "$DIST_DIR"
fi

if [ -e "$EXTERNAL_MODULES_DIR" ]; then
    rm -r "$EXTERNAL_MODULES_DIR"
fi

mkdir "$EXTERNAL_MODULES_DIR"

cp "$ROOT_DIR/package.json" "$EXTERNAL_MODULES_DIR/package.json"
cp "$ROOT_DIR/package-lock.json" "$EXTERNAL_MODULES_DIR/package-lock.json"
cd "$EXTERNAL_MODULES_DIR"
npm ci --omit=dev > /dev/null 2>&1

if [ ! -e "$PUBLISH_OUTPUT_DIR" ]; then
    mkdir "$PUBLISH_OUTPUT_DIR"    
fi

for project in ${PROJECTS[@]}
do
cd $ROOT_DIR
buildProject $project
generateDeployBundle $project
done

echo "Done"
