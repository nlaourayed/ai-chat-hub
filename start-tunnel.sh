#!/bin/bash

echo "🌐 Starting AI Chat Hub Tunnel Setup"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Installing..."
    brew install ngrok
fi

# Check if ngrok is authenticated
if ! ngrok version &> /dev/null; then
    echo "⚠️ Please authenticate ngrok first:"
    echo "1. Go to: https://dashboard.ngrok.com/signup"
    echo "2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok authtoken YOUR_TOKEN"
    echo ""
    read -p "Press Enter after you've set up your ngrok token..."
fi

echo "🚀 Starting tunnel on port 3000 (Next.js default port)..."
echo ""
echo "🔗 Your webhook URL will be displayed below."
echo "📝 Copy the HTTPS URL and use it in Chatra webhook settings:"
echo ""
echo "   Chatra Webhook Settings:"
echo "   • URL: https://YOUR_NGROK_URL.ngrok.io/api/chatra-webhook"
echo "   • Events: chatStarted, chatFragment, chatTranscript"
echo "   • Secret: bJPXaSR6tgbyDeBkxiH6Trp9nzomBHuGJvBvWAbTGgicGfA6"
echo ""
echo "📍 Configure at: https://app.chatra.io/ → Settings → Integrations → Webhooks"
echo ""

# Start ngrok on correct port
ngrok http 3000 