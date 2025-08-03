#!/bin/bash

# Simple build script for TaskFlow API Docker image (builds on VPS directly)
# Use this script if cross-platform building fails

set -e

# Configuration
IMAGE_NAME="taskflow-api"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}TaskFlow API Direct Build Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}This script should be run directly on your VPS${NC}"
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

# Check if we're in the right directory
if [ ! -f "TaskFlow.Api/TaskFlow.Api.csproj" ]; then
    echo -e "${RED}Error: TaskFlow.Api project not found in current directory${NC}"
    echo "Please run this script from the repository root directory"
    exit 1
fi

echo -e "${YELLOW}Building Docker image on current architecture...${NC}"
echo "Image name: ${FULL_IMAGE_NAME}"
echo ""

# Build the Docker image directly on the VPS
docker build -t ${FULL_IMAGE_NAME} -f TaskFlow.Api/Dockerfile .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "You can now run the container using:"
    echo "  docker-compose up -d"
    echo ""
    echo "Or manually with:"
    echo "  docker run -d \\"
    echo "    --name taskflow-api \\"
    echo "    -p 8080:8080 \\"
    echo "    -e ASPNETCORE_ENVIRONMENT=Production \\"
    echo "    -e DatabaseSettings__ConnectionString='mongodb://localhost:27017' \\"
    echo "    -e Jwt__Secret='your-secret-key-here' \\"
    echo "    ${FULL_IMAGE_NAME}"
else
    echo -e "${RED}✗ Failed to build Docker image${NC}"
    exit 1
fi