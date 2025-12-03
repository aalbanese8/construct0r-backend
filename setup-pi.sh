#!/bin/bash
set -e

echo "=================================="
echo "Construct0r Backend Setup for Raspberry Pi"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Update system
echo -e "${BLUE}Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js (using NodeSource repository for latest LTS)
echo -e "${BLUE}Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python3 and pip (usually pre-installed on Raspberry Pi OS)
echo -e "${BLUE}Checking Python installation...${NC}"
sudo apt-get install -y python3 python3-pip

# Install system dependencies
echo -e "${BLUE}Installing system dependencies...${NC}"
sudo apt-get install -y git ffmpeg

# Install Python packages
echo -e "${BLUE}Installing Python packages...${NC}"
pip3 install --user yt-dlp instaloader youtube-transcript-api

# Clone or update repository
REPO_DIR="$HOME/construct0r-backend"
if [ -d "$REPO_DIR" ]; then
    echo -e "${BLUE}Updating existing repository...${NC}"
    cd "$REPO_DIR"
    git pull
else
    echo -e "${BLUE}Cloning repository...${NC}"
    git clone https://github.com/aalbanese8/construct0r-backend.git "$REPO_DIR"
    cd "$REPO_DIR"
fi

# Install Node.js dependencies
echo -e "${BLUE}Installing Node.js dependencies...${NC}"
npm install

# Build the project
echo -e "${BLUE}Building project...${NC}"
npm run build

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cat > .env << 'EOL'
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
JWT_SECRET=your_jwt_secret_here
FRONTEND_URL=http://localhost:3000
EOL
    echo -e "${GREEN}✓ Created .env file - IMPORTANT: Edit this file with your actual credentials!${NC}"
    echo -e "${GREEN}  Run: nano $REPO_DIR/.env${NC}"
fi

# Create systemd service file
echo -e "${BLUE}Creating systemd service...${NC}"
sudo tee /etc/systemd/system/construct0r-backend.service > /dev/null << EOL
[Unit]
Description=Construct0r Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REPO_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node $REPO_DIR/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and enable service
echo -e "${BLUE}Enabling service to start on boot...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable construct0r-backend.service

echo ""
echo -e "${GREEN}=================================="
echo -e "✓ Setup Complete!"
echo -e "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit your .env file with actual credentials:"
echo "   nano $REPO_DIR/.env"
echo ""
echo "2. Start the service:"
echo "   sudo systemctl start construct0r-backend"
echo ""
echo "3. Check service status:"
echo "   sudo systemctl status construct0r-backend"
echo ""
echo "4. View logs:"
echo "   sudo journalctl -u construct0r-backend -f"
echo ""
echo "Your backend will be available at: http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "The service will automatically start on boot!"
echo ""
