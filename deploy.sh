#!/bin/bash

#===============================================================================
# TorrentGames Deploy & Update Script for Ubuntu
# This script will:
# - Check and install all required dependencies (Git, Node.js, Nginx, Certbot, PM2)
# - Clone or pull latest changes from the repository
# - Build frontend and backend
# - Configure Nginx as a reverse proxy
# - Set up HTTPS with Certbot
# - Configure UFW firewall (only ports 22, 80, 443)
# - Set up PM2 for process management
#
# Usage:
#   First time deployment:  sudo ./deploy.sh
#   Update existing:        sudo ./deploy.sh --update
#===============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN=""
EMAIL=""
APP_DIR="/var/www/torrentgames"
DATA_DIR="/root/data"
REPO_URL="https://github.com/CMCSoftware98/TorrentGames"
BRANCH="main"
NODE_VERSION="20"
BACKEND_PORT="3000"

# Mode detection
UPDATE_MODE=false
if [[ "$1" == "--update" || "$1" == "-u" ]]; then
    UPDATE_MODE=true
fi

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

prompt_config() {
    print_header "Configuration"
    
    # For update mode, try to read existing domain from nginx config
    if [[ "$UPDATE_MODE" == true && -f "/etc/nginx/sites-available/torrentgames" ]]; then
        DOMAIN=$(grep -m1 "server_name" /etc/nginx/sites-available/torrentgames | awk '{print $2}' | tr -d ';')
        if [[ -n "$DOMAIN" ]]; then
            print_info "Detected existing domain: $DOMAIN"
        fi
    fi
    
    if [[ -z "$DOMAIN" ]]; then
        read -p "Enter your domain name (e.g., example.com): " DOMAIN
    fi
    
    if [[ -z "$EMAIL" && "$UPDATE_MODE" == false ]]; then
        read -p "Enter your email for SSL certificate notifications: " EMAIL
    fi
    
    echo ""
    print_info "Configuration Summary:"
    echo "  Domain: $DOMAIN"
    echo "  App Directory: $APP_DIR"
    echo "  Data Directory: $DATA_DIR"
    echo "  Repository: $REPO_URL"
    echo "  Branch: $BRANCH"
    if [[ "$UPDATE_MODE" == true ]]; then
        echo "  Mode: UPDATE"
    else
        echo "  Mode: FULL DEPLOYMENT"
        echo "  Email: $EMAIL"
    fi
    echo ""
    
    read -p "Is this correct? (y/n): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        print_error "Aborted by user"
        exit 1
    fi
}

#===============================================================================
# Installation Functions
#===============================================================================

update_system() {
    print_header "Updating System Packages"
    apt update
    if [[ "$UPDATE_MODE" == false ]]; then
        apt upgrade -y
    fi
    print_success "System packages updated"
}

install_git() {
    print_header "Checking Git Installation"
    
    if command -v git &> /dev/null; then
        print_success "Git is already installed ($(git --version))"
    else
        print_info "Installing Git..."
        apt install -y git
        print_success "Git installed ($(git --version))"
    fi
}

install_essentials() {
    print_header "Installing Essential Tools"
    
    apt install -y curl build-essential software-properties-common
    print_success "Essential tools installed"
}

install_nodejs() {
    print_header "Checking Node.js Installation"
    
    if command -v node &> /dev/null; then
        current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$current_version" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js $(node -v) is already installed"
            return
        else
            print_warning "Node.js version is too old, upgrading..."
        fi
    else
        print_info "Node.js is not installed. Installing..."
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
    
    print_success "Node.js $(node -v) installed"
    print_success "npm $(npm -v) installed"
}

install_nginx() {
    print_header "Checking Nginx Installation"
    
    if command -v nginx &> /dev/null; then
        print_success "Nginx is already installed"
    else
        print_info "Installing Nginx..."
        apt install -y nginx
        print_success "Nginx installed"
    fi
    
    systemctl enable nginx
    systemctl start nginx
    print_success "Nginx enabled and started"
}

install_certbot() {
    print_header "Checking Certbot Installation"
    
    if command -v certbot &> /dev/null; then
        print_success "Certbot is already installed"
    else
        print_info "Installing Certbot..."
        apt install -y certbot python3-certbot-nginx
        print_success "Certbot installed"
    fi
}

install_pm2() {
    print_header "Checking PM2 Installation"
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2 is already installed"
    else
        print_info "Installing PM2..."
        npm install -g pm2
        print_success "PM2 installed"
    fi
}

#===============================================================================
# Application Setup
#===============================================================================

