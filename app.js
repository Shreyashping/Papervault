/* ============================================================
   PaperVault — app.js
   Admin password: change ADMIN_PASSWORD below to whatever you want
   ============================================================ */

// ⚠️ CHANGE THIS to your own secret password
const ADMIN_PASSWORD = "papervault2024";

const SUPABASE_URL  = "https://kexjjrdvvakqwbmzvyka.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGpqcmR2dmFrcXdibXp2eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQxNDksImV4cCI6MjA4ODI4MDE0OX0.dNyIkoZpsMer5XHSp3izw3bsuw2Nc_ShwzRg6ytA1ec";

const HEADERS = {
  "apikey":        SUPABASE_ANON,
  "Authorization": "Bearer " + SUPABASE_ANON,
  "Content-Type":  "application/json",
  "Prefer":        "return=representation",
};

// ─── SUPABASE ────────────────────────────────────────────────

async function dbSelect() {
  const url = `${SUPABASE_URL}/rest/v1/papers?select=id,uploaded_at,title,category,paper_type,subject,year,filename,file_size&order=uploaded_at.desc`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbInsert(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/papers`, {
    method: "POST", headers: HEADERS, body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbGetFileData(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/papers?select=file_data&id=eq.${id}`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  const rows = await res.json();
  return rows[0]?.file_data || null;
}

async function dbDelete(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/papers?id=eq.${id}`, {
    method: "DELETE", headers: HEADERS,
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─── APP DATA ────────────────────────────────────────────────

const CATEGORIES = [
  { id: "class10",   label: "Class 10 Boards", icon: "📘", color: "#e8c547", desc: "CBSE / State Board" },
  { id: "class11",   label: "Class 11 Boards", icon: "📗", color: "#4ecb71", desc: "CBSE / State Board" },
  { id: "class12",   label: "Class 12 Boards", icon: "📕", color: "#e05c5c", desc: "CBSE / State Board" },
  { id: "jee_mains", label: "JEE Mains",       icon: "🔬", color: "#5b8dee", desc: "NTA Engineering"   },
  { id: "jee_adv",   label: "JEE Advanced",    icon: "⚗️", color: "#b05bee", desc: "IIT Entrance"      },
  { id: "neet",      label: "NEET",            icon: "🧬", color: "#ee8d5b", desc: "Medical Entrance"  },
];

const PAPER_TYPES = [
  { id: "past_papers",        label: "Past Papers",        icon: "📄" },
  { id: "sample_papers",      label: "Sample Papers",      icon: "🗂" },
  { id: "practice_questions", label: "Practice Questions", icon: "✏️" },
];

const SUBJECTS = {
  class10:   ["Mathematics", "Science", "Social Science", "English", "Hindi"],
  class11:   ["Physics", "Chemistry", "Mathematics", "Biology", "Economics", "Accountancy"],
  class12:   ["Physics", "Chemistry", "Mathematics", "Biology", "Economics", "Accountancy"],
  jee_mains: ["Full Paper", "Physics", "Chemistry", "Mathematics"],
  jee_adv:   ["Paper 1", "Paper 2", "Physics", "Chemistry", "Mathematics"],
  neet:      ["Full Paper", "Biology", "Physics", "Chemistry"],
};

// ─── STATE ───────────────────────────────────────────────────

let allPapers     = [];
let selectedCatId = null;
let activeSubTab  = "past_papers";
let selectedFile  = null;
let isAdmin       = false;

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Check if already logged in this session
  if (sessionStorage.getItem("pv_admin") === "true") {
    isAdmin = true;
    showAdminUI();
  }
  populateCategorySelect();
  fetchPapers();
});

// ─── ADMIN AUTH ──────────────────────────────────────────────

function handleUploadTabClick() {
  if (isAdmin) {
    switchTab("upload");
  } else {
    openAdminModal();
  }
}

function openAdminModal() {
  document.getElementById("admin-modal").style.display = "flex";
  document.getElementById("admin-password-input").value = "";
  document.getElementById("login-error").style.display = "none";
  setTimeout(() => document.getElementById("admin-password-input").focus(), 100);
}

function closeAdminModal() {
  document.getElementById("admin-modal").style.display = "none";
}

function attemptLogin() {
  const input = document.getElementById("admin-password-input").value;
  if (input === ADMIN_PASSWORD) {
    isAdmin = true;
    sessionStorage.setItem("pv_admin", "true");
    closeAdminModal();
    showAdminUI();
    switchTab("upload");
  } else {
    document.getElementById("login-error").style.display = "block";
    document.getElementById("admin-password-input").value = "";
    document.getElementById("admin-password-input").focus();
  }
}

function logoutAdmin() {
  isAdmin = false;
  sessionStorage.removeItem("pv_admin");
  hideAdminUI();
  switchTab("browse");
}

function showAdminUI() {
  document.getElementById("admin-status").style.display = "flex";
  document.getElementById("admin-status").style.alignItems = "center";
  document.getElementById("admin-status").style.gap = "8px";
}

function hideAdminUI() {
  document.getElementById("admin-status").style.display = "none";
}

// ─── TABS ────────────────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("tab-browse").style.display = tab === "browse" ? "block" : "none";
  document.getElementById("tab-upload").style.display = tab === "upload" ? "block" : "none";
}

function switchSubTab(sub) {
  activeSubTab = sub;
  document.querySelectorAll(".subtab-btn").forEach(b => b.classList.toggle("active", b.dataset.subtab === sub));
  document.getElementById("search-input").value = "";
  renderPapers();
}

// ─── FETCH ───────────────────────────────────────────────────

async function fetchPapers() {
  setCountLabel("Loading…");
  try {
    allPapers = await dbSelect();
    setCountLabel(allPapers.length + " paper" + (allPapers.length !== 1 ? "s" : "") + " archived");
    buildCategoryGrid();
    if (selectedCatId) renderPapers();
  } catch (e) {
    setCountLabel("Error loading");
    console.error(e);
  }
}

function setCountLabel(txt) {
  document.getElementById("paper-count-label").textContent = txt;
}

// ─── CATEGORY GRID ───────────────────────────────────────────

function countFor(catId, typeId) {
  return allPapers.filter(p => p.category === catId && (!typeId || p.paper_type === typeId)).length;
}

function buildCategoryGrid() {
  const grid = document.getElementById("category-grid");
  grid.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const total = countFor(cat.id);
    const card  = document.createElement("div");
    card.className = "cat-card fade-in";
    card.onclick   = () => openCategory(cat.id);

    const badgeBg  = total > 0 ? cat.color + "22" : "#1a1a22";
    const badgeBdr = total > 0 ? cat.color + "55" : "#2a2a38";
    const badgeCol = total > 0 ? cat.color         : "#555";

    const miniHtml = PAPER_TYPES.map(t => {
      const c = countFor(cat.id, t.id);
      return `<span class="cat-mini-badge" style="background:${cat.color}12;border-color:${cat.color}30;color:${c>0?cat.color:'#444'}">${t.icon} ${t.label}: ${c}</span>`;
    }).join("");

    card.innerHTML = `
      <div class="cat-card-bar" style="background:${cat.color}"></div>
      <div class="cat-card-top">
        <div>
          <div class="cat-icon">${cat.icon}</div>
          <div class="cat-name">${cat.label}</div>
          <div class="cat-desc">${cat.desc}</div>
        </div>
        <div class="cat-badge" style="background:${badgeBg};border-color:${badgeBdr};color:${badgeCol}">
          ${total} ${total===1?"paper":"papers"}
        </div>
      </div>
      <div class="cat-mini-counts">${miniHtml}</div>
      <div class="cat-cta" style="color:${cat.color}">Browse papers →</div>`;
    grid.appendChild(card);
  });
}

// ─── BROWSE ──────────────────────────────────────────────────

function openCategory(catId) {
  selectedCatId = catId;
  activeSubTab  = "past_papers";
  const cat = CATEGORIES.find(c => c.id === catId);
  document.getElementById("browse-home").style.display     = "none";
  document.getElementById("browse-category").style.display = "block";
  document.getElementById("cat-title-label").textContent   = cat.icon + "  " + cat.label;
  document.getElementById("search-input").value            = "";
  document.querySelectorAll(".subtab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.subtab === "past_papers"));
  renderPapers();
}

function backToHome() {
  selectedCatId = null;
  document.getElementById("browse-home").style.display     = "block";
  document.getElementById("browse-category").style.display = "none";
}

function renderPapers() {
  const cat      = CATEGORIES.find(c => c.id === selectedCatId);
  const query    = document.getElementById("search-input").value.toLowerCase().trim();
  const container= document.getElementById("papers-list");
  const typeInfo = PAPER_TYPES.find(t => t.id === activeSubTab);

  let list = allPapers.filter(p => p.category === selectedCatId && p.paper_type === activeSubTab);
  if (query) list = list.filter(p =>
    p.title.toLowerCase().includes(query) ||
    p.subject.toLowerCase().includes(query) ||
    String(p.year).includes(query)
  );

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-icon">${query?"🔍":typeInfo.icon}</div>
        <div class="empty-title">${query?"No matching papers":"No "+typeInfo.label+" yet"}</div>
        ${!query?`<div class="empty-hint">${isAdmin?"Upload "+typeInfo.label.toLowerCase()+" using the Upload tab!":"No papers available yet."}</div>`:""}
      </div>`;
    return;
  }

  container.innerHTML = "";
  const listDiv = document.createElement("div");
  listDiv.className = "papers-list fade-in";

  list.forEach(paper => {
    const card = document.createElement("div");
    card.className = "paper-card";
    const ext  = (paper.filename||"").split(".").pop().toLowerCase();
    const icon = ext==="pdf"?"📄":["png","jpg","jpeg"].includes(ext)?"🖼️":"📁";
    const date = new Date(paper.uploaded_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
    const size = paper.file_size ? (paper.file_size/1024/1024).toFixed(2)+" MB" : "";

    // Delete button only shown to admins
    const deleteBtn = isAdmin
      ? `<button class="btn-delete" onclick="deletePaper(${paper.id})">🗑</button>`
      : "";

    card.innerHTML = `
      <div class="paper-file-icon" style="background:${cat.color}18;border:1px solid ${cat.color}33">${icon}</div>
      <div class="paper-info">
        <div class="paper-title">${escHtml(paper.title)}</div>
        <div class="paper-meta">
          <span class="paper-subject-tag" style="background:${cat.color}18;color:${cat.color}">${escHtml(paper.subject)}</span>
          <span class="paper-meta-text">${escHtml(String(paper.year))}</span>
          ${size?`<span class="paper-meta-text">${size}</span>`:""}
          <span class="paper-meta-text">${date}</span>
        </div>
      </div>
      <div class="paper-actions">
        <button class="btn-view"
          onclick="viewPaper(${paper.id},'${escHtml(paper.filename)}')">👁 View</button>
        <button class="btn-download"
          style="background:${cat.color}18;border:1px solid ${cat.color}44;color:${cat.color}"
          onclick="downloadPaper(${paper.id},'${escHtml(paper.filename)}')">⬇ Download</button>
        ${deleteBtn}
      </div>`;
    listDiv.appendChild(card);
  });
  container.appendChild(listDiv);
}

// ─── VIEW / DOWNLOAD / DELETE ────────────────────────────────

async function viewPaper(id, filename) {
  try {
    const data = await dbGetFileData(id);
    if (!data) return alert("File not found.");
    const win = window.open();
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      win.document.write(`<html><body style="margin:0;background:#111">
        <embed src="${data}" type="application/pdf" width="100%" style="height:100vh"></body></html>`);
    } else {
      win.document.write(`<html><body style="margin:0;background:#111;display:flex;justify-content:center">
        <img src="${data}" style="max-width:100%"></body></html>`);
    }
  } catch (e) { alert("Could not load file: " + e.message); }
}

