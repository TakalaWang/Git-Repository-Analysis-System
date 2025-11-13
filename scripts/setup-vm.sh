#!/bin/bash

###############################################################################
# VM Deployment Setup Script
# 
# This script initializes and configures the VM environment for 
# Git Repository Analysis System
# 
# Usage:
#   bash scripts/setup-vm.sh
###############################################################################

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    log_error "Please do not run this script as root"
    exit 1
fi

log_info "Starting VM environment setup..."

###############################################################################
# 1. Install System Dependencies
###############################################################################
log_info "Updating system packages..."
sudo apt-get update

log_info "Installing required system packages..."
sudo apt-get install -y \
    git \
    curl \
    wget \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release

###############################################################################
# 2. Install Node.js 20
###############################################################################
if ! command -v node &> /dev/null; then
    log_info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log_info "Node.js already installed: $(node --version)"
fi

###############################################################################
# 3. Install pnpm
###############################################################################
if ! command -v pnpm &> /dev/null; then
    log_info "Installing pnpm..."
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    export PNPM_HOME="$HOME/.local/share/pnpm"
    export PATH="$PNPM_HOME:$PATH"
else
    log_info "pnpm already installed: $(pnpm --version)"
fi

###############################################################################
# 4. Install PM2
###############################################################################
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    npm install -g pm2
    
    # Setup PM2 startup script
    log_info "Configuring PM2 startup..."
    pm2 startup | grep -o 'sudo .*' | bash || true
else
    log_info "PM2 already installed: $(pm2 --version)"
fi

###############################################################################
# 5. Configure Firewall
###############################################################################
log_info "Configuring firewall rules..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp
    sudo ufw --force enable || true
fi

###############################################################################
# 6. Create Application Directory
###############################################################################
APP_DIR="$HOME/git-repository-analysis-system"
log_info "Creating application directory: $APP_DIR"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

###############################################################################
# 7. Generate SSH Deploy Key
###############################################################################
SSH_KEY_PATH="$HOME/.ssh/github_deploy"
if [ ! -f "$SSH_KEY_PATH" ]; then
    log_info "Generating SSH deploy key..."
    ssh-keygen -t ed25519 -C "deploy@$(hostname)" -f "$SSH_KEY_PATH" -N ""
    
    log_info "========================================"
    log_info "Add the following PUBLIC key to GitHub Deploy Keys:"
    log_info "========================================"
    cat "${SSH_KEY_PATH}.pub"
    log_info "========================================"
    log_info ""
    log_info "Also add the PRIVATE key to GitHub Secrets (SSH_PRIVATE_KEY):"
    cat "$SSH_KEY_PATH"
    log_info "========================================"
else
    log_info "SSH deploy key already exists"
fi

###############################################################################
# 8. Configure Git
###############################################################################
log_info "Configuring Git..."
git config --global user.name "Deploy Bot"
git config --global user.email "deploy@$(hostname)"

###############################################################################
# 9. Display Next Steps
###############################################################################
log_info ""
log_info "=========================================="
log_info "✅ VM Environment Setup Complete!"
log_info "=========================================="
log_info ""
log_info "Next Steps:"
log_info "1. Add the SSH public key above to GitHub Repository > Settings > Deploy Keys"
log_info "2. Add the following secrets in GitHub Repository > Settings > Secrets:"
log_info "   - SSH_PRIVATE_KEY: SSH private key"
log_info "   - VM_HOST: $(curl -s ifconfig.me)"
log_info "   - VM_USER: $(whoami)"
log_info "   - VM_PORT: 22"
log_info "   - DEPLOY_PATH: $APP_DIR"
log_info ""
log_info "3. Clone the code to application directory:"
log_info "   cd $APP_DIR"
log_info "   git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git ."
log_info ""
log_info "4. Configure environment variables:"
log_info "   cp .env.example .env"
log_info "   nano .env"
log_info ""
log_info "5. Install dependencies and build:"
log_info "   pnpm install"
log_info "   pnpm build"
log_info ""
log_info "6. Start the application:"
log_info "   pm2 start ecosystem.config.js"
log_info "   pm2 save"
log_info ""
log_info "=========================================="
