#!/bin/bash
set -e

echo "========================================"
echo "  Conformance Test Suite Setup Script"
echo "========================================"
echo ""

# --- Prompt for Environment Variables with Defaults ---

# DATABASE_URL prompt
read -p "Enter DATABASE_URL (default: postgresql://postgres:postgres@localhost:5432/cts?schema=public): " DATABASE_URL
DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/cts?schema=public"}

# AATH_PATH prompt: default is current directory + owl-agent-test-harness
read -p "Enter AATH_PATH (default: $(pwd)/owl-agent-test-harness): " AATH_PATH
AATH_PATH=${AATH_PATH:-"$(pwd)/owl-agent-test-harness"}

# BACKEND_PORT prompt
read -p "Enter BACKEND_PORT (default: 5001): " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-5001}

# FRONTEND_PORT prompt
read -p "Enter FRONTEND_PORT (default: 5003): " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-5003}

# OID_CONFORMANCE_SUITE_API_URL prompt
read -p "Enter OID_CONFORMANCE_SUITE_API_URL (default: https://localhost:8443/api): " OID_CONFORMANCE_SUITE_API_URL
OID_CONFORMANCE_SUITE_API_URL=${OID_CONFORMANCE_SUITE_API_URL:-"https://localhost:8443/api"}

# BACKEND_ADDRESS prompt
read -p "Enter BACKEND_ADDRESS (default: http://localhost:5002): " BACKEND_ADDRESS
BACKEND_ADDRESS=${BACKEND_ADDRESS:-"http://localhost:5002"}

# NEW: OPENID_PATH prompt: default is current directory + conformance-suite
read -p "Enter OPENID_PATH (default: $(pwd)/conformance-suite): " OPENID_PATH
OPENID_PATH=${OPENID_PATH:-"$(pwd)/conformance-suite"}

# Create the .env.local file content
ENV_CONTENT="DATABASE_URL=${DATABASE_URL}
AATH_PATH=${AATH_PATH}
OPENID_PATH=${OPENID_PATH}
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
OID_CONFORMANCE_SUITE_API_URL=${OID_CONFORMANCE_SUITE_API_URL}
BACKEND_ADDRESS=${BACKEND_ADDRESS}"

echo ""
echo "Writing .env.local file to both frontend and backend directories..."

# Write the file in the frontend folder
if [ -d frontend ]; then
    echo "${ENV_CONTENT}" >frontend/.env.local
    echo "Created frontend/.env.local"
else
    echo "Directory 'frontend' not found. Skipping frontend .env.local creation."
fi

# Write the file in the backend folder
if [ -d backend ]; then
    echo "${ENV_CONTENT}" >backend/.env.local
    echo "Created backend/.env.local"
else
    echo "Directory 'backend' not found. Skipping backend .env.local creation."
fi

echo ""
echo "----------------------------------------"
echo "Test Harness Repositories Installation"
echo "----------------------------------------"
echo "Which test harness(es) would you like to install?"
echo "  1) API (OpenID Conformance Suite)"
echo "  2) Messaging (Aries Agent Test Harness)"
echo "  3) Both"
read -p "Enter your choice [1/2/3]: " harness_choice

case "$harness_choice" in
1)
    echo ""
    echo "Cloning OpenID Conformance Suite repository..."
    git clone https://gitlab.com/openid/conformance-suite.git
    echo "The OPENID_PATH should now point to: $(pwd)/conformance-suite"
    echo ""
    echo "NOTE: To start the OpenID Conformance Suite dev environment, run:"
    echo "   1. In one terminal: 'devenv up'"
    echo "   2. In another terminal: 'mvn spring-boot:run'"
    ;;
2)
    echo ""
    echo "Cloning Aries Agent Test Harness repository..."
    git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git
    echo "The AATH_PATH should now point to: $(pwd)/owl-agent-test-harness"
    ;;
3)
    echo ""
    echo "Cloning both OpenID Conformance Suite and Aries Agent Test Harness repositories..."
    git clone https://gitlab.com/openid/conformance-suite.git
    git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git
    echo "AATH_PATH will be: $(pwd)/owl-agent-test-harness"
    echo "OPENID_PATH will be: $(pwd)/conformance-suite"
    echo ""
    echo "NOTE for OpenID Conformance Suite:"
    echo "   To start the dev environment, run:"
    echo "   1. 'devenv up'"
    echo "   2. 'mvn spring-boot:run'"
    ;;
*)
    echo "Invalid option. Exiting."
    exit 1
    ;;
esac

echo ""
echo "Cloning the Conformance Test Suite repository..."
git clone git@github.com:GANfoundation/conformance-test-suite.git
cd conformance-test-suite

echo ""
echo "Installing dependencies with pnpm..."
pnpm install

echo ""
echo "Starting the PostgreSQL database using Docker Compose..."
docker compose up -d

echo ""
echo "Running Prisma migrations for the backend..."
pnpm --filter backend prisma-migrate

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start the development servers, run:"
echo "  pnpm dev"
echo ""
echo "Check the README.md for any additional instructions regarding the test harness servers."
