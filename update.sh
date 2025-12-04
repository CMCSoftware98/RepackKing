#!/bin/bash

#===============================================================================
# RepackKing Update Script for Ubuntu
# This script will:
# - Check and install Git if not installed
# - Pull latest changes from the repository
# - Rebuild frontend and backend
# - Restart the application
#===============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - EDIT THESE VALUES
APP_DIR="/var/www/repackking"
REPO_URL=""
BRANCH="main"

#===============================================================================
# Helper Functions
#===============================================================================

print_header() {
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

#===============================================================================
# Git Installation
#===============================================================================

install_git() {
    print_header "Checking Git Installation"
    
    if command -v git &> /dev/null; then
        print_success "Git is already installed ($(git --version))"
    else
        print_info "Git is not installed. Installing..."
        apt update
        apt install -y git
        print_success "Git installed ($(git --version))"
    fi
}

#===============================================================================
# Repository Setup
#===============================================================================

setup_repository() {
    print_header "Setting Up Repository"
    
    # Check if app directory exists
    if [[ ! -d "$APP_DIR" ]]; then
        print_info "Creating application directory..."
        mkdir -p "$APP_DIR"
    fi
    
    cd "$APP_DIR"
    
    # Check if it's a git repository
    if [[ -d ".git" ]]; then
        print_success "Git repository found"
        
        # Get current branch
        current_branch=$(git branch --show-current)
        print_info "Current branch: $current_branch"
        
        # Check for uncommitted changes
        if [[ -n $(git status --porcelain) ]]; then
            print_warning "Uncommitted changes detected"
            read -p "Stash changes and continue? (y/n): " stash_confirm
            if [[ "$stash_confirm" == "y" || "$stash_confirm" == "Y" ]]; then
                git stash
                print_success "Changes stashed"
            else
                print_error "Aborted. Please commit or stash changes manually."
                exit 1
            fi
        fi
    else
        # Not a git repository, need to clone
        if [[ -z "$REPO_URL" ]]; then
            read -p "Enter your Git repository URL: " REPO_URL
        fi
        
        if [[ -z "$REPO_URL" ]]; then
            print_error "No repository URL provided"
            exit 1
        fi
        
        print_info "Cloning repository..."
        
        # Backup existing files if any
        if [[ "$(ls -A $APP_DIR)" ]]; then
            print_warning "Directory not empty. Backing up existing files..."
            backup_dir="/tmp/repackking_backup_$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$backup_dir"
            mv "$APP_DIR"/* "$backup_dir"/ 2>/dev/null || true
            mv "$APP_DIR"/.* "$backup_dir"/ 2>/dev/null || true
            print_success "Backup created at $backup_dir"
        fi
        
        git clone "$REPO_URL" "$APP_DIR"
        print_success "Repository cloned"
    fi
}

#===============================================================================
# Pull Latest Changes
#===============================================================================

pull_changes() {
    print_header "Pulling Latest Changes"
    
    cd "$APP_DIR"
    
    # Fetch all changes
    print_info "Fetching from remote..."
    git fetch --all
    
    # Get current and remote commit hashes
    local_commit=$(git rev-parse HEAD)
    remote_commit=$(git rev-parse origin/$BRANCH)
    
    if [[ "$local_commit" == "$remote_commit" ]]; then
        print_success "Already up to date"
        read -p "Force rebuild anyway? (y/n): " force_rebuild
        if [[ "$force_rebuild" != "y" && "$force_rebuild" != "Y" ]]; then
            print_info "No rebuild needed. Exiting."
            exit 0
        fi
    else
        print_info "New changes detected"
        
        # Show what's new
        echo ""
        print_info "New commits:"
        git log --oneline HEAD..origin/$BRANCH
        echo ""
        
        # Pull changes
        git pull origin "$BRANCH"
        print_success "Changes pulled successfully"
    fi
}

#===============================================================================
# Build Application
#===============================================================================

build_application() {
    print_header "Building Application"
    
    cd "$APP_DIR"
    
    # Build frontend
    print_info "Installing frontend dependencies..."
    npm install
    
    print_info "Building frontend..."
    npm run build
    print_success "Frontend built"
    
    # Build backend
    print_info "Installing backend dependencies..."
    cd "$APP_DIR/server"
    npm install
    
    print_info "Building backend..."
    npm run build
    print_success "Backend built"
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    print_success "Application build complete"
}

#===============================================================================
# Restart Services
#===============================================================================

restart_services() {
    print_header "Restarting Services"
    
    # Restart PM2 application
    if command -v pm2 &> /dev/null; then
        if pm2 list | grep -q "repackking-api"; then
            print_info "Restarting backend..."
            pm2 restart repackking-api
            print_success "Backend restarted"
        else
            print_warning "PM2 process 'repackking-api' not found"
            print_info "Starting backend..."
            cd "$APP_DIR/server"
            pm2 start dist/index.js --name "repackking-api" --env production
            pm2 save
            print_success "Backend started"
        fi
    else
        print_warning "PM2 not installed. Backend not restarted."
    fi
    
    # Reload Nginx (in case of any config changes)
    if command -v nginx &> /dev/null; then
        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            print_success "Nginx reloaded"
        else
            print_error "Nginx configuration test failed"
        fi
    fi
}

#===============================================================================
# Status Check
#===============================================================================

show_status() {
    print_header "Update Status"
    
    cd "$APP_DIR"
    
    echo -e "${BLUE}Current Version:${NC}"
    echo "  Commit: $(git rev-parse --short HEAD)"
    echo "  Branch: $(git branch --show-current)"
    echo "  Date: $(git log -1 --format=%cd --date=short)"
    echo ""
    
    echo -e "${BLUE}Service Status:${NC}"
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check PM2
    if command -v pm2 &> /dev/null && pm2 list | grep -q "repackking-api"; then
        print_success "Backend API is running"
        pm2 show repackking-api --no-color | grep -E "status|uptime|restarts" | head -3
    else
        print_error "Backend API is not running"
    fi
    
    echo ""
    echo -e "${GREEN}Update complete!${NC}"
    echo ""
}

#===============================================================================
# Main Execution
#===============================================================================

main() {
    clear
    echo -e "${BLUE}"
    echo "  ____                       _    _  ___             "
    echo " |  _ \ ___ _ __   __ _  ___| | _| |/ (_)_ __   __ _ "
    echo " | |_) / _ \ '_ \ / _\` |/ __| |/ / | | | '_ \ / _\` |"
    echo " |  _ <  __/ |_) | (_| | (__|   <| | | | | | | (_| |"
    echo " |_| \_\___| .__/ \__,_|\___|_|\_\_| |_|_| |_|\__, |"
    echo "           |_|                                |___/ "
    echo -e "${NC}"
    echo -e "${BLUE}Update Script${NC}"
    echo ""
    
    check_root
    install_git
    setup_repository
    pull_changes
    build_application
    restart_services
    show_status
}

# Run main function
main "$@"
