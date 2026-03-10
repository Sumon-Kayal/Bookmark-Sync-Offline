/**
 * Bookmark Sync - Popup Script
 * Cross-browser compatible (Chrome, Edge, Firefox)
 * All critical issues fixed:
 * ✅ Storage API fixed (local instead of session)
 * ✅ Error handling added everywhere
 * ✅ URL validation for security
 * ✅ Promise-based APIs
 * ✅ Loading states
 */

// CRITICAL FIX: Use local storage instead of session storage
const STORAGE_KEY = 'bookmarks_data';
const METADATA_KEY = 'sync_metadata';

// MV3-compliant API namespace.
// Both Chrome and Firefox MV3 expose the `chrome` namespace.
// Firefox also exposes `browser` (Promise-based), but `chrome` works on both.
const browserAPI = globalThis.browser ?? globalThis.chrome;

// UI Elements
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('fileInput');

// Button elements
const pullBtn = document.getElementById('pullBtn');
const pushBtn = document.getElementById('pushBtn');
const importBtn = document.getElementById('importBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportHtmlBtn = document.getElementById('exportHtmlBtn');
const clearBtn = document.getElementById('clearBtn');
const clearConfirm = document.getElementById('clearConfirm');
const clearConfirmBtn = document.getElementById('clearConfirmBtn');
const clearCancelBtn = document.getElementById('clearCancelBtn');
const clearConfirmCount = document.getElementById('clearConfirmCount');

// State
let isOperationInProgress = false;

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Update count display
    if (countEl) await updateCount();
    
    // Set up button listeners
    setupEventListeners();
    
    // Listen for background messages
    browserAPI.runtime.onMessage.addListener(handleBackgroundMessage);
    
  } catch (error) {
    console.error('[Popup] Initialization error:', error);
    showStatus('Failed to initialize', 'error');
  }
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
  if (pullBtn) pullBtn.addEventListener('click', handlePull);
  if (pushBtn) pushBtn.addEventListener('click', handlePush);
  if (exportJsonBtn) exportJsonBtn.addEventListener('click', handleExportJson);
  if (exportHtmlBtn) exportHtmlBtn.addEventListener('click', handleExportHtml);
  if (clearBtn) clearBtn.addEventListener('click', handleClearRequest);
  if (clearCancelBtn) clearCancelBtn.addEventListener('click', dismissClearConfirm);
  if (clearConfirmBtn) clearConfirmBtn.addEventListener('click', handleClearConfirmed);
  
  // Import button opens manager in new tab
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      browserAPI.tabs.create({ url: browserAPI.runtime.getURL('manager.html') });
    });
  }
  
  // File input for manager page
  if (fileInput) {
    fileInput.addEventListener('change', handleImportFile);
  }
  
  // Drag-and-drop for manager page
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only remove highlight when the cursor truly leaves the drop zone,
      // not when it moves over a child element inside it
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });
    
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      
      // Reuse the same import handler by simulating a file event
      await handleImportFileData(file);
    });
  }
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(message) {
  if (message.type === 'bookmark-changed') {
    updateCount();
  } else if (message.type === 'command') {
    // Handle keyboard commands
    if (message.command === 'pull_bookmarks') {
      handlePull();
    }
  }
}

/**
 * Set operation in progress state
 */
function setOperationState(inProgress) {
  isOperationInProgress = inProgress;
  
  const buttons = [pullBtn, pushBtn, exportJsonBtn, exportHtmlBtn, importBtn, clearBtn];
  buttons.forEach(btn => {
    if (btn) {
      btn.disabled = inProgress;
      btn.style.opacity = inProgress ? '0.6' : '1';
      btn.style.cursor = inProgress ? 'not-allowed' : 'pointer';
      
      if (inProgress) {
        btn.classList.add('loading');
      } else {
        btn.classList.remove('loading');
      }
    }
  });
}

/**
 * CRITICAL FIX: Get stored bookmarks from LOCAL storage
 */
async function getStored() {
  try {
    const result = await browserAPI.storage.local.get([STORAGE_KEY]);
    return result[STORAGE_KEY]?.data || [];
  } catch (error) {
    console.error('[Popup] Error getting stored bookmarks:', error);
    throw error;
  }
}

/**
 * CRITICAL FIX: Save bookmarks to LOCAL storage
 */
