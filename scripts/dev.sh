#!/bin/bash
set -e

# Semantest Developer Experience Script
# Makes development fast and frictionless!

# Colors for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Fancy banner
function show_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════╗"
    echo "║        SEMANTEST DEVELOPER TOOLS         ║"
    echo "║           Fast & Frictionless!            ║"
    echo "╚═══════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check dependencies
function check_deps() {
    local missing=()
    
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v node >/dev/null 2>&1 || missing+=("node")
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Missing dependencies: ${missing[*]}${NC}"
        echo "Please install them first."
        exit 1
    fi
}

# Start all services
function start_services() {
    echo -e "${BLUE}🚀 Starting all services...${NC}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file with defaults...${NC}"
        cat > .env << EOF
# Development Environment Variables
NODE_ENV=development
DB_USER=semantest
DB_PASSWORD=semantest_dev
DB_NAME=semantest
REDIS_PASSWORD=redis_dev
JWT_SECRET=dev_secret_change_in_production
CORS_ORIGIN=http://localhost:3000
EOF
    fi
    
    # Start Docker services
    docker-compose up -d
    
    # Wait for services to be healthy
    echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
    sleep 5
    
    # Check service health
    docker-compose ps
    
    echo -e "${GREEN}✅ All services started!${NC}"
    echo ""
    echo "📝 Service URLs:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:3001"
    echo "  • Adminer (DB): http://localhost:8081"
    echo "  • Redis Commander: http://localhost:8082"
    echo "  • Grafana: http://localhost:3030 (admin/admin)"
    echo "  • Prometheus: http://localhost:9090"
    echo ""
}

# Stop all services
function stop_services() {
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    docker-compose down
    echo -e "${GREEN}✅ All services stopped!${NC}"
}

# Run tests in watch mode
function run_tests() {
    echo -e "${BLUE}🧪 Running tests in watch mode...${NC}"
    
    if [ -n "$1" ]; then
        # Run tests for specific workspace
        echo -e "${CYAN}Testing workspace: $1${NC}"
        npm test --workspace="$1" -- --watch
    else
        # Run all tests
        npm test -- --watch
    fi
}

# Tail logs from all services
function show_logs() {
    echo -e "${BLUE}📋 Showing logs (Ctrl+C to exit)...${NC}"
    
    if [ -n "$1" ]; then
        # Show logs for specific service
        docker-compose logs -f "$1"
    else
        # Show all logs
        docker-compose logs -f
    fi
}

# Reset everything to clean slate
function reset_all() {
    echo -e "${RED}⚠️  This will delete all data and start fresh!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🔄 Resetting everything...${NC}"
        
        # Stop and remove containers, networks, volumes
        docker-compose down -v
        
        # Clean node_modules
        echo -e "${YELLOW}Cleaning node_modules...${NC}"
        find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
        
        # Clean build artifacts
        echo -e "${YELLOW}Cleaning build artifacts...${NC}"
        find . -name "dist" -type d -prune -exec rm -rf '{}' +
        find . -name "build" -type d -prune -exec rm -rf '{}' +
        find . -name ".next" -type d -prune -exec rm -rf '{}' +
        
        # Reinstall dependencies
        echo -e "${YELLOW}Installing fresh dependencies...${NC}"
        npm ci
        
        echo -e "${GREEN}✅ Reset complete! Run './dev.sh start' to begin fresh.${NC}"
    else
        echo -e "${BLUE}Reset cancelled.${NC}"
    fi
}

# Quick health check
function health_check() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Check Docker services
    echo -e "${CYAN}Docker Services:${NC}"
    docker-compose ps
    
    echo ""
    
    # Check Node.js server
    echo -e "${CYAN}Backend API Health:${NC}"
    curl -s http://localhost:3001/health || echo -e "${RED}Backend not responding${NC}"
    
    echo ""
    
    # Check TypeScript client
    echo -e "${CYAN}Frontend Health:${NC}"
    curl -s http://localhost:3000 > /dev/null && echo -e "${GREEN}Frontend is up${NC}" || echo -e "${RED}Frontend not responding${NC}"
    
    echo ""
    
    # Check database
    echo -e "${CYAN}Database Health:${NC}"
    docker-compose exec -T postgres pg_isready || echo -e "${RED}Database not ready${NC}"
    
    echo ""
    
    # Check Redis
    echo -e "${CYAN}Redis Health:${NC}"
    docker-compose exec -T redis redis-cli --auth redis_dev ping || echo -e "${RED}Redis not responding${NC}"
}

# Install git hooks
function install_hooks() {
    echo -e "${BLUE}🪝 Installing git hooks...${NC}"
    
    # Pre-commit hook for linting
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run linter
npm run lint

# Run type check
npx tsc --noEmit

if [ $? -ne 0 ]; then
    echo "Pre-commit checks failed. Fix the issues and try again."
    exit 1
fi

echo "Pre-commit checks passed!"
EOF
    
    chmod +x .git/hooks/pre-commit
    
    echo -e "${GREEN}✅ Git hooks installed!${NC}"
}

# Database migrations
function run_migrations() {
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    
    # Wait for database to be ready
    until docker-compose exec -T postgres pg_isready; do
        echo "Waiting for database..."
        sleep 2
    done
    
    # Run migrations (adjust based on your migration tool)
    docker-compose exec nodejs-server npm run migrate || echo -e "${YELLOW}No migrations to run${NC}"
    
    echo -e "${GREEN}✅ Migrations complete!${NC}"
}

# Quick shell access
function shell_access() {
    local service=${1:-nodejs-server}
    echo -e "${BLUE}🐚 Opening shell in $service...${NC}"
    docker-compose exec "$service" /bin/sh
}

# Main menu
function show_help() {
    echo "Usage: ./dev.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  ${GREEN}start${NC}      - Start all services"
    echo "  ${GREEN}stop${NC}       - Stop all services"
    echo "  ${GREEN}restart${NC}    - Restart all services"
    echo "  ${GREEN}test${NC}       - Run tests in watch mode (optional: workspace name)"
    echo "  ${GREEN}logs${NC}       - Tail logs from all services (optional: service name)"
    echo "  ${GREEN}reset${NC}      - Reset everything to clean slate"
    echo "  ${GREEN}health${NC}     - Check health of all services"
    echo "  ${GREEN}hooks${NC}      - Install git hooks"
    echo "  ${GREEN}migrate${NC}    - Run database migrations"
    echo "  ${GREEN}shell${NC}      - Open shell in container (optional: service name)"
    echo "  ${GREEN}help${NC}       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh start           # Start everything"
    echo "  ./dev.sh test core       # Test core workspace"
    echo "  ./dev.sh logs nodejs-server  # Show backend logs"
    echo "  ./dev.sh shell postgres  # Open PostgreSQL shell"
}

# Main script logic
show_banner
check_deps

case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        ;;
    test)
        run_tests "$2"
        ;;
    logs)
        show_logs "$2"
        ;;
    reset)
        reset_all
        ;;
    health)
        health_check
        ;;
    hooks)
        install_hooks
        ;;
    migrate)
        run_migrations
        ;;
    shell)
        shell_access "$2"
        ;;
    help|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac