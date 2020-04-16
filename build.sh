#!/usr/bin/env bash

# 1) Update version number BEFORE running this script, in application.properties

# 2) Generate executables
#./grailsw rest-api-doc
#./grailsw war
#
## 3) Copy to Docker build context
mv restapidoc.json docker
mv core.war docker

# 4) Retrieve version number
VERSION=$(cat application.properties | grep app.version=)
VERSION=${VERSION#app.version=}

# 5) Build Docker image
docker build \
    --build-arg RELEASE_PATH="." \
    --build-arg FROM_NAMESPACE=cytomineuliege \
    --build-arg FROM_VERSION=v1.2.0 \
    -t neubiaswg5/core:latest -t neubiaswg5/core:v$VERSION docker/

# 6) Push image to Docker Hub
docker push neubiaswg5/core:latest
docker push neubiaswg5/core:v$VERSION

# 7) Update NeubiasWG5/Cytomine-bootstrap with the new Docker image version for core.