async function downloadPaper(id, filename) {
  try {
    const data = await dbGetFileData(id);
    if (!data) return alert("File not found.");
    const a = document.createElement("a");
    a.href = data; a.download = filename || "paper";
    a.click();
  } catch (e) { alert("Could not download: " + e.message); }
}

async function deletePaper(id) {
  if (!isAdmin) return;
  if (!confirm("Delete this paper? This cannot be undone.")) return;
  try {
    await dbDelete(id);
    allPapers = allPapers.filter(p => p.id !== id);
    setCountLabel(allPapers.length + " papers archived");
    buildCategoryGrid();
    renderPapers();
  } catch (e) { alert("Delete failed: " + e.message); }
}

// ─── UPLOAD ──────────────────────────────────────────────────

function populateCategorySelect() {
  const sel = document.getElementById("form-category");
  sel.innerHTML = `<option value="" disabled selected>Select exam type…</option>`;
  CATEGORIES.forEach(cat => {
    const o = document.createElement("option");
    o.value = cat.id; o.textContent = cat.icon + " " + cat.label;
    sel.appendChild(o);
  });
}

function onCategoryChange() {
  const catId = document.getElementById("form-category").value;
  const sub   = document.getElementById("form-subject");
  sub.innerHTML = `<option value="" disabled selected>Select subject…</option>`;
  (SUBJECTS[catId]||[]).forEach(s => {
    const o = document.createElement("option");
    o.value = s; o.textContent = s; sub.appendChild(o);
  });
  sub.disabled = false;
  checkUploadBtn();
}

function onFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert("File is too large. Maximum size is 5MB.");
    e.target.value = "";
    return;
  }
  selectedFile = file;
  document.getElementById("upload-zone-content").innerHTML = `
    <div class="upload-icon">📄</div>
    <div class="upload-zone-text" style="color:#4ecb71;font-weight:500">${escHtml(file.name)}</div>
    <div class="upload-zone-hint">${(file.size/1024/1024).toFixed(2)} MB — click to change</div>`;
  checkUploadBtn();
}

function checkUploadBtn() {
  const ok = document.getElementById("form-category").value &&
             document.getElementById("form-papertype").value &&
             document.getElementById("form-subject").value &&
             document.getElementById("form-year").value.trim() &&
             document.getElementById("form-title").value.trim() &&
             selectedFile;
  document.getElementById("upload-btn").disabled = !ok;
}

async function handleUpload() {
  if (!isAdmin) return;
  const category  = document.getElementById("form-category").value;
  const paperType = document.getElementById("form-papertype").value;
  const subject   = document.getElementById("form-subject").value;
  const year      = document.getElementById("form-year").value.trim();
  const title     = document.getElementById("form-title").value.trim();
  if (!category||!paperType||!subject||!year||!title||!selectedFile) return;

  const btn = document.getElementById("upload-btn");
  btn.disabled = true; btn.textContent = "⏳ Uploading…";
  hideMessages();
  showProgress(true);

  try {
    const fileData = await fileToBase64(selectedFile);
    setProgressBar(80, "Saving to database…");

    await dbInsert({
      title, category, paper_type: paperType,
      subject, year,
      filename:  selectedFile.name,
      file_size: selectedFile.size,
      file_data: fileData,
    });

    setProgressBar(100, "Done!");
    await fetchPapers();
    resetForm();
    showSuccess();
  } catch (e) {
    showError("Upload failed: " + e.message);
  }

  showProgress(false);
  btn.disabled = true;
  btn.textContent = "⬆ Upload Paper";
}

