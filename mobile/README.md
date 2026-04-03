# Apps for Good Mobile App

This is the mobile version of the Apps for Good application built with React Native and Expo.

## Features

- **Chat Interface**: AI-powered chat functionality
- **Cross-Platform**: Works on iOS, Android, and web
- **Modern UI**: Clean design with gradients and smooth animations
- **TypeScript**: Full type safety
- **Real-time API**: Integration with Gemini AI

## Getting Started

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini API key:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   ```

3. **Start the development server**:
   ```bash
   npx expo start
   ```

4. **Run on your device**:
   - **Expo Go App**: Download from App Store/Google Play, then scan the QR code
   - **iOS Simulator**: Press `i` in the terminal
   - **Android Emulator**: Press `a` in the terminal
   - **Web**: Press `w` to open in browser

## Environment Variables

Create a `.env` file in the mobile directory:

```env
# Required: Gemini API Key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom API URL
EXPO_PUBLIC_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

## Dependencies

- `expo`: Framework and tools
- `expo-constants`: Access to app configuration
- `expo-linear-gradient`: Gradient effects
- `expo-blur`: Blur effects
- `lucide-react-native`: Modern icons
- `react-native-safe-area-context`: Safe area handling
- `react-native`: Core React Native

## Project Structure

- `src/components/ChatInterface.tsx`: Main chat UI component
- `src/services/api.ts`: API service for Gemini integration
- `src/types.ts`: TypeScript interfaces
- `App.tsx`: App entry point
- `app.json`: Expo configuration

## Troubleshooting

- **API Key Issues**: Make sure your Gemini API key is valid and has sufficient quota
- **Network Errors**: Check your internet connection and API endpoint
- **Build Issues**: Try `npx expo install --fix` to resolve dependency conflicts
- **Metro Bundler**: If you see bundler errors, restart with `npx expo start --clear`