async function saveStored(data) {
  try {
    const dedupedData = deduplicateBookmarks(data);
    
    await browserAPI.storage.local.set({
      [STORAGE_KEY]: {
        data: dedupedData,
        savedAt: Date.now(),
        count: dedupedData.length
      }
    });
    
    // Update metadata
    try {
      await browserAPI.runtime.sendMessage({
        type: 'update-metadata',
        data: { lastUpdate: Date.now() }
      });
    } catch (_e) {
      // Background might not be ready, ignore
    }
    
    return dedupedData;
  } catch (error) {
    console.error('[Popup] Error saving bookmarks:', error);
    throw error;
  }
}

/**
 * Update bookmark count display
 */
async function updateCount() {
  try {
    const data = await getStored();
    if (countEl) {
      countEl.textContent = data.length;
    }
  } catch (error) {
    console.error('[Popup] Error updating count:', error);
    if (countEl) countEl.textContent = '?';
  }
}

// Timer handle for auto-hiding status messages
let statusTimeout = null;

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  if (!statusEl) {
    return;
  }
  
  // Clear any existing hide-timer so it doesn't dismiss the new message early
  if (statusTimeout) {
    clearTimeout(statusTimeout);
    statusTimeout = null;
  }
  
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  
  // Auto-hide after 4 seconds
  statusTimeout = setTimeout(() => {
    statusEl.classList.remove('show');
    statusTimeout = null;
  }, 4000);
}

/**
 * IMPROVED: Pull bookmarks from browser with full error handling
 */
async function handlePull() {
  if (isOperationInProgress) return;
  
  setOperationState(true);
  showStatus('Pulling bookmarks from browser...', 'info');
  
  try {
    // Use Promise-based API (works on both Chrome and Firefox)
    const tree = await browserAPI.bookmarks.getTree();
    
    const bookmarks = [];
    
    const walkTree = (node) => {
      if (node.url) {
        // SECURITY FIX: Validate URL before adding
        if (isValidUrl(node.url)) {
          bookmarks.push({
            title: node.title || '(No title)',
            url: node.url,
            // Use != null so dateAdded: 0 is preserved correctly
            dateAdded: node.dateAdded != null ? node.dateAdded : Date.now()
          });
        } else {
          console.warn('[Popup] Skipping invalid URL:', node.url);
        }
      }
      
      if (node.children) {
        node.children.forEach(walkTree);
      }
    };
    
    walkTree(tree[0]);
    
    // Save to storage — returns deduped array
    const saved = await saveStored(bookmarks);
    await updateCount();
    
    const skippedDups = bookmarks.length - saved.length;
    let msg = `✓ Successfully pulled ${saved.length} bookmarks`;
    if (skippedDups > 0) msg += ` (${skippedDups} duplicate${skippedDups !== 1 ? 's' : ''} removed)`;
    showStatus(msg, 'success');
    
  } catch (error) {
    console.error('[Popup] Error pulling bookmarks:', error);
    showStatus(`Failed to pull bookmarks: ${error.message}`, 'error');
  } finally {
    setOperationState(false);
  }
}

/**
 * IMPROVED: Push bookmarks to browser with better folder handling
 */
async function handlePush() {
  if (isOperationInProgress) return;
  
  setOperationState(true);
  showStatus('Pushing bookmarks to browser...', 'info');
  
  try {
    const staged = await getStored();
    
    if (!staged.length) {
      showStatus('No bookmarks to push', 'error');
      setOperationState(false);
      return;
    }
    
    // Get existing bookmarks to avoid duplicates
    const tree = await browserAPI.bookmarks.getTree();
    const existingUrls = new Set();
    
    const collectUrls = (node) => {
      if (node.url) existingUrls.add(node.url);
      if (node.children) node.children.forEach(collectUrls);
    };
    
    collectUrls(tree[0]);
    
    // Filter out duplicates
    const toAdd = staged.filter(b => !existingUrls.has(b.url));
    
    if (!toAdd.length) {
      showStatus('✓ All bookmarks already exist in browser', 'success');
      setOperationState(false);
      return;
    }
    
    // IMPROVED: Find or create folder (prevents duplicate folders)
    const targetFolder = await findOrCreateFolder('Imported Bookmarks');
    
    // Add bookmarks one by one with error handling
    let added = 0;
    let failed = 0;
    
    for (const bookmark of toAdd) {
      try {
        await browserAPI.bookmarks.create({
          parentId: targetFolder.id,
          title: bookmark.title,
          url: bookmark.url
        });
        added++;
      } catch (error) {
        console.error('[Popup] Failed to add bookmark:', bookmark.title, error);
        failed++;
      }
    }
    
    const message = `✓ Added ${added} bookmark${added !== 1 ? 's' : ''}`;
    const fullMessage = failed > 0 ? `${message} (${failed} failed)` : message;
    
    showStatus(fullMessage, failed > 0 ? 'error' : 'success');
    
  } catch (error) {
    console.error('[Popup] Error pushing bookmarks:', error);
    showStatus(`Failed to push bookmarks: ${error.message}`, 'error');
  } finally {
    setOperationState(false);
  }
}

