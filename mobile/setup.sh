#!/bin/bash

# Apps for Good Mobile Setup Script
echo "🚀 Setting up Apps for Good Mobile App..."

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the mobile directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your Gemini API key"
else
    echo "✅ .env file already exists"
fi

# Start Expo development server
echo "🎯 Starting Expo development server..."
echo "📱 Scan the QR code with Expo Go app on your phone"
echo "🌐 Or press 'w' to open in web browser"
echo "📱 Press 'i' for iOS simulator or 'a' for Android emulator"
npx expo start