function resetForm() {
  document.getElementById("form-category").value   = "";
  document.getElementById("form-papertype").value  = "";
  document.getElementById("form-subject").value    = "";
  document.getElementById("form-subject").disabled = true;
  document.getElementById("form-year").value       = "";
  document.getElementById("form-title").value      = "";
  document.getElementById("file-input").value      = "";
  selectedFile = null;
  document.getElementById("upload-zone-content").innerHTML = `
    <div class="upload-icon">📁</div>
    <div class="upload-zone-text">Click to select file</div>
    <div class="upload-zone-hint">PDF, PNG, JPG — max 5MB</div>`;
}

function showProgress(v) { document.getElementById("upload-progress-wrap").style.display = v?"block":"none"; }
function setProgressBar(pct, label) {
  document.getElementById("progress-bar-fill").style.width = pct+"%";
  document.getElementById("progress-label").textContent    = label;
}
function showSuccess() {
  const el = document.getElementById("upload-success");
  el.style.display = "block";
  setTimeout(()=>{ el.style.display="none"; }, 4000);
}
function showError(msg) {
  const el = document.getElementById("upload-error");
  el.textContent = "❌ "+msg; el.style.display = "block";
}
function hideMessages() {
  document.getElementById("upload-success").style.display = "none";
  document.getElementById("upload-error").style.display   = "none";
}

// ─── UTILS ───────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result);
    r.onerror = () => rej(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