setup_application() {
    print_header "Setting Up Application"
    
    # Create app directory
    mkdir -p "$APP_DIR"
    
    # Create data directory for database
    mkdir -p "$DATA_DIR"
    chmod 755 "$DATA_DIR"
    
    cd "$APP_DIR"
    
    # Check if it's already a git repository
    if [[ -d ".git" ]]; then
        print_success "Git repository found"
        
        # Get current branch
        current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        print_info "Current branch: $current_branch"
        
        # Check for uncommitted changes
        if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
            print_warning "Uncommitted changes detected, stashing..."
            git stash
        fi
        
        # Fetch and pull latest changes
        print_info "Fetching latest changes..."
        git fetch --all
        
        local_commit=$(git rev-parse HEAD)
        remote_commit=$(git rev-parse origin/$BRANCH 2>/dev/null || echo "")
        
        if [[ -n "$remote_commit" && "$local_commit" != "$remote_commit" ]]; then
            print_info "New commits available:"
            git log --oneline HEAD..origin/$BRANCH 2>/dev/null || true
            echo ""
            git pull origin "$BRANCH"
            print_success "Repository updated"
        else
            print_success "Repository is up to date"
        fi
    else
        # Clone repository
        print_info "Cloning repository..."
        
        # Backup existing files if directory is not empty
        if [[ "$(ls -A $APP_DIR 2>/dev/null)" ]]; then
            print_warning "Directory not empty. Backing up existing files..."
            backup_dir="/tmp/torrentgames_backup_$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$backup_dir"
            mv "$APP_DIR"/* "$backup_dir"/ 2>/dev/null || true
            mv "$APP_DIR"/.* "$backup_dir"/ 2>/dev/null || true
            print_success "Backup created at $backup_dir"
        fi
        
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
        git checkout "$BRANCH"
        print_success "Repository cloned"
    fi
    
    print_success "Application source ready"
}

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
    
    # Create uploads directory if it doesn't exist
    mkdir -p "$APP_DIR/uploads"
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    chown -R www-data:www-data "$DATA_DIR"
    
    print_success "Application build complete"
}

create_env_file() {
    print_header "Configuring Environment"
    
    ENV_FILE="$APP_DIR/server/.env"
    
    if [[ -f "$ENV_FILE" ]]; then
        print_info "Updating existing .env file..."
        # Update DATABASE_PATH if it exists, otherwise append
        if grep -q "DATABASE_PATH" "$ENV_FILE"; then
            sed -i "s|DATABASE_PATH=.*|DATABASE_PATH=$DATA_DIR/torrentgames.db|" "$ENV_FILE"
        else
            echo "DATABASE_PATH=$DATA_DIR/torrentgames.db" >> "$ENV_FILE"
        fi
        print_success "Environment file updated"
    else
        print_info "Creating new .env file..."
        
        # Generate a random JWT secret
        JWT_SECRET=$(openssl rand -base64 32)
        
        cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
JWT_SECRET=$JWT_SECRET
DATABASE_PATH=$DATA_DIR/torrentgames.db
EOF
        
        print_success "Environment file created"
    fi
    
    chmod 600 "$ENV_FILE"
    chown www-data:www-data "$ENV_FILE"
    
    print_info "Database location: $DATA_DIR/torrentgames.db"
}

#===============================================================================
# Nginx Configuration
#===============================================================================

configure_nginx() {
    print_header "Configuring Nginx"
    
    NGINX_CONF="/etc/nginx/sites-available/torrentgames"
    
    # Check if SSL is already configured
    SSL_EXISTS=false
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        SSL_EXISTS=true
    fi
    
    cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Frontend - serve static files
    root $APP_DIR/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    # Handle Vue Router (SPA) - serve index.html for all routes
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        
        # Increase max body size for file uploads
        client_max_body_size 100M;
    }

    # Serve uploaded files
    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable site
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/torrentgames
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    print_success "Nginx configured"
    
    # If SSL already exists, re-run certbot to update nginx config
    if [[ "$SSL_EXISTS" == true ]]; then
        print_info "Re-applying SSL configuration..."
        certbot --nginx \
            -d "$DOMAIN" \
            -d "www.$DOMAIN" \
            --non-interactive \
            --reinstall
        print_success "SSL configuration restored"
    fi
}

#===============================================================================
# SSL Certificate
#===============================================================================

setup_ssl() {
    print_header "Setting Up SSL Certificate"
    
    # Check if certificate already exists
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        print_success "SSL certificate already exists"
        print_info "Testing certificate renewal..."
        certbot renew --dry-run
        return
    fi
    
    print_info "Obtaining SSL certificate from Let's Encrypt..."
    
    certbot --nginx \
        -d "$DOMAIN" \
        -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos \
        --non-interactive \
        --redirect
    
    # Test auto-renewal
    print_info "Testing certificate auto-renewal..."
    certbot renew --dry-run
    
    print_success "SSL certificate installed and auto-renewal configured"
}

#===============================================================================
# PM2 Setup
#===============================================================================

setup_pm2() {
    print_header "Setting Up PM2 Process Manager"
    
    cd "$APP_DIR/server"
    
    # Check if process is already running
    if pm2 list | grep -q "torrentgames-api"; then
        print_info "Restarting existing process..."
        pm2 restart torrentgames-api
    else
        print_info "Starting new process..."
        pm2 start dist/index.js \
            --name "torrentgames-api" \
            --env production \
            --max-memory-restart 500M
    fi
    
    # Save PM2 process list
    pm2 save
    
    # Setup PM2 to start on boot (only on first deploy)
    if [[ "$UPDATE_MODE" == false ]]; then
        pm2 startup systemd -u root --hp /root
    fi
    
    print_success "PM2 configured and application running"
}

#===============================================================================
# Firewall Configuration
#===============================================================================

configure_firewall() {
    print_header "Configuring Firewall (UFW)"
    
    # Check if UFW is already configured
    if ufw status | grep -q "Status: active"; then
        print_success "Firewall is already active"
        ufw status
        return
    fi
    
    # Reset UFW to default
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (port 22)
    ufw allow 22/tcp comment 'SSH'
    
    # Allow HTTP (port 80)
    ufw allow 80/tcp comment 'HTTP'
    
    # Allow HTTPS (port 443)
    ufw allow 443/tcp comment 'HTTPS'
    
    # Enable UFW
    ufw --force enable
    
    print_success "Firewall configured - Only ports 22, 80, 443 are open"
    
    # Show status
    echo ""
    ufw status verbose
}

#===============================================================================
# Status Check
#===============================================================================

show_status() {
    print_header "Deployment Status"
    
    cd "$APP_DIR"
    
    echo -e "${BLUE}Current Version:${NC}"
    echo "  Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
    echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
    echo "  Date: $(git log -1 --format=%cd --date=short 2>/dev/null || echo 'N/A')"
    echo ""
    
    echo -e "${BLUE}Service Status:${NC}"
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check PM2
    if pm2 list | grep -q "torrentgames-api"; then
        print_success "Backend API is running"
    else
        print_error "Backend API is not running"
    fi
    
    # Check UFW
    if ufw status | grep -q "Status: active"; then
        print_success "Firewall is active"
    else
        print_warning "Firewall is not active"
    fi
    
    # Check SSL
    if [[ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        print_success "SSL certificate is installed"
    else
        print_warning "SSL certificate not found"
    fi
    
    # Check Database
    if [[ -f "$DATA_DIR/torrentgames.db" ]]; then
        print_success "Database exists at $DATA_DIR/torrentgames.db"
    else
        print_info "Database will be created on first run"
    fi
    
    echo -e "\n${BLUE}============================================================${NC}"
    if [[ "$UPDATE_MODE" == true ]]; then
        echo -e "${GREEN}  Update Complete!${NC}"
    else
        echo -e "${GREEN}  Deployment Complete!${NC}"
    fi
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    echo -e "Your application is now available at:"
    echo -e "  ${GREEN}https://$DOMAIN${NC}"
    echo ""
    echo -e "Data directory: ${YELLOW}$DATA_DIR${NC}"
    echo ""
    echo -e "Useful commands:"
    echo -e "  ${YELLOW}sudo ./deploy.sh --update${NC}    - Pull latest changes and rebuild"
    echo -e "  ${YELLOW}pm2 logs torrentgames-api${NC}    - View backend logs"
    echo -e "  ${YELLOW}pm2 restart torrentgames-api${NC} - Restart backend"
    echo -e "  ${YELLOW}pm2 status${NC}                   - Check PM2 status"
    echo -e "  ${YELLOW}sudo nginx -t${NC}                - Test Nginx config"
    echo -e "  ${YELLOW}sudo systemctl reload nginx${NC}  - Reload Nginx"
    echo -e "  ${YELLOW}sudo ufw status${NC}              - Check firewall status"
    echo -e "  ${YELLOW}sudo certbot certificates${NC}    - Check SSL certificates"
    echo ""
}

#===============================================================================
# Main Execution
#===============================================================================

main() {
    clear
    echo -e "${GREEN}"
    echo "  _____                         _    ____                           "
    echo " |_   _|__  _ __ _ __ ___ _ __ | |_ / ___| __ _ _ __ ___   ___  ___ "
    echo "   | |/ _ \| '__| '__/ _ \ '_ \| __| |  _ / _\` | '_ \` _ \ / _ \/ __|"
    echo "   | | (_) | |  | | |  __/ | | | |_| |_| | (_| | | | | | |  __/\__ \\"
    echo "   |_|\___/|_|  |_|  \___|_| |_|\__|\____|\__,_|_| |_| |_|\___||___/"
    echo -e "${NC}"
    
    if [[ "$UPDATE_MODE" == true ]]; then
        echo -e "${GREEN}Update Mode${NC}"
    else
        echo -e "${BLUE}Deployment Script${NC}"
    fi
    echo ""
    
    check_root
    prompt_config
    
    # Always run these
    update_system
    install_git
    install_essentials
    install_nodejs
    install_pm2
    
    # Only on full deployment
    if [[ "$UPDATE_MODE" == false ]]; then
        install_nginx
        install_certbot
    fi
    
    # Application setup and build
    setup_application
    build_application
    create_env_file
    
    # Only on full deployment
    if [[ "$UPDATE_MODE" == false ]]; then
        configure_nginx
        
        # Only setup SSL if domain is not localhost
        if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
            setup_ssl
        else
            print_warning "Skipping SSL setup for localhost"
        fi
        
        configure_firewall
    else
        # On update, just reload nginx
        if command -v nginx &> /dev/null; then
            if nginx -t 2>/dev/null; then
                systemctl reload nginx
                print_success "Nginx reloaded"
            fi
        fi
    fi
    
    setup_pm2
    show_status
}

# Run main function
main "$@"
