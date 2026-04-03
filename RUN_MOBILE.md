# How to Run the Mobile App

## ⚠️ IMPORTANT: Run from MOBILE directory only!

The mobile app must be run from the `mobile/` directory, NOT from the root directory.

## 🚀 Correct Way to Start

```bash
# Navigate to mobile directory FIRST
cd mobile

# Then start Expo
npx expo start
```

## ❌ What NOT to do

```bash
# DON'T do this from root directory - causes version conflicts!
npx expo start  # ❌ WRONG - This causes the slow loading
```

## 🔧 Why This Matters

- **Root directory**: Has Next.js + Expo (conflict!)
- **Mobile directory**: Has React Native + Expo only ✅
- **Version conflicts** cause Metro bundler to be slow and confused

## 📱 After Starting

1. **Scan QR code** with Expo Go app
2. **Or press**:
   - `i` for iOS simulator
   - `a` for Android emulator  
   - `w` for web browser

## 🛠️ If Still Slow

Try these commands from the `mobile/` directory:

```bash
# Clear cache and restart
npx expo start --clear

# Reset everything
rm -rf node_modules
npm install
npx expo start --clear
```

## 📁 Directory Structure

```
appsforgood/
├── package.json          # Next.js project (NO expo)
├── mobile/
│   ├── package.json      # React Native + Expo
│   ├── app.json
│   └── src/
└── RUN_MOBILE.md         # This file
```

Remember: **Always run Expo from the mobile/ directory!**
