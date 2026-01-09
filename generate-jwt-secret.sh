#!/bin/bash

echo "🔐 Generating secure JWT secret key..."
echo ""
echo "Your JWT Secret Key:"
openssl rand -base64 32
echo ""
echo "Copy this value and use it in your deployment configuration."
echo "Keep it secret and never commit it to version control!"
