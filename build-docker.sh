#!/bin/bash

# Build script for TaskFlow API Docker image
# This script builds the Docker image and exports it as a tar file for deployment

set -e

# Configuration
IMAGE_NAME="taskflow-api"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
OUTPUT_FILE="taskflow-api-${IMAGE_TAG}.tar"
BUILD_CONTEXT="."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaskFlow API Docker Build Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker daemon is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Detecting system architecture...${NC}"

# Detect current system architecture
CURRENT_ARCH=$(uname -m)
echo "Current system architecture: ${CURRENT_ARCH}"

# Set target platform for VPS (x86_64/amd64)
TARGET_PLATFORM="linux/amd64"
echo "Target platform for VPS: ${TARGET_PLATFORM}"
echo ""

echo -e "${YELLOW}Step 2: Building Docker image for ${TARGET_PLATFORM}...${NC}"
echo "Image name: ${FULL_IMAGE_NAME}"
echo ""

# Check if docker buildx is available
if docker buildx version &> /dev/null; then
    echo "Using Docker buildx for cross-platform build..."
    
    # Create and use a new builder instance if needed
    BUILDER_NAME="taskflow-builder"
    if ! docker buildx ls | grep -q ${BUILDER_NAME}; then
        echo "Creating new buildx builder..."
        docker buildx create --name ${BUILDER_NAME} --use
    else
        docker buildx use ${BUILDER_NAME}
    fi
    
    # Build the Docker image for x86_64 architecture
    docker buildx build --platform ${TARGET_PLATFORM} -t ${FULL_IMAGE_NAME} -f TaskFlow.Api/Dockerfile ${BUILD_CONTEXT} --load
else
    echo -e "${YELLOW}Docker buildx not available. Using standard build with platform flag...${NC}"
    # Fallback to standard build with platform specification
    DOCKER_DEFAULT_PLATFORM=${TARGET_PLATFORM} docker build -t ${FULL_IMAGE_NAME} -f TaskFlow.Api/Dockerfile ${BUILD_CONTEXT}
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Exporting Docker image to tar file...${NC}"
echo "Output file: ${OUTPUT_FILE}"
echo ""

# Export the Docker image to a tar file
docker save -o ${OUTPUT_FILE} ${FULL_IMAGE_NAME}

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image exported successfully${NC}"
    
    # Get file size
    FILE_SIZE=$(ls -lh ${OUTPUT_FILE} | awk '{print $5}')
    echo -e "${GREEN}File size: ${FILE_SIZE}${NC}"
else
    echo -e "${RED}✗ Failed to export Docker image${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Transfer the tar file to your VPS:"
echo "   scp ${OUTPUT_FILE} user@217.154.44.219:/path/to/destination/"
echo ""
echo "2. On the VPS, load the Docker image:"
echo "   docker load -i ${OUTPUT_FILE}"
echo ""
echo "3. Run the container (example):"
echo "   docker run -d \\"
echo "     --name taskflow-api \\"
echo "     -p 8080:8080 \\"
echo "     -e ASPNETCORE_ENVIRONMENT=Production \\"
echo "     -e ConnectionStrings__MongoDB='mongodb://mongodb:27017' \\"
echo "     -e Jwt__Secret='your-secret-key-here' \\"
echo "     -e Jwt__Issuer='your-issuer' \\"
echo "     -e Jwt__Audience='your-audience' \\"
echo "     ${FULL_IMAGE_NAME}"
echo ""
echo "Note: Make sure to:"
echo "- Set up MongoDB container or use existing MongoDB instance"
echo "- Configure proper JWT secrets and connection strings"
echo "- Update CORS settings for your client URL"