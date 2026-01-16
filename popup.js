const STORAGE_KEY = 'bookmarks_data';

// UI Elements
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const fileInput = document.getElementById('fileInput');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (countEl) updateCount();
  
  // Button Listeners
  listen('pullBtn', pullFromBrowser);
  listen('pushBtn', pushToBrowser);
  listen('exportJsonBtn', exportJSON);
  listen('exportHtmlBtn', exportHTML);
  
  // Fix for Import: Open manager.html if in popup
  listen('importBtn', () => {
    chrome.tabs.create({ url: 'manager.html' });
  });

  // Handle file selection if we are on the manager page
  if (fileInput) {
    fileInput.onchange = importFile;
  }
});

function listen(id, fn) {
  const el = document.getElementById(id);
  if (el) el.onclick = fn;
}

// --- Logic Functions ---

async function getStored() {
  const res = await chrome.storage.session.get([STORAGE_KEY]);
  return res[STORAGE_KEY]?.data || [];
}

async function saveStored(data) {
  await chrome.storage.session.set({ 
    [STORAGE_KEY]: { data: dedupe(data), savedAt: Date.now() } 
  });
}

async function updateCount() {
  const data = await getStored();
  if (countEl) countEl.textContent = data.length;
}

function show(msg, type='info') {
  if (!statusEl) return alert(msg);
  statusEl.textContent = msg;
  statusEl.className = `status show ${type}`;
  setTimeout(() => statusEl.classList.remove('show'), 4000);
}

// --- Actions ---

 function pullFromBrowser() {
   chrome.bookmarks.getTree(async tree => {
     try {
       const list = [];
       function walk(n) {
         if (n.url) list.push({ title: n.title, url: n.url, dateAdded: n.dateAdded || Date.now() });
         if (n.children) n.children.forEach(walk);
       }
       walk(tree[0]);
       await saveStored(list);
       updateCount();
       show(`Pulled ${list.length} bookmarks`, 'success');
     } catch (err) {
       show('Error pulling bookmarks', 'error');
     }
   });
 }

async function pushToBrowser() {
  const staged = await getStored();
  if (!staged.length) return show('Nothing to sync', 'error');

  chrome.bookmarks.getTree(tree => {
    const existing = new Set();
    function walk(n) { if(n.url) existing.add(n.url); if(n.children) n.children.forEach(walk); }
    walk(tree[0]);

    const toAdd = staged.filter(b => !existing.has(b.url));
    if (!toAdd.length) return show('Already in sync', 'success');

     chrome.bookmarks.create({ title: 'Imported Bookmarks' }, folder => {
       if (chrome.runtime.lastError) {
         return show('Error creating bookmark folder', 'error');
       }
       toAdd.forEach(b => chrome.bookmarks.create({ parentId: folder.id, title: b.title, url: b.url }));
       show(`Added ${toAdd.length} bookmarks`, 'success');
     });

async function importFile(e) {
  const f = e.target.files[0];
  if (!f) return;

  const r = new FileReader();
  r.onload = async ev => {
    try {
      let data = f.name.endsWith('.json') 
        ? JSON.parse(ev.target.result) 
        : parseHTML(ev.target.result);
      
      await saveStored(data);
      show(`Imported ${data.length} bookmarks. You can close this tab.`, 'success');
      if (window.opener) window.opener.location.reload(); 
    } catch (err) {
      show('Error parsing file', 'error');
    }
  };
  r.readAsText(f);
}

function parseHTML(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('a[href^="http"]')].map(a => ({
    title: a.textContent || '(no title)',
    url: a.href,
    dateAdded: parseInt(a.getAttribute('ADD_DATE')) * 1000 || Date.now()
  }));
}

async function exportJSON() {
  const data = await getStored();
  download(JSON.stringify(data, null, 2), 'bookmarks.json', 'application/json');
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
 }

 async function exportHTML() {
   const d = await getStored();
   let h = `<!DOCTYPE NETSCAPE-Bookmark-file-1><TITLE>Bookmarks</TITLE><H1>Bookmarks</H1><DL><p>`;
   d.forEach(b => {
   h += `\n<DT><A HREF="${escapeHTML(b.url)}" ADD_DATE="${Math.floor(b.dateAdded/1000)}">${escapeHTML(b.title)}</A>`;
   });
   h += `\n</DL><p>`;
   download(h, 'bookmarks.html', 'text/html');
 }

function download(c, n, t) {
  const b = new Blob([c], { type: t });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = n;
  a.click();
  URL.revokeObjectURL(u);
}

function dedupe(list) {
  const m = new Map();
  list.forEach(b => m.set(b.url, b));
  return [...m.values()];
}