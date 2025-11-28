# Code Signing & Notarization Guide

This guide explains how to set up code signing and notarization for PandocPro on macOS.

## Prerequisites

- Apple Developer Account (paid)
- Mac with Xcode Command Line Tools installed
- `python3` and `altool` (part of Xcode)

## Step 1: Create Developer Certificates

### Generate a Signing Certificate

1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to **Certificates, Identifiers & Profiles** → **Certificates**
3. Click the **+** button to create a new certificate
4. Select **Mac Development** or **Mac Distribution** (for release builds, use Distribution)
5. Follow the steps to create a Certificate Signing Request (CSR)
6. Download the certificate and double-click to install in Keychain

### Export Certificate to File

```bash
# Open Keychain Access
open /Applications/Utilities/Keychain\ Access.app

# Find your certificate (Developer ID Application: <Your Name>)
# Right-click → Export
# Save as: pandocpro.p12
# Set a strong password
```

## Step 2: Configure Environment Variables

### Local Build Setup

Create or update `~/.zshrc` or `~/.bash_profile`:

```bash
# Apple Developer ID
export CSC_IDENTITY_AUTO_DISCOVERY=true
export CSC_NAME="Developer ID Application: Your Name (ABC123DEF4)"
export CSC_KEY_PASSWORD="your-p12-password"

# For notarization (if using automated notarization)
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="@keychain:NOTARIZATION_PASSWORD"
export APPLE_TEAM_ID="ABC123DEF4"

# CI/CD environments
export DISABLE_CODE_SIGNING=false
```

### Get Your Team ID

```bash
# Check your certificate details
security find-certificate -c "Developer ID Application" -p | \
  openssl x509 -text -noout | grep "OU ="
```

## Step 3: Create Notarization Helper Script

Create `gui/scripts/notarize.js`:

```javascript
import { notarize } from 'electron-notarize'

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productName
  const appPath = path.join(appOutDir, `${appName}.app`)

  console.log(`Notarizing ${appPath}...`)

  try {
    await notarize({
      appBundleId: 'com.motacola.pandocpro',
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    })
    console.log('Notarization successful!')
  } catch (err) {
    console.error('Notarization failed:', err)
    throw err
  }
}
```

## Step 4: Update electron-builder Config

The `gui/electron-builder.json` already has notarization configuration:

```json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (ABC123DEF4)",
    "signingIdentity": "Developer ID Application: Your Name (ABC123DEF4)",
    "notarize": {
      "teamId": "ABC123DEF4"
    }
  },
  "afterSign": "scripts/notarize.js"
}
```

## Step 5: Install Dependencies

```bash
cd gui
npm install electron-notarize --save-dev
```

## Step 6: Build & Sign

### Local Build

```bash
cd gui
npm run electron:build
```

The build process will:

1. Compile TypeScript and React
2. Bundle with Vite
3. Sign the .app bundle with your Developer ID
4. Create .dmg and .zip packages
5. Notarize the app (if configured)
6. Staple the notarization ticket

### GitHub Actions Build

Set secrets in GitHub repository settings:

```
CSC_KEY_PASSWORD: <your-p12-password>
APPLE_ID: your-apple-id@example.com
APPLE_ID_PASSWORD: <app-specific-password>
APPLE_TEAM_ID: ABC123DEF4
```

## Troubleshooting

### Certificate Not Found

```bash
# List available certificates
security find-identity -v -p codesigning

# Verify in Keychain
open /Applications/Utilities/Keychain\ Access.app
```

### Notarization Fails

```bash
# Check notarization status
xcrun altool --notarization-info <RequestUUID> \
  -u your-apple-id@example.com \
  -p @keychain:NOTARIZATION_PASSWORD
```

### Gatekeeper Rejection

If the app is rejected by Gatekeeper:

```bash
# Remove quarantine attribute
xattr -rd com.apple.quarantine /Applications/PandocPro.app

# Or check what's blocking it
spctl -a -v /Applications/PandocPro.app
```

## Testing Signed App

```bash
# Verify code signature
codesign -v -v /Applications/PandocPro.app

# Check requirements
codesign -d --requirements - /Applications/PandocPro.app

# Verify notarization
spctl -a -v /Applications/PandocPro.app
```

## References

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Notarization Guide](https://developer.apple.com/documentation/notaryservice)
- [electron-builder Documentation](https://www.electron.build/code-signing)
