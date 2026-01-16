const STORAGE_KEY = 'bookmarks_data';

const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const pullBtn = document.getElementById('pullBtn');
const pushBtn = document.getElementById('pushBtn');
const importBtn = document.getElementById('importBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportHtmlBtn = document.getElementById('exportHtmlBtn');
const fileInput = document.getElementById('fileInput');

init();

/**
 * Initialize the popup UI by setting initial state and wiring button handlers.
 *
 * Calls updateCount() to refresh the displayed bookmark count and attaches
 * event handlers for pulling from the browser, pushing to the browser,
 * opening the file picker, handling file imports, and exporting JSON/HTML.
 */
function init() {
  updateCount();
  pullBtn.onclick = pullFromBrowser;
  pushBtn.onclick = pushToBrowser;
  importBtn.onclick = () => fileInput.click();
  fileInput.onchange = importFile;
  exportJsonBtn.onclick = exportJSON;
  exportHtmlBtn.onclick = exportHTML;
}

/**
 * Display a transient status message in the UI.
 * @param {string} msg - Message text to show.
 * @param {string} [type='info'] - Visual type/class to apply (e.g., "info", "success", "error").
 */
function show(msg, type='info') {
  statusEl.textContent = msg;
  statusEl.className = `status show ${type}`;
  setTimeout(() => statusEl.classList.remove('show'), 4000);
}

/**
 * Retrieve the stored bookmarks array from session storage.
 *
 * @returns {Array<Object>} The stored bookmarks (objects with `title`, `url`, and `dateAdded`), or an empty array if none are stored.
 */
function getStored() {
  return new Promise(r => chrome.storage.session.get([STORAGE_KEY], res => r(res[STORAGE_KEY]?.data || [])));
}

/**
 * Persist an array of bookmark objects to session storage under the extension storage key.
 * @param {Array<object>} data - Array of bookmarks to store; each bookmark should include at least `title`, `url`, and `dateAdded`.
 * @returns {Promise<void>} Resolves when the data has been written to storage.
 */
function saveStored(data) {
  return new Promise(r => chrome.storage.session.set({ [STORAGE_KEY]: { data, savedAt: Date.now() } }, r));
}

/**
 * Update the displayed bookmark count in the UI to match the number of stored bookmarks.
 */
async function updateCount() {
  countEl.textContent = (await getStored()).length;
}

/**
 * Pulls bookmarks from the browser's bookmark tree and stages them in session storage.
 *
 * Traverses the browser bookmark tree, extracts entries with `title`, `url`, and `dateAdded`
 * (using the current time if `dateAdded` is missing), deduplicates by URL, saves the resulting
 * list under the extension's storage key, updates the displayed bookmark count, and shows a
 * success message with the number of pulled bookmarks.
 */
function pullFromBrowser() {
  chrome.bookmarks.getTree(async tree => {
    const list = [];
    (function walk(n){
      if (n.url) list.push({ title:n.title, url:n.url, dateAdded:n.dateAdded||Date.now() });
      if (n.children) n.children.forEach(walk);
    })(tree[0]);

    await saveStored(dedupe(list));
    updateCount();
    show(`Pulled ${list.length} bookmarks`, 'success');
  });
}

/**
 * Adds staged bookmarks from extension storage into the browser's bookmarks, creating an "Imported Bookmarks" folder for any new entries.
 *
 * Loads bookmarks staged by the extension, skips URLs already present in the browser, creates a folder titled "Imported Bookmarks", and adds each missing bookmark under it. Shows a status message when there are no staged bookmarks, when everything is already in sync, or when bookmarks are added.
 */
async function pushToBrowser() {
  const staged = await getStored();
  if (!staged.length) return show('Nothing to sync', 'error');

  chrome.bookmarks.getTree(tree => {
    const existing = new Set();
    (function walk(n){ if(n.url) existing.add(n.url); if(n.children) n.children.forEach(walk); })(tree[0]);

    const toAdd = staged.filter(b => !existing.has(b.url));
    if (!toAdd.length) return show('Already in sync', 'success');

    chrome.bookmarks.create({ title:'Imported Bookmarks' }, folder => {
      toAdd.forEach(b => chrome.bookmarks.create({ parentId:folder.id, title:b.title, url:b.url }));
      show(`Added ${toAdd.length} bookmarks`, 'success');
    });
  });
}

/**
 * Import bookmarks from a selected file into session storage and update the UI.
 *
 * Parses the first selected file as JSON when the filename ends with `.json`, otherwise parses it as an HTML bookmarks file; deduplicates and saves the resulting bookmarks, updates the stored count, and displays a success message with the number of imported bookmarks.
 *
 * @param {Event} e - Change event from the file input element; the file to import is taken from `e.target.files[0]`.
 */
function importFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = async ev => {
    let data = f.name.endsWith('.json') ? JSON.parse(ev.target.result) : parseHTML(ev.target.result);
    await saveStored(dedupe(data));
    updateCount();
    show(`Imported ${data.length} bookmarks`, 'success');
  };
  r.readAsText(f);
  e.target.value = '';
}

/**
 * Extracts anchor elements with HTTP(S) URLs from an HTML string and returns them as bookmark objects.
 * @param {string} html - HTML content to scan for anchors.
 * @returns {{title: string, url: string, dateAdded: number}[]} An array of bookmark objects where `title` is the anchor text (or "(no title)"), `url` is the absolute href, and `dateAdded` is the timestamp in milliseconds.
 */
function parseHTML(html) {
  const doc = new DOMParser().parseFromString(html,'text/html');
  return [...doc.querySelectorAll('a[href^="http"]')].map(a => ({ title:a.textContent||'(no title)', url:a.href, dateAdded:Date.now() }));
}

/**
 * Trigger a download of the staged bookmarks as a pretty-printed JSON file named "bookmarks.json".
 *
 * Downloads the stored bookmarks with MIME type "application/json".
 */
async function exportJSON(){ download(JSON.stringify(await getStored(),null,2),'bookmarks.json','application/json'); }
/**
 * Export staged bookmarks as a Netscape-format HTML file and trigger its download.
 *
 * Builds an HTML bookmark file from stored bookmarks and starts a download named "bookmarks.html" with MIME type "text/html".
 */
async function exportHTML(){
  const d = await getStored();
  let h='<!DOCTYPE NETSCAPE-Bookmark-file-1><DL>';
  d.forEach(b=>h+=`<DT><A HREF="${b.url}">${b.title}</A>`);
  h+='</DL>';
  download(h,'bookmarks.html','text/html');
}

/**
 * Trigger a browser download for the provided content using the specified filename and MIME type.
 * @param {BlobPart|ArrayBuffer|ArrayBufferView|string} c - The file content to download.
 * @param {string} n - The filename to use for the downloaded file.
 * @param {string} t - The MIME type of the file (e.g., "application/json", "text/html").
 */
function download(c,n,t){ const b=new Blob([c],{type:t}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=n; a.click(); URL.revokeObjectURL(u); }

/**
 * Remove duplicate bookmarks from a list, keeping the last entry for each URL.
 *
 * @param {Array<Object>} list - Array of bookmark objects; each object must have a `url` property.
 * @returns {Array<Object>} An array of bookmarks with duplicate `url` values removed, preserving the last occurrence of each URL.
 */
function dedupe(list){ const m=new Map(); list.forEach(b=>m.set(b.url,b)); return [...m.values()]; }