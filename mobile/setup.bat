@echo off
REM Apps for Good Mobile Setup Script for Windows

echo 🚀 Setting up Apps for Good Mobile App...

REM Check if we're in the mobile directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the mobile directory
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Check if .env exists, if not copy from example
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file and add your Gemini API key
) else (
    echo ✅ .env file already exists
)

REM Start Expo development server
echo 🎯 Starting Expo development server...
echo 📱 Scan the QR code with Expo Go app on your phone
echo 🌐 Or press 'w' to open in web browser
echo 📱 Press 'i' for iOS simulator or 'a' for Android emulator
npx expo start

pause