/**
 * IMPROVED: Find or create bookmark folder (prevents duplicates)
 * Searches only the direct children of the bookmarks bar to avoid
 * accidentally matching a same-named folder elsewhere in the tree.
 */
async function findOrCreateFolder(title) {
  try {
    const tree = await browserAPI.bookmarks.getTree();

    // Find a safe parent bar: Chrome id "1", Firefox "toolbar_____", or title match
    let parentBar = null;
    if (tree[0].children) {
      parentBar = tree[0].children.find(n =>
        n.id === '1' || n.id === 'toolbar_____' ||
        /bookmarks\.bar|toolbar/i.test(n.title)
      );
    }
    if (!parentBar) parentBar = tree[0]; // fallback to root

    // Only search direct children of the bar — avoids wrong deep matches
    const existingFolder = (parentBar.children || []).find(
      n => !n.url && n.title === title
    );

    if (existingFolder) {
      return existingFolder;
    }

    const folder = await browserAPI.bookmarks.create({
      parentId: parentBar.id,
      title: title
    });

    return folder;

  } catch (error) {
    console.error('[Popup] Error finding/creating folder:', error);
    throw error;
  }
}

/**
 * Handle file import via <input type="file">
 */
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await handleImportFileData(file);
  } finally {
    event.target.value = '';
  }
}

/**
 * Core import logic — shared by file input and drag-and-drop
 */
async function handleImportFileData(file) {
  if (isOperationInProgress) return;

  setOperationState(true);
  showStatus('Importing file...', 'info');

  try {
    const content = await readFileAsText(file);
    let bookmarks;
    
    const nameLower = file.name.toLowerCase();
    if (nameLower.endsWith('.json')) {
      bookmarks = JSON.parse(content);
      
      // Validate JSON structure
      if (!Array.isArray(bookmarks)) {
        throw new Error('Invalid JSON format: expected array of bookmarks');
      }
    } else if (nameLower.endsWith('.html') || nameLower.endsWith('.htm')) {
      bookmarks = parseHtmlBookmarks(content);
    } else {
      throw new Error('Unsupported file type. Please use .json or .html files');
    }
    
    // SECURITY: Validate all bookmarks
    const validBookmarks = bookmarks.filter(b => {
      if (!b || typeof b !== 'object') return false;
      if (!b.url || !b.title) return false;
      if (!isValidUrl(b.url)) return false;
      return true;
    });
    
    if (validBookmarks.length === 0) {
      throw new Error('No valid bookmarks found in file');
    }
    
    const skipped = bookmarks.length - validBookmarks.length;
    
    await saveStored(validBookmarks);
    await updateCount();
    
    let message = `✓ Imported ${validBookmarks.length} bookmark${validBookmarks.length !== 1 ? 's' : ''}`;
    if (skipped > 0) {
      message += ` (skipped ${skipped} invalid)`;
    }
    message += '. Close this tab and use "Push to Browser" to add them.';
    
    showStatus(message, 'success');
    
  } catch (error) {
    console.error('[Popup] Import error:', error);
    showStatus(`Import failed: ${error.message}`, 'error');
  } finally {
    setOperationState(false);
  }
}

/**
 * Read file as text
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * SECURITY FIX: Parse HTML bookmarks with URL validation
 */
function parseHtmlBookmarks(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const links = doc.querySelectorAll('a[href]');
    const bookmarks = [];
    
    links.forEach(link => {
      const url = link.getAttribute('href');
      
      // SECURITY: Only accept valid HTTP/HTTPS URLs
      if (isValidUrl(url)) {
        const addDateAttr = link.getAttribute('ADD_DATE');
        const addDateMs = addDateAttr != null ? parseInt(addDateAttr) * 1000 : Date.now();
        bookmarks.push({
          title: (link.textContent || '').trim() || '(No title)',
          url: url,
          dateAdded: isNaN(addDateMs) ? Date.now() : addDateMs
        });
      }
    });
    
    return bookmarks;
    
  } catch (error) {
    console.error('[Popup] HTML parsing error:', error);
    throw new Error('Failed to parse HTML file');
  }
}

