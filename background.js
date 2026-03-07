/*
 * Bookmark Sync Offline - Complete freedom for your bookmarks
 * Copyright (C) 2025 Sumon Kayal
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Bookmark Sync Offline - Background Service Worker
 * Cross-browser compatible (Chrome, Edge, Firefox)
 * All critical issues fixed
 */

// Configuration
const CONFIG = {
  STORAGE_KEY: 'bookmarks_data',
  METADATA_KEY: 'sync_metadata',
  CLEANUP_ALARM: 'cleanup_alarm',
  DEBUG: false // Set to false for production
};

// Utility: Debug logging
function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[BookmarkSync]', new Date().toISOString(), ...args);
  }
}

/**
 * Log an error with a standardized BookmarkSync context label.
 * @param {string} context - Short label identifying where the error occurred (e.g., function or task name).
 * @param {*} error - The Error object or value to record; its message/stack will be included if present.
 */
function logError(context, error) {
  console.error(`[BookmarkSync] Error in ${context}:`, error);
}

// MV3-compliant API namespace.
// Both Chrome and Firefox MV3 expose the `chrome` namespace.
// Firefox also exposes `browser` (Promise-based), but `chrome` works on both.
const browserAPI = globalThis.browser ?? globalThis.chrome;

/**
 * Initialize extension on install/update
 */
browserAPI.runtime.onInstalled.addListener(async (details) => {
  log('Extension event:', details.reason);
  
  try {
    if (details.reason === 'install') {
      await initializeExtension();
    } else if (details.reason === 'update') {
      await migrateStorageIfNeeded();
    }
    
    await setupAlarms();
    
  } catch (error) {
    logError('onInstalled', error);
  }
});

/**
 * Store initial extension metadata in local storage.
 *
 * Writes an object under CONFIG.METADATA_KEY containing:
 * - `installedAt`: current timestamp in milliseconds,
 * - `version`: the extension manifest version,
 * - `totalSyncs`: initialized to 0.
 */
async function initializeExtension() {
  log('Initializing extension...');
  
  try {
    // Set initial metadata
    await browserAPI.storage.local.set({
      [CONFIG.METADATA_KEY]: {
        installedAt: Date.now(),
        version: browserAPI.runtime.getManifest().version,
        totalSyncs: 0
      }
    });
    
    log('Extension initialized successfully');
  } catch (error) {
    logError('initializeExtension', error);
  }
}

/**
 * Migrate stored extension data from session storage to local storage when present.
 *
 * Copies the value stored under CONFIG.STORAGE_KEY from session storage into local storage
 * and removes the key from session storage. If session storage is unavailable or the key
 * is not present, the function does nothing.
 */
async function migrateStorageIfNeeded() {
  try {
    // Check if old session storage data exists (for users upgrading from v1)
    if (browserAPI.storage.session) {
      const sessionData = await browserAPI.storage.session.get([CONFIG.STORAGE_KEY]);
      
      if (sessionData && sessionData[CONFIG.STORAGE_KEY]) {
        log('Migrating data from session to local storage...');
        
        // Copy to local storage
        await browserAPI.storage.local.set({
          [CONFIG.STORAGE_KEY]: sessionData[CONFIG.STORAGE_KEY]
        });
        
        // Clear session storage
        await browserAPI.storage.session.remove([CONFIG.STORAGE_KEY]);
        
        log('Migration complete');
      }
    }
  } catch (error) {
    // Ignore errors - session storage might not be supported
    log('Session storage not available or migration not needed');
  }
}

/**
 * Configure extension alarms for periodic maintenance, clearing any existing cleanup alarm first to avoid duplicate alarms.
 */
async function setupAlarms() {
  // Clear any existing alarm before recreating to avoid duplicates on extension update
  await browserAPI.alarms.clear(CONFIG.CLEANUP_ALARM);
  
  // Cleanup alarm (check every 24 hours)
  browserAPI.alarms.create(CONFIG.CLEANUP_ALARM, {
    periodInMinutes: 1440 // 24 hours
  });
  
  log('Alarms configured');
}

/**
 * Handle alarm events
 */
browserAPI.alarms.onAlarm.addListener(async (alarm) => {
  log('Alarm triggered:', alarm.name);
  
  try {
    if (alarm.name === CONFIG.CLEANUP_ALARM) {
      await performMaintenance();
    } else if (alarm.name === DEBOUNCE_ALARM) {
      await handleDebounceAlarm();
    }
  } catch (error) {
    logError(`alarm:${alarm.name}`, error);
  }
});

/**
 * Perform maintenance tasks
 */
