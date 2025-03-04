#!/usr/bin/env sh

#!/bin/bash
set -e

# --------------------------
# Conformance Test Suite Setup Script
# --------------------------
echo "========================================"
echo "  Conformance Test Suite Setup Script"
echo "========================================"
echo ""

# Prompt the user for which test harness(es) to install.
echo "Which test harness(es) would you like to install?"
echo "  1) API (OpenID Conformance Suite)"
echo "  2) Messaging (Aries Agent Test Harness)"
echo "  3) Both"
read -p "Enter your choice [1/2/3]: " harness_choice

# Validate input and clone corresponding repositories.
case "$harness_choice" in
1)
    echo ""
    echo "Cloning OpenID Conformance Suite repository..."
    git clone https://gitlab.com/openid/conformance-suite.git
    echo ""
    echo "NOTE: To start the OpenID Conformance Suite dev environment, run the following commands in separate terminals:"
    echo "   1. In one terminal: 'devenv up'"
    echo "   2. In another terminal: 'mvn spring-boot:run'"
    ;;
2)
    echo ""
    echo "Cloning Aries Agent Test Harness repository..."
    git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git
    ;;
3)
    echo ""
    echo "Cloning both OpenID Conformance Suite and Aries Agent Test Harness repositories..."
    git clone https://gitlab.com/openid/conformance-suite.git
    git clone https://github.com/openwallet-foundation/owl-agent-test-harness.git
    echo ""
    echo "NOTE for OpenID Conformance Suite:"
    echo "   To start the dev environment, run the following commands in separate terminals:"
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
echo "Copying environment files..."
if [ -f frontend/.env.example ]; then
    cp frontend/.env.example frontend/.env
    echo "Copied frontend/.env.example to frontend/.env"
else
    echo "frontend/.env.example not found."
fi

if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    echo "Copied backend/.env.example to backend/.env"
else
    echo "backend/.env.example not found."
fi

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
echo "Remember to check the README.md for any additional manual steps, especially for starting the test harness servers if applicable."