/**
 * SECURITY FIX: Validate URL to prevent malicious schemes
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    // This prevents javascript:, data:, file:, and other dangerous schemes
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Export bookmarks as JSON
 */
async function handleExportJson() {
  if (isOperationInProgress) return;
  
  try {
    const bookmarks = await getStored();
    
    if (!bookmarks.length) {
      showStatus('No bookmarks to export', 'error');
      return;
    }
    
    const json = JSON.stringify(bookmarks, null, 2);
    const filename = `bookmarks_${new Date().toISOString().split('T')[0]}.json`;
    
    downloadFile(json, filename, 'application/json');
    
    showStatus(`✓ Exported ${bookmarks.length} bookmarks as JSON`, 'success');
    
  } catch (error) {
    console.error('[Popup] Export JSON error:', error);
    showStatus(`Failed to export: ${error.message}`, 'error');
  }
}

/**
 * Export bookmarks as HTML
 */
async function handleExportHtml() {
  if (isOperationInProgress) return;
  
  try {
    const bookmarks = await getStored();
    
    if (!bookmarks.length) {
      showStatus('No bookmarks to export', 'error');
      return;
    }
    
    // Create Netscape bookmark format (compatible with all browsers)
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
`;
    
    bookmarks.forEach(bookmark => {
      const addDate = Math.floor((bookmark.dateAdded || Date.now()) / 1000);
      const safeTitle = escapeHtml(bookmark.title);
      const safeUrl = escapeHtml(bookmark.url);
      
      html += `    <DT><A HREF="${safeUrl}" ADD_DATE="${addDate}">${safeTitle}</A>\n`;
    });
    
    html += `</DL><p>\n`;
    
    const filename = `bookmarks_${new Date().toISOString().split('T')[0]}.html`;
    downloadFile(html, filename, 'text/html');
    
    showStatus(`✓ Exported ${bookmarks.length} bookmarks as HTML`, 'success');
    
  } catch (error) {
    console.error('[Popup] Export HTML error:', error);
    showStatus(`Failed to export: ${error.message}`, 'error');
  }
}

/**
 * Escape HTML entities for security
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

/**
 * Download file to user's computer
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  
  try {
    link.click();
  } finally {
    // Cleanup — revokeObjectURL always runs even if click() throws or popup closes early
    setTimeout(() => {
      try { document.body.removeChild(link); } catch (_e) { /* already removed */ }
      URL.revokeObjectURL(url);
    }, 100);
  }
}

/**
 * Step 1: User clicks "Clear Staging Area" — show confirmation dialog
 */
async function handleClearRequest() {
  if (isOperationInProgress) return;

  try {
    const data = await getStored();
    const count = data.length;

    if (count === 0) {
      showStatus('Staging area is already empty', 'info');
      return;
    }

    // Show count in the confirm dialog so user knows exactly what they're wiping
    if (clearConfirmCount) {
      clearConfirmCount.textContent =
        `This will remove ${count} staged bookmark${count !== 1 ? 's' : ''} from the extension.`;
    }

    if (clearConfirm) clearConfirm.hidden = false;
    if (clearCancelBtn) clearCancelBtn.focus();
  } catch (error) {
    console.error('[Popup] Error reading count for clear dialog:', error);
    showStatus('Could not read staging area', 'error');
  }
}

/**
 * Step 2a: User cancels — hide dialog
 */
function dismissClearConfirm() {
  if (clearConfirm) clearConfirm.hidden = true;
}

/**
 * Step 2b: User confirms — wipe ONLY extension storage, never browser bookmarks
 */
async function handleClearConfirmed() {
  dismissClearConfirm();

  if (isOperationInProgress) return;
  setOperationState(true);

  try {
    // Remove only the extension's own storage keys — browser bookmarks are untouched
    await browserAPI.storage.local.remove([STORAGE_KEY, METADATA_KEY]);
    await updateCount();
    showStatus('✓ Staging area cleared. Browser bookmarks are untouched.', 'success');
  } catch (error) {
    console.error('[Popup] Error clearing staging area:', error);
    showStatus(`Failed to clear: ${error.message}`, 'error');
  } finally {
    setOperationState(false);
  }
}

/**
 * Deduplicate bookmarks by URL
 */
function deduplicateBookmarks(bookmarks) {
  const seen = new Map();
  
  bookmarks.forEach(bookmark => {
    if (bookmark && bookmark.url && !seen.has(bookmark.url)) {
      seen.set(bookmark.url, bookmark);
    }
  });
  
  return Array.from(seen.values());
}
