#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

# This is a stripped down version of the original Fabric Script(to elimate confusion).
VERSION=1.4.0
CA_VERSION=1.4.0
THIRDPARTY_IMAGE_VERSION=0.4.14

printHelp() {
    echo "Usage: installFabric.sh"
}

# dockerFabricPull() pulls docker images from fabric and chaincode repositories
# note, if a docker image doesn't exist for a requested release, it will simply
# be skipped, since this script doesn't terminate upon errors.
dockerFabricPull() {
    local FABRIC_TAG=$1
    for IMAGES in peer orderer ccenv tools baseos nodeenv javaenv; do
        echo "==> FABRIC IMAGE: $IMAGES"
        echo
        docker pull "hyperledger/fabric-$IMAGES:$FABRIC_TAG"
        docker tag "hyperledger/fabric-$IMAGES:$FABRIC_TAG" "hyperledger/fabric-$IMAGES"
    done
}

dockerThirdPartyImagesPull() {
    local THIRDPARTY_TAG=$1
    for IMAGES in couchdb kafka zookeeper; do
        echo "==> THIRDPARTY DOCKER IMAGE: $IMAGES"
        echo
        docker pull "hyperledger/fabric-$IMAGES:$THIRDPARTY_TAG"
        docker tag "hyperledger/fabric-$IMAGES:$THIRDPARTY_TAG" "hyperledger/fabric-$IMAGES"
    done
}

dockerCaPull() {
    local CA_TAG=$1
    echo "==> FABRIC CA IMAGE"
    echo
    docker pull "hyperledger/fabric-ca:$CA_TAG"
    docker tag "hyperledger/fabric-ca:$CA_TAG" "hyperledger/fabric-ca"
}

dockerInstall() {
    command -v docker >& /dev/null
    NODOCKER=$?
    if [ "${NODOCKER}" == 0 ]; then
        echo "===> Pulling fabric Images"
        dockerFabricPull "${FABRIC_TAG}"
        echo "===> Pulling fabric ca Image"
        dockerCaPull "${CA_TAG}"
        echo "===> Pulling thirdparty docker images"
        dockerThirdPartyImagesPull "${THIRDPARTY_TAG}"
        echo
        echo "===> List out hyperledger docker images"
        docker images | grep hyperledger
    else
        echo "========================================================="
        echo "Docker not installed, bypassing download of Fabric images"
        echo "========================================================="
    fi
}


CA_TAG="$CA_VERSION"
FABRIC_TAG="$VERSION"
THIRDPARTY_TAG="$THIRDPARTY_IMAGE_VERSION"

echo "Installing Hyperledger Fabric docker images"
echo "NOTE:"
echo "Docker version 17.06.2-ce or greater is required."
echo "Your version is: $(docker --version)"
echo "Docker Compose version 1.14.0 or greater is required."
echo "Your version is: $(docker-composer --version)"
echo "Node.js version 8.9.4 or higher is required."
echo "npm 5.6.0 is recommended."
echo "HINT: install nvm using the following command curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash "
dockerInstall
echo "export PATH=\$PATH:$PWD/binaries" >> ~/.bashrc
source ~/.bashrc
