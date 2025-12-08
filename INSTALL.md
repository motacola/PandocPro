# Installing PandocPro (Unsigned Version) 📦

## Why You See a Warning ⚠️

PandocPro is **completely safe**, but macOS shows an "unidentified developer" warning because:
- We don't have a $99/year Apple Developer certificate
- The app is not notarized by Apple

**This is normal for free, open-source Mac apps!**

You can verify the source code on GitHub: https://github.com/motacola/PandocPro

---

## Installation Steps 🚀

### Method 1: Right-Click Open (Easiest)

1. **Download** `PandocPro.dmg` from the latest release
2. **Open** the .dmg file (double-click)
3. **Drag** PandocPro to Applications folder
4. **Right-click** (or Control-click) PandocPro.app
5. Select **"Open"** from the menu
6. Click **"Open"** in the dialog

✅ **Done!** PandocPro will now run normally without warnings.

### Method 2: Terminal Command

If right-click doesn't work, use Terminal:

```bash
# Remove quarantine flags
sudo xattr -cr /Applications/PandocPro.app
sudo xattr -dr com.apple.quarantine /Applications/PandocPro.app

# Launch the app
open /Applications/PandocPro.app
```

---

## Screenshots 📸

### Step 1: Open the DMG
![Download DMG from GitHub Releases]

### Step 2: Drag to Applications
![Drag PandocPro icon to Applications folder]

### Step 3: Right-Click → Open
![Right-click menu showing Open option]

### Step 4: Confirm Open
![Security dialog with Open button]

### Step 5: App Running!
![PandocPro dashboard]

---

## Troubleshooting 🔧

### "PandocPro.app is damaged"
This sometimes happens with downloaded apps. Fix it:
```bash
xattr -cr /Applications/PandocPro.app
```

### "PandocPro can't be opened"
Try removing all quarantine attributes:
```bash
sudo xattr -rd com.apple.quarantine /Applications/PandocPro.app
```

### Still Having Issues?
Open System Settings → Privacy & Security → scroll down to see "PandocPro was blocked" → Click "Open Anyway"

---

## Verification 🔒

### Verify Download Integrity

Check the SHA256 checksum:
```bash
shasum -a 256 ~/Downloads/PandocPro_3.8.2.dmg
```

Compare with the checksum in `checksums.txt` from the release.

### Check App Signature
```bash
codesign -dvv /Applications/PandocPro.app
```

Will show: `not signed` or `ad-hoc signed` (both are fine for free distribution)

---

## Why Not Just Pay for Apple Developer?

**Great question!** Here's why free distribution works well:

✅ **Open Source**: Anyone can verify the code  
✅ **Community Trust**: Thousands of Mac apps distribute this way  
✅ **One-Time Setup**: Users only bypass Gatekeeper once  
✅ **No Recurring Cost**: $99/year adds up over time  
✅ **Same Functionality**: App works identically  

**Popular apps distributed without Apple signing:**
- Many Homebrew packages
- Open-source tools
- Developer utilities
- Academic software

---

## Future Plans 💡

If PandocPro becomes widely used, we may:
- Apply for Apple Developer membership
- Add code signing and notarization
- Submit to Mac App Store
- Enable automatic updates

For now, free distribution serves the community well!

---

## Need Help? 🆘

- **Issues**: https://github.com/motacola/PandocPro/issues
- **Discussions**: https://github.com/motacola/PandocPro/discussions
- **Email**: [your-email@example.com]

---

## Thank You! 🙏

Thank you for using PandocPro! Your support helps keep this project free and open-source.

**Star the repo**: https://github.com/motacola/PandocPro ⭐  
**Share with others**: Spread the word!  
**Contribute**: PRs welcome!  

---

**Made with ❤️ by the PandocPro community**
