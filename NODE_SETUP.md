# Node.js & npm Setup - Permanent Fix ✅

## What Was Done

1. **Installed Node.js v20.11.0** (LTS for macOS ARM64)
   - Location: `/usr/local/nodejs/v20.11.0`
   - Includes npm v10.2.4

2. **Created permanent shell configuration**
   - File: `~/.zshrc`
   - Adds Node.js to PATH automatically
   - Creates reliable aliases for npm, node, npx

3. **Verified installation**
   - ✅ `node --version` → v20.11.0
   - ✅ `npm --version` → 10.2.4
   - ✅ `npx --version` → 10.2.4

## How to Use

### Option 1: Automatic (Recommended)
Every new terminal session will automatically have npm available because it's in `~/.zshrc`.

Just run:
```bash
npm install
npm run dev
# etc.
```

### Option 2: Manual Activation (If Option 1 fails)
Run this in any terminal:
```bash
source ~/.zshrc
npm --version  # Verify it works
```

### Option 3: Setup Script
Run the dedicated setup script:
```bash
source ~/.setup-node.sh
npm --version
```

## Testing

Test npm is working:
```bash
npm --version
npx --version
node --version
```

Test in your project:
```bash
cd /Users/abhiraamvenigalla/AFG-26
npm install
npm run dev
```

## If npm Still Not Found

This should never happen, but if it does:

1. **Reload shell**:
   ```bash
   exec zsh
   ```

2. **Check PATH**:
   ```bash
   echo $PATH
   ```
   Should show: `/usr/local/nodejs/v20.11.0/bin` at the start

3. **Verify installation**:
   ```bash
   ls -la /usr/local/nodejs/v20.11.0/bin/npm
   ```

4. **Force reload**:
   ```bash
   source ~/.zshrc
   ```

## Permanent Configuration

Your `~/.zshrc` file now contains:
```bash
# Node.js and npm PATH configuration
export PATH="/usr/local/nodejs/v20.11.0/bin:$PATH"

# Aliases for reliability
alias npm="/usr/local/nodejs/v20.11.0/bin/npm"
alias node="/usr/local/nodejs/v20.11.0/bin/node"
alias npx="/usr/local/nodejs/v20.11.0/bin/npx"
```

This ensures npm works in:
- ✅ New terminal windows
- ✅ New terminal tabs
- ✅ VS Code integrated terminal
- ✅ Remote SSH sessions
- ✅ Any shell that sources ~/.zshrc

## Available Commands

All these will now work everywhere:
- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- `npx ts-node file.ts`
- `npx jest`
- etc.

## Troubleshooting

**Problem**: "npm command not found" in new terminal
- **Solution**: Restart terminal or run `source ~/.zshrc`

**Problem**: Different npm version appears
- **Solution**: Run `which npm` to see which one is being used
- Then: `hash -r` to clear shell cache

**Problem**: Want to uninstall Node.js
- **Solution**: `sudo rm -rf /usr/local/nodejs`
- Then remove the lines from `~/.zshrc`

## Information

- **Node.js Location**: `/usr/local/nodejs/v20.11.0`
- **npm Location**: `/usr/local/nodejs/v20.11.0/bin/npm`
- **Setup Script**: `~/.setup-node.sh`
- **Shell Config**: `~/.zshrc`

npm is now permanently available and will never be "not found" again! 🎉
