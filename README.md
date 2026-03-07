# 🔖 Bookmark Sync Offline 

A lightweight browser extension that synchronizes your bookmarks to internal storage, providing a seamless backup and management solution for your favorite links.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Version](https://img.shields.io/badge/version-3.0.0-green.svg)
![JavaScript](https://img.shields.io/badge/javascript-ES6+-yellow.svg)

## ✨ Features

- 📥 **Automatic Sync** - Seamlessly sync bookmarks from your browser to internal storage
- 🔄 **Real-time Updates** - Automatically detects bookmark changes and updates storage
- 📊 **Bookmark Manager** - Clean, intuitive interface to view and manage your bookmarks
- 🎯 **Lightweight** - Minimal resource usage with fast performance
- 🔒 **Privacy Focused** - All data stored locally in your browser
- 🎨 **Modern UI** - Clean and user-friendly interface

## 🚀 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sumon-Kayal/Bookmark-Sync.git
   cd Bookmark-Sync
   ```

2. **Load in Chrome/Edge**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `Bookmark-Sync` folder

3. **Load in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file from the `Bookmark-Sync` folder (e.g., `manifest.json`)

## 📖 Usage

### Basic Operations

1. **Initial Sync**
   - Click the extension icon in your browser toolbar
   - Click "Sync Now" to perform your first synchronization
   - Your bookmarks will be saved to internal storage

2. **View Bookmarks**
   - Click "Open Manager" to view all synced bookmarks
   - Browse through folders and individual bookmarks
   - Use the manager interface to organize your links

3. **Automatic Sync**
   - The extension automatically syncs when you:
     - Add new bookmarks
     - Delete bookmarks
     - Move bookmarks between folders
     - Rename bookmarks or folders

### Features Overview

- **Popup Interface**: Quick access to sync status and manager
- **Bookmark Manager**: Full-featured interface for browsing synced bookmarks
- **Background Sync**: Automatic synchronization without user interaction
- **Storage Statistics**: View how many bookmarks are synced

## 🛠️ Development Setup

### Prerequisites

- Modern web browser (Chrome 88+, Firefox 109+, or Edge 88+)
- Basic knowledge of JavaScript and browser extensions
- Text editor or IDE (VS Code recommended)

### Project Structure

```
Bookmark-Sync/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── manager.html          # Bookmark manager interface
├── styles.css            # Shared styles
├── README.md             # This file
├── LICENSE               # GPL-3.0 License
└── .gitignore           # Git ignore rules
```

### Key Files

- **manifest.json** - Defines extension properties, permissions, and scripts
- **background.js** - Handles bookmark events and synchronization logic
- **popup.js** - Controls the popup interface and user interactions
- **manager.html** - Full-page bookmark management interface

### Development Workflow

1. **Make Changes**
   ```bash
   # Edit files in your preferred editor
   code .
   ```

2. **Reload Extension**
   - Chrome/Edge: Go to `chrome://extensions/` and click the reload icon
   - Firefox: Click "Reload" on `about:debugging`

3. **Test Features**
   - Test bookmark creation, deletion, and modification
   - Verify sync functionality
   - Check manager interface
   - Test error handling

4. **Debug**
   - Right-click extension icon → "Inspect popup" (for popup debugging)
   - Go to `chrome://extensions/` → "Inspect views: background page" (for background script)
   - Check browser console for errors

## 🧪 Testing

### Manual Testing Checklist

- [ ] Extension installs without errors
- [ ] Popup opens and displays correctly
- [ ] Initial sync saves all bookmarks
- [ ] New bookmarks are automatically synced
- [ ] Deleted bookmarks are removed from storage
- [ ] Bookmark manager displays all items correctly
- [ ] Folder structure is preserved
- [ ] Search/filter works (if implemented)
- [ ] Extension icon displays properly

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 88+     | ✅ Supported |
| Edge    | 88+     | ✅ Supported |
| Firefox | 109+    | ✅ Supported |
| Safari  | -       | ❌ Not tested |
| Opera   | 74+     | ✅ Should work |

## 📝 API Reference

### Storage Structure

```javascript
// Bookmarks are stored in chrome.storage.local
{
  "bookmarks_data": {
    "data": [
      {
        "title": "Example Site",
        "url": "https://example.com",
        "dateAdded": 1234567890000
      }
    ],
    "savedAt": 1234567890000,
    "count": 1
  }
}
```

### Key Functions

**background.js**
- `initializeExtension()` — Sets default metadata on first install
- `setupAlarms()` — Creates the 24h maintenance alarm (clears first to avoid duplicates)
- `performMaintenance()` — Runs periodic storage housekeeping
- `debounceNotifyPopup(message)` — Alarm-based debounce for bookmark change notifications

**popup.js**
- `handlePull()` — Reads the full bookmark tree and saves to local storage
- `handlePush()` — Pushes staged bookmarks into the browser's bookmark bar
- `handleExportJson()` / `handleExportHtml()` — Exports stored bookmarks to file
- `handleImportFileData(file)` — Imports bookmarks from a JSON or HTML file
- `findOrCreateFolder(title)` — Finds or creates a folder on the bookmarks bar

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Contribution Guidelines

- Follow existing code style
- Add comments for complex logic
- Test thoroughly before submitting
- Update documentation as needed
- Keep commits focused and descriptive

## 🐛 Known Issues

- None currently reported

## 📋 Roadmap

- [ ] Search functionality in manager
- [ ] Cloud sync integration
- [ ] Tag system for bookmarks
- [ ] Keyboard shortcuts
- [ ] Dark mode support
- [ ] Bookmark statistics and analytics
- [ ] Duplicate detection
- [ ] Backup scheduling

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Sumon Kayal**

- GitHub: [@Sumon-Kayal](https://github.com/Sumon-Kayal)

## 🙏 Acknowledgments

- Thanks to all contributors
- Inspired by the need for better bookmark management
- Built with modern web extension APIs

## 📞 Support

If you encounter any issues or have questions:

- Open an [Issue](https://github.com/Sumon-Kayal/Bookmark-Sync/issues)
- Check existing issues for solutions
- Star the repository if you find it useful!

## 🔗 Links

- [Chrome Web Store](#) (Coming soon)
- [Firefox Add-ons](#) (Coming soon)
- [Documentation](https://github.com/Sumon-Kayal/Bookmark-Sync/wiki) (Coming soon)

---

Made with ❤️ by [Sumon Kayal](https://github.com/Sumon-Kayal)
