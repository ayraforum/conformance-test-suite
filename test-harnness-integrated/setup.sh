#!/bin/bash
set -e

# Default flags
NONINTERACTIVE=false
CLONE_REPO=false

# Process input flags
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    --non-interactive)
        NONINTERACTIVE=true
        shift
        ;;
    --clone)
        CLONE_REPO=true
        shift
        ;;
    *)
        echo "Unknown option: $key"
        shift
        ;;
    esac
done

# --- Check for Required Tools ---
REQUIRED_TOOLS=("pnpm" "mvn" "docker")
MISSING_TOOLS=""
for tool in "${REQUIRED_TOOLS[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+="$tool "
    fi
done

if [ -n "$MISSING_TOOLS" ]; then
    echo "The following required tools are missing: $MISSING_TOOLS"
    if $NONINTERACTIVE; then
        echo "Non-interactive mode: please install the missing tools and retry the script."
        exit 1
    else
        read -p "Do you want to attempt to install the missing tools? (Y/n): " ans
        ans=${ans:-Y}
        if [[ "$ans" =~ ^[Yy]$ ]]; then
            for tool in $MISSING_TOOLS; do
                case $tool in
                pnpm)
                    echo "Installing pnpm via npm..."
                    npm install -g pnpm@9.15.3 || {
                        echo "Failed to install pnpm. Please install it manually."
                        exit 1
                    }
                    ;;
                mvn)
                    echo "Installing Maven..."
                    sudo apt-get update && sudo apt-get install -y maven || {
                        echo "Failed to install Maven. Please install it manually."
                        exit 1
                    }
                    ;;
                docker)
                    echo "Installing Docker..."
                    sudo apt-get update && sudo apt-get install -y docker.io || {
                        echo "Failed to install Docker. Please install it manually."
                        exit 1
                    }
                    ;;
                *)
                    echo "Don't know how to install $tool. Please install it manually."
                    exit 1
                    ;;
                esac
            done
        else
            echo "Please install the missing tools and re-run the script."
            exit 1
        fi
    fi
fi

echo "========================================"
echo "  Conformance Test Suite Setup Script"
echo "========================================"
echo ""

# --- Set Environment Variables with Defaults or Prompt ---

# DATABASE_URL
DEFAULT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cts?schema=public"
if $NONINTERACTIVE; then
    DATABASE_URL="$DEFAULT_DATABASE_URL"
else
    read -p "Enter DATABASE_URL (default: $DEFAULT_DATABASE_URL): " DATABASE_URL
    DATABASE_URL=${DATABASE_URL:-$DEFAULT_DATABASE_URL}
fi

# AATH_PATH (default is current directory + owl-agent-test-harness)
DEFAULT_AATH_PATH="$(pwd)/owl-agent-test-harness"
if $NONINTERACTIVE; then
    AATH_PATH="$DEFAULT_AATH_PATH"
else
    read -p "Enter AATH_PATH (default: $DEFAULT_AATH_PATH): " AATH_PATH
    AATH_PATH=${AATH_PATH:-$DEFAULT_AATH_PATH}
fi

# BACKEND_PORT
DEFAULT_BACKEND_PORT=5001
if $NONINTERACTIVE; then
    BACKEND_PORT="$DEFAULT_BACKEND_PORT"
else
    read -p "Enter BACKEND_PORT (default: $DEFAULT_BACKEND_PORT): " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}
fi

# FRONTEND_PORT
DEFAULT_FRONTEND_PORT=5003
if $NONINTERACTIVE; then
    FRONTEND_PORT="$DEFAULT_FRONTEND_PORT"
else
    read -p "Enter FRONTEND_PORT (default: $DEFAULT_FRONTEND_PORT): " FRONTEND_PORT
    FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}
fi

# OID_CONFORMANCE_SUITE_API_URL
DEFAULT_OID_URL="https://localhost:8443/api"
if $NONINTERACTIVE; then
    OID_CONFORMANCE_SUITE_API_URL="$DEFAULT_OID_URL"
else
    read -p "Enter OID_CONFORMANCE_SUITE_API_URL (default: $DEFAULT_OID_URL): " OID_CONFORMANCE_SUITE_API_URL
    OID_CONFORMANCE_SUITE_API_URL=${OID_CONFORMANCE_SUITE_API_URL:-$DEFAULT_OID_URL}
fi

# BACKEND_ADDRESS
DEFAULT_BACKEND_ADDRESS="http://localhost:5002"
if $NONINTERACTIVE; then
    BACKEND_ADDRESS="$DEFAULT_BACKEND_ADDRESS"
else
    read -p "Enter BACKEND_ADDRESS (default: $DEFAULT_BACKEND_ADDRESS): " BACKEND_ADDRESS
    BACKEND_ADDRESS=${BACKEND_ADDRESS:-$DEFAULT_BACKEND_ADDRESS}
fi

# OPENID_PATH (default is current directory + conformance-suite)
DEFAULT_OPENID_PATH="$(pwd)/conformance-suite"
if $NONINTERACTIVE; then
    OPENID_PATH="$DEFAULT_OPENID_PATH"
else
    read -p "Enter OPENID_PATH (default: $DEFAULT_OPENID_PATH): " OPENID_PATH
    OPENID_PATH=${OPENID_PATH:-$DEFAULT_OPENID_PATH}
fi

# Create the .env.local file content and also export variables
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

# Write the file in the backend folder and export the variables for use by Prisma
if [ -d backend ]; then
    echo "${ENV_CONTENT}" >backend/.env.local
    echo "Created backend/.env.local"
else
    echo "Directory 'backend' not found. Skipping backend .env.local creation."
fi

# Export environment variables from backend/.env.local so tools like Prisma can read them
if [ -f backend/.env.local ]; then
    echo "Exporting environment variables from backend/.env.local..."
    set -a
    source backend/.env.local
    set +a
fi

echo ""
echo "----------------------------------------"
echo "Test Harness Repositories Installation"
echo "----------------------------------------"

if $NONINTERACTIVE; then
    # In non-interactive mode, default to installing test harness option 2 (Messaging/Aries Agent Test Harness)
    harness_choice=2
    echo "Non-interactive mode: defaulting to install test harness option 2."
else
    echo "Which test harness(es) would you like to install?"
    echo "  1) API (OpenID Conformance Suite)"
    echo "  2) Messaging (Aries Agent Test Harness)"
    echo "  3) Both"
    read -p "Enter your choice [1/2/3]: " harness_choice
fi

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

# --- Cloning Conformance Test Suite Repository ---

if $CLONE_REPO; then
    echo ""
    echo "Cloning the Conformance Test Suite repository..."
    if [ -n "$GITHUB_ACTIONS" ]; then
        echo "Detected GitHub Actions environment. Using GITHUB_TOKEN for authentication..."
        git clone https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git conformance-test-suite
    else
        echo "Running locally. Using SSH authentication..."
        git clone git@github.com:GANfoundation/conformance-test-suite.git conformance-test-suite
    fi
    cd conformance-test-suite
else
    if [ -d "conformance-test-suite" ]; then
        cd conformance-test-suite
    else
        echo "Repository not found in the current directory. Assuming you are in the correct directory."
    fi
fi

echo ""
echo "Installing dependencies with pnpm..."
pnpm install

echo "Installing npm packages"
npm install -g concurrently
cd frontend
pnpm install
cd ../backend
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
