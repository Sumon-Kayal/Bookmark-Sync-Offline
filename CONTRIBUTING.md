# Contributing to Bookmark Sync

First off, thank you for considering contributing to Bookmark Sync! It's people like you that make this extension better for everyone.

## Code of Conduct

By participating in this project, you are expected to:
- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:
- **Clear title** - Descriptive and specific
- **Steps to reproduce** - Detailed steps to recreate the issue
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Screenshots** - If applicable
- **Environment**:
  - Browser and version
  - Operating system
  - Extension version

**Example Bug Report:**

```markdown
**Title:** Bookmarks not syncing after folder rename

**Description:**
When I rename a bookmark folder, the changes are not reflected in storage.

**Steps to Reproduce:**
1. Create a bookmark folder named "Test"
2. Add some bookmarks to it
3. Rename the folder to "Testing"
4. Open the manager
5. Old name still appears

**Expected:** Folder name should update to "Testing"
**Actual:** Folder still shows as "Test"

**Environment:**
- Browser: Chrome 120.0.6099.109
- OS: Windows 11
- Extension Version: 1.0.0
```

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear title** - Describe the enhancement
- **Provide detailed description** - Explain why this would be useful
- **Include examples** - Show how it would work
- **List alternatives** - Mention other solutions you've considered

### 🔧 Pull Requests

#### Process

1. **Fork the repository**
2. **Create a branch** from `main`
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with clear messages**
6. **Push to your fork**
7. **Open a Pull Request**

#### PR Guidelines

- **One feature per PR** - Keep changes focused
- **Update documentation** - If you change functionality
- **Follow code style** - Match existing patterns
- **Add tests** - If applicable (when test framework is set up)
- **Link related issues** - Use "Fixes #123" in description

#### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How did you test these changes?

## Checklist
- [ ] My code follows the project's style
- [ ] I've tested on Chrome
- [ ] I've tested on Firefox
- [ ] I've updated documentation
- [ ] No console errors
- [ ] Extension loads without issues

## Screenshots (if applicable)
Add screenshots to demonstrate changes
```

## Development Setup

See [SETUP.md](SETUP.md) for detailed setup instructions.

Quick start:
```bash
git clone https://github.com/Sumon-Kayal/Bookmark-Sync.git
cd Bookmark-Sync
# Load unpacked extension in browser
```

## Code Style Guide

### JavaScript

**Naming Conventions:**
```javascript
// Use camelCase for variables and functions
const bookmarkCount = 10;
function syncBookmarks() { }

// Use PascalCase for classes
class BookmarkManager { }

// Use UPPER_CASE for constants
const MAX_BOOKMARKS = 1000;
```

**Code Structure:**
```javascript
// Group related functionality
// Add comments for complex logic
// Use async/await over callbacks

// Good
async function getBookmarks() {
  try {
    const bookmarks = await chrome.bookmarks.getTree();
    return bookmarks;
  } catch (error) {
    console.error('Failed to get bookmarks:', error);
    return null;
  }
}

// Avoid
function getBookmarks(callback) {
  chrome.bookmarks.getTree(function(bookmarks) {
    callback(bookmarks);
  });
}
```

**Error Handling:**
```javascript
// Always handle errors gracefully
try {
  await riskyOperation();
} catch (error) {
  console.error('[BookmarkSync] Error:', error);
  showUserFriendlyMessage();
}
```

### HTML/CSS

**HTML:**
- Use semantic HTML5 elements
- Include ARIA labels for accessibility
- Keep structure clean and organized

```html
<!-- Good -->
<button class="sync-btn" aria-label="Sync bookmarks">
  Sync Now
</button>

<!-- Avoid -->
<div onclick="sync()">Sync Now</div>
```

**CSS:**
- Use BEM naming convention (optional but preferred)
- Group related properties
- Use CSS variables for colors/spacing

```css
/* Good */
.bookmark-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
}

.bookmark-item__title {
  font-weight: bold;
}

.bookmark-item--selected {
  background-color: #e3f2fd;
}
```

### Comments

```javascript
// Use comments to explain WHY, not WHAT

// Good: Explains reasoning
// Chrome has a 100KB limit for storage.local items
// so we chunk large bookmark sets
if (bookmarkData.length > MAX_CHUNK_SIZE) {
  chunkData(bookmarkData);
}

// Avoid: States the obvious
// Set variable to 10
const count = 10;
```

## Commit Message Guidelines

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(popup): add search functionality to popup

fix(sync): resolve issue with nested folder sync
Fixes #123

docs(readme): update installation instructions

style(manager): improve spacing in bookmark list

refactor(background): simplify sync logic
```

## Testing Requirements

### Manual Testing

Before submitting a PR, test:
1. ✅ Extension loads without errors
2. ✅ All existing features still work
3. ✅ New feature works as intended
4. ✅ No console errors or warnings
5. ✅ Tested on Chrome and Firefox (if possible)
6. ✅ UI is responsive and accessible

### Test Cases

Document your test cases:
```markdown
## Test Case: Bookmark Sync

1. **Setup:** Fresh browser with no bookmarks
2. **Action:** Create 5 bookmarks
3. **Expected:** All 5 appear in storage
4. **Actual:** ✅ Passed
```

## Project Priorities

Current priorities (in order):
1. 🐛 Bug fixes
2. 📝 Documentation improvements
3. ✨ Core feature enhancements
4. 🎨 UI/UX improvements
5. 🧪 Testing infrastructure

## Questions?

- Check existing [Issues](https://github.com/Sumon-Kayal/Bookmark-Sync/issues)
- Open a new issue with "Question" label
- Reach out to [@Sumon-Kayal](https://github.com/Sumon-Kayal)

## Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Added to CONTRIBUTORS.md (when created)

Thank you for contributing! 🎉