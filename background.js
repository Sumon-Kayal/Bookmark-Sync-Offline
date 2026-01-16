const STORAGE_KEY = 'bookmarks_data';
const TTL = 24 * 60 * 60 * 1000; /**
 * Removes temporary bookmark data from chrome.session storage if it is older than the configured TTL.
 *
 * Reads the entry under STORAGE_KEY from chrome.storage.session; if the entry exists and its
 * savedAt timestamp is more than TTL milliseconds in the past, the function removes STORAGE_KEY
 * from storage and logs "Temporary bookmark data expired".
 */

function cleanupExpired() {
  chrome.storage.session.get([STORAGE_KEY], res => {
    const entry = res[STORAGE_KEY];
    if (!entry) return;
    if (Date.now() - entry.savedAt > TTL) {
      chrome.storage.session.remove(STORAGE_KEY);
      console.log('Temporary bookmark data expired');
    }
  });
}

chrome.runtime.onStartup.addListener(cleanupExpired);

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('cleanup', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(a => a.name === 'cleanup' && cleanupExpired());