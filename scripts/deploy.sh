#!/bin/bash

# TaskFlow Deployment Script for VPS with Portainer
# This script helps build and deploy the TaskFlow application

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yaml"
ENV_FILE=".env.production"

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found"
    
    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found"
        print_warning "Please copy .env.production.example to .env.production and configure it"
        exit 1
    fi
    print_success "Environment file found"
}

# Build images
build_images() {
    print_info "Building Docker images..."
    
    # Build backend
    print_info "Building backend API image..."
    docker build -t taskflow-api:latest -f TaskFlow.Api/Dockerfile .
    print_success "Backend API image built"
    
    # Build frontend
    print_info "Building frontend image..."
    docker build -t taskflow-frontend:latest -f TaskFlow.Client/Dockerfile TaskFlow.Client/
    print_success "Frontend image built"
}

# Deploy stack
deploy_stack() {
    print_info "Deploying application stack..."
    
    # Load environment variables
    set -a
    source "$ENV_FILE"
    set +a
    
    # Deploy with docker-compose
    docker-compose -f "$COMPOSE_FILE" up -d
    print_success "Application stack deployed"
}

# Check deployment status
check_status() {
    print_info "Checking deployment status..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 10
    
    # Check health status
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "unhealthy"; then
        print_warning "Some services are unhealthy. Check logs with: docker-compose -f $COMPOSE_FILE logs"
    else
        print_success "All services are running"
    fi
}

# Show logs
show_logs() {
    print_info "Showing recent logs..."
    docker-compose -f "$COMPOSE_FILE" logs --tail=50
}

# Main menu
show_menu() {
    echo ""
    echo "TaskFlow Deployment Manager"
    echo "============================"
    echo "1. Full deployment (build + deploy)"
    echo "2. Build images only"
    echo "3. Deploy/Update stack"
    echo "4. Check status"
    echo "5. Show logs"
    echo "6. Stop all services"
    echo "7. Restart all services"
    echo "8. Pull and update images"
    echo "9. Exit"
    echo ""
    read -p "Choose an option: " choice
}

# Stop services
stop_services() {
    print_info "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down
    print_success "All services stopped"
}

# Restart services
restart_services() {
    print_info "Restarting all services..."
    docker-compose -f "$COMPOSE_FILE" restart
    print_success "All services restarted"
}

# Pull latest images
pull_images() {
    print_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    print_success "Images updated"
}

# Main execution
main() {
    check_prerequisites
    
    if [ "$1" == "--auto" ]; then
        # Automated deployment
        build_images
        deploy_stack
        check_status
    else
        # Interactive menu
        while true; do
            show_menu
            case $choice in
                1)
                    build_images
                    deploy_stack
                    check_status
                    ;;
                2)
                    build_images
                    ;;
                3)
                    deploy_stack
                    check_status
                    ;;
                4)
                    check_status
                    ;;
                5)
                    show_logs
                    ;;
                6)
                    stop_services
                    ;;
                7)
                    restart_services
                    ;;
                8)
                    pull_images
                    deploy_stack
                    check_status
                    ;;
                9)
                    print_info "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
        done
    fi
}

# Run main function
main "$@"