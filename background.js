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
  DEBOUNCE_ALARM: 'notify_popup_debounce',
  DEBUG: false // Set to false for production
};

// Utility: Debug logging
function log(...args) {
  if (CONFIG.DEBUG) {
    console.log('[BookmarkSync]', new Date().toISOString(), ...args);
  }
}

// Utility: Error logging
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
 * Initialize extension with default data
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
 * Migrate from session storage to local storage (for users upgrading from v1)
 * storage.session is supported in Chrome MV3 (102+) and Firefox MV3 (115+)
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
  } catch (_error) {
    // Ignore errors - session storage might not be supported
    log('Session storage not available or migration not needed');
  }
}

/**
 * Set up periodic alarms — clear first to prevent duplicates on update
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
    } else if (alarm.name === CONFIG.DEBOUNCE_ALARM) {
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
browserAPI.bookmarks.onCreated.addListener((_id, bookmark) => {
  log('Bookmark created:', bookmark.title);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'created' });
});

browserAPI.bookmarks.onRemoved.addListener((id, _removeInfo) => {
  log('Bookmark removed:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'removed' });
});

browserAPI.bookmarks.onChanged.addListener((id, _changeInfo) => {
  log('Bookmark changed:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'changed' });
});

browserAPI.bookmarks.onMoved.addListener((id, _moveInfo) => {
  log('Bookmark moved:', id);
  debounceNotifyPopup({ type: 'bookmark-changed', action: 'moved' });
});

// MV3 NOTE: setTimeout is unreliable in service workers — the SW can be killed before
// the callback fires. We use a short-lived alarm instead, which survives SW termination.

/**
 * Debounce popup notifications using alarms (MV3-safe)
 */
function debounceNotifyPopup(message) {
  // Store the latest message so the alarm handler can read it
  browserAPI.storage.session?.set({ pendingNotify: message }).catch(() => {
    // storage.session not available (Firefox < 121) — fall back to direct notify
    notifyPopup(message);
  });

  // (Re)create a 1-second one-shot alarm — recreating resets the timer
  browserAPI.alarms.create(CONFIG.DEBOUNCE_ALARM, { delayInMinutes: 1 / 60 }); // ~1 second
}

/**
 * Handle the debounce alarm
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
 * Notify popup of events
 */
function notifyPopup(message) {
  browserAPI.runtime.sendMessage(message).catch(() => {
    // Popup might not be open, ignore error
  });
}

/**
 * Handle messages from popup — MV3 pattern: return a Promise directly
 */
browserAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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
  browserAPI.commands.onCommand.addListener((command) => {
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