async function performMaintenance() {
  try {
    log('Running maintenance...');
    
    // Get stored data
    const result = await browserAPI.storage.local.get([CONFIG.STORAGE_KEY, CONFIG.METADATA_KEY]);
    const data = result[CONFIG.STORAGE_KEY];
    const metadata = result[CONFIG.METADATA_KEY] || {};
    
    if (data && data.savedAt) {
      const age = Date.now() - data.savedAt;
      const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
      
      log(`Data is ${daysOld} days old`);
      
      // Update metadata
      metadata.lastMaintenance = Date.now();
      await browserAPI.storage.local.set({
        [CONFIG.METADATA_KEY]: metadata
      });
    }
    
    log('Maintenance complete');
  } catch (error) {
    logError('performMaintenance', error);
  }
}

/**
 * Listen to bookmark changes for auto-sync
 */
browserAPI.bookmarks.onCreated.addListener((id, bookmark) => {
  log('Bookmark created:', bookmark.title);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'created' });
});

browserAPI.bookmarks.onRemoved.addListener((id, removeInfo) => {
  log('Bookmark removed:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'removed' });
});

browserAPI.bookmarks.onChanged.addListener((id, changeInfo) => {
  log('Bookmark changed:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'changed' });
});

browserAPI.bookmarks.onMoved.addListener((id, moveInfo) => {
  log('Bookmark moved:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'moved' });
});

// MV3 NOTE: setTimeout is unreliable in service workers — the SW can be killed before
// the callback fires. We use a short-lived alarm instead, which survives SW termination.
const DEBOUNCE_ALARM = 'notify_popup_debounce';

/**
 * Queue a popup notification message and schedule a short debounce timer.
 *
 * Stores the provided message in session storage for the debounce handler to read and creates a ~1 second one-shot alarm; if session storage is unavailable, sends the message immediately. Recreating the alarm resets the debounce timer.
 * @param {any} message - Payload to deliver to the popup when the debounce timer fires.
 */
function debounceNotifyPopup(message) {
  // Store the latest message so the alarm handler can read it
  browserAPI.storage.session?.set({ pendingNotify: message }).catch(() => {
    // storage.session not available (Firefox < 121) — fall back to direct notify
    notifyPopup(message);
  });

  // (Re)create a 1-second one-shot alarm — recreating resets the timer
  browserAPI.alarms.create(DEBOUNCE_ALARM, { delayInMinutes: 1 / 60 }); // ~1 second
}

/**
 * Processes any queued popup notification created by the debounce mechanism.
 *
 * If a pending notification exists in session storage, removes it and delivers it to the popup.
 * If session storage is unavailable or an error occurs, the function silently does nothing.
 */
async function handleDebounceAlarm() {
  try {
    const result = await browserAPI.storage.session?.get('pendingNotify');
    const message = result?.pendingNotify;
    if (message) {
      await browserAPI.storage.session.remove('pendingNotify');
      notifyPopup(message);
    }
  } catch {
    // storage.session unavailable — nothing to do
  }
}

/**
 * Send a message to the extension popup.
 *
 * Sends `message` via the extension runtime; errors from the send are ignored
 * (for example when the popup is not open).
 * @param {any} message - The message payload to deliver to the popup.
 */
function notifyPopup(message) {
  browserAPI.runtime.sendMessage(message).catch(() => {
    // Popup might not be open, ignore error
  });
}

/**
 * Handle messages from popup — MV3 pattern: return a Promise directly
 */
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Message received:', message.type);

  const handle = async () => {
    if (message.type === 'get-metadata') {
      const result = await browserAPI.storage.local.get([CONFIG.METADATA_KEY]);
      return { success: true, metadata: result[CONFIG.METADATA_KEY] };
    } else if (message.type === 'update-metadata') {
      const result = await browserAPI.storage.local.get([CONFIG.METADATA_KEY]);
      const metadata = { ...result[CONFIG.METADATA_KEY], ...message.data };
      await browserAPI.storage.local.set({ [CONFIG.METADATA_KEY]: metadata });
      return { success: true };
    }
    return { success: false, error: 'Unknown message type' };
  };

  // MV3: return true AND call sendResponse to support both Chrome and Firefox
  handle()
    .then(sendResponse)
    .catch(error => {
      logError('message handler', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Required to keep the channel open for the async response
});

/**
 * Handle keyboard commands
 */
if (browserAPI.commands) {
  browserAPI.commands.onCommand.addListener(async (command) => {
    log('Command triggered:', command);
    
    // Commands are primarily handled by popup
    // Just notify popup to take action
    notifyPopup({ type: 'command', command: command });
  });
}

// Run maintenance and ensure alarms are alive on every browser start
browserAPI.runtime.onStartup.addListener(async () => {
  log('Browser started');
  await setupAlarms();
  await performMaintenance();
});

log('Background service worker loaded');