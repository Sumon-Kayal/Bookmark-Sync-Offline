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

function init() {
  updateCount();
  pullBtn.onclick = pullFromBrowser;
  pushBtn.onclick = pushToBrowser;
  importBtn.onclick = () => fileInput.click();
  fileInput.onchange = importFile;
  exportJsonBtn.onclick = exportJSON;
  exportHtmlBtn.onclick = exportHTML;
}

function show(msg, type='info') {
  statusEl.textContent = msg;
  statusEl.className = `status show ${type}`;
  setTimeout(() => statusEl.classList.remove('show'), 4000);
}

function getStored() {
  return new Promise(r => chrome.storage.session.get([STORAGE_KEY], res => r(res[STORAGE_KEY]?.data || [])));
}

function saveStored(data) {
  return new Promise(r => chrome.storage.session.set({ [STORAGE_KEY]: { data, savedAt: Date.now() } }, r));
}

async function updateCount() {
  countEl.textContent = (await getStored()).length;
}

// ─── Browser → Extension ───
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

// ─── Extension → Browser ───
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

// ─── Import ───
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

function parseHTML(html) {
  const doc = new DOMParser().parseFromString(html,'text/html');
  return [...doc.querySelectorAll('a[href^="http"]')].map(a => ({ title:a.textContent||'(no title)', url:a.href, dateAdded:Date.now() }));
}

// ─── Export ───
async function exportJSON(){ download(JSON.stringify(await getStored(),null,2),'bookmarks.json','application/json'); }
async function exportHTML(){
  const d = await getStored();
  let h='<!DOCTYPE NETSCAPE-Bookmark-file-1><DL>';
  d.forEach(b=>h+=`<DT><A HREF="${b.url}">${b.title}</A>`);
  h+='</DL>';
  download(h,'bookmarks.html','text/html');
}

function download(c,n,t){ const b=new Blob([c],{type:t}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=n; a.click(); URL.revokeObjectURL(u); }

function dedupe(list){ const m=new Map(); list.forEach(b=>m.set(b.url,b)); return [...m.values()]; }