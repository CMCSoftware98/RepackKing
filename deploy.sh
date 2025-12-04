#!/bin/bash

#===============================================================================
# RepackKing Deployment Script for Ubuntu
# This script will:
# - Check and install all required dependencies
# - Configure Nginx as a reverse proxy
# - Set up HTTPS with Certbot
# - Configure UFW firewall (only ports 22, 80, 443)
# - Set up PM2 for process management
#===============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - EDIT THESE VALUES
DOMAIN=""
EMAIL=""
APP_DIR="/var/www/repackking"
REPO_URL=""
NODE_VERSION="20"
BACKEND_PORT="3000"

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
    
    if [[ -z "$DOMAIN" ]]; then
        read -p "Enter your domain name (e.g., example.com): " DOMAIN
    fi
    
    if [[ -z "$EMAIL" ]]; then
        read -p "Enter your email for SSL certificate notifications: " EMAIL
    fi
    
    if [[ -z "$REPO_URL" ]]; then
        read -p "Enter your Git repository URL (or leave empty to skip cloning): " REPO_URL
    fi
    
    echo ""
    print_info "Configuration Summary:"
    echo "  Domain: $DOMAIN"
    echo "  Email: $EMAIL"
    echo "  App Directory: $APP_DIR"
    echo "  Repository: ${REPO_URL:-'(manual copy)'}"
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
    apt upgrade -y
    print_success "System packages updated"
}

install_essentials() {
    print_header "Installing Essential Tools"
    
    apt install -y curl git build-essential software-properties-common
    print_success "Essential tools installed"
}

install_nodejs() {
    print_header "Checking Node.js Installation"
    
    if command -v node &> /dev/null; then
        current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$current_version" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js v$(node -v) is already installed"
            return
        else
            print_warning "Node.js version is too old, upgrading..."
        fi
    fi
    
    print_info "Installing Node.js $NODE_VERSION.x..."
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
    
    if [[ -n "$REPO_URL" ]]; then
        if [[ -d "$APP_DIR/.git" ]]; then
            print_info "Repository exists, pulling latest changes..."
            cd "$APP_DIR"
            git pull
        else
            print_info "Cloning repository..."
            rm -rf "$APP_DIR"/*
            git clone "$REPO_URL" "$APP_DIR"
        fi
    else
        print_warning "No repository URL provided. Please copy your files to $APP_DIR manually."
        read -p "Press Enter when files are in place..."
    fi
    
    cd "$APP_DIR"
    
    # Build frontend
    print_info "Installing frontend dependencies..."
    npm install
    
    print_info "Building frontend..."
    npm run build
    
    # Build backend
    print_info "Installing backend dependencies..."
    cd "$APP_DIR/server"
    npm install
    
    print_info "Building backend..."
    npm run build
    
    # Create uploads directory if it doesn't exist
    mkdir -p "$APP_DIR/uploads"
    
    # Create data directory for SQLite
    mkdir -p "$APP_DIR/server/data"
    
    # Set permissions
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    print_success "Application setup complete"
}

create_env_file() {
    print_header "Creating Environment File"
    
    ENV_FILE="$APP_DIR/server/.env"
    
    if [[ -f "$ENV_FILE" ]]; then
        print_warning ".env file already exists, skipping..."
        return
    fi
    
    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > "$ENV_FILE" << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
JWT_SECRET=$JWT_SECRET
DATABASE_PATH=$APP_DIR/server/data/database.sqlite
EOF
    
    chmod 600 "$ENV_FILE"
    chown www-data:www-data "$ENV_FILE"
    
    print_success "Environment file created"
}

#===============================================================================
# Nginx Configuration
#===============================================================================

configure_nginx() {
    print_header "Configuring Nginx"
    
    NGINX_CONF="/etc/nginx/sites-available/repackking"
    
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
    ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/repackking
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    print_success "Nginx configured"
}

#===============================================================================
# SSL Certificate
#===============================================================================

setup_ssl() {
    print_header "Setting Up SSL Certificate"
    
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
    
    # Stop existing process if running
    pm2 delete repackking-api 2>/dev/null || true
    
    # Start the application
    pm2 start dist/index.js \
        --name "repackking-api" \
        --env production \
        --max-memory-restart 500M
    
    # Save PM2 process list
    pm2 save
    
    # Setup PM2 to start on boot
    pm2 startup systemd -u root --hp /root
    
    print_success "PM2 configured and application started"
}

#===============================================================================
# Firewall Configuration
#===============================================================================

configure_firewall() {
    print_header "Configuring Firewall (UFW)"
    
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
# Final Status Check
#===============================================================================

final_check() {
    print_header "Deployment Status"
    
    echo -e "\n${BLUE}Service Status:${NC}"
    
    # Check Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
    
    # Check PM2
    if pm2 list | grep -q "repackking-api"; then
        print_success "Backend API is running"
    else
        print_error "Backend API is not running"
    fi
    
    # Check UFW
    if ufw status | grep -q "active"; then
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
    
    echo -e "\n${BLUE}============================================================${NC}"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
    echo -e "Your application is now available at:"
    echo -e "  ${GREEN}https://$DOMAIN${NC}"
    echo ""
    echo -e "Useful commands:"
    echo -e "  ${YELLOW}pm2 logs repackking-api${NC}    - View backend logs"
    echo -e "  ${YELLOW}pm2 restart repackking-api${NC} - Restart backend"
    echo -e "  ${YELLOW}pm2 status${NC}                 - Check PM2 status"
    echo -e "  ${YELLOW}sudo nginx -t${NC}              - Test Nginx config"
    echo -e "  ${YELLOW}sudo systemctl reload nginx${NC} - Reload Nginx"
    echo -e "  ${YELLOW}sudo ufw status${NC}            - Check firewall status"
    echo -e "  ${YELLOW}sudo certbot certificates${NC}  - Check SSL certificates"
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
    echo -e "${BLUE}Ubuntu Deployment Script${NC}"
    echo ""
    
    check_root
    prompt_config
    
    update_system
    install_essentials
    install_nodejs
    install_nginx
    install_certbot
    install_pm2
    
    setup_application
    create_env_file
    configure_nginx
    
    # Only setup SSL if domain is not localhost
    if [[ "$DOMAIN" != "localhost" && "$DOMAIN" != "127.0.0.1" ]]; then
        setup_ssl
    else
        print_warning "Skipping SSL setup for localhost"
    fi
    
    setup_pm2
    configure_firewall
    final_check
}

# Run main function
main "$@"
