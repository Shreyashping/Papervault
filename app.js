/* PaperVault app.js v3 */
const ADMIN_PASSWORD = "papervault2024";
const SUPABASE_URL  = "https://kexjjrdvvakqwbmzvyka.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGpqcmR2dmFrcXdibXp2eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQxNDksImV4cCI6MjA4ODI4MDE0OX0.dNyIkoZpsMer5XHSp3izw3bsuw2Nc_ShwzRg6ytA1ec";
const HEADERS = {"apikey":SUPABASE_ANON,"Authorization":"Bearer "+SUPABASE_ANON,"Content-Type":"application/json","Prefer":"return=representation"};

async function dbSelect(){const r=await fetch(`${SUPABASE_URL}/rest/v1/papers?select=id,uploaded_at,title,category,paper_type,subject,year,filename,file_size&order=uploaded_at.desc`,{headers:HEADERS});if(!r.ok)throw new Error(await r.text());return r.json();}
async function dbInsert(row){const r=await fetch(`${SUPABASE_URL}/rest/v1/papers`,{method:"POST",headers:HEADERS,body:JSON.stringify(row)});if(!r.ok)throw new Error(await r.text());return r.json();}
async function dbGetFile(id){const r=await fetch(`${SUPABASE_URL}/rest/v1/papers?select=file_data&id=eq.${id}`,{headers:HEADERS});if(!r.ok)throw new Error(await r.text());const d=await r.json();return d[0]?.file_data||null;}
async function dbDelete(id){const r=await fetch(`${SUPABASE_URL}/rest/v1/papers?id=eq.${id}`,{method:"DELETE",headers:HEADERS});if(!r.ok)throw new Error(await r.text());}

const CATEGORIES=[
  {id:"class10",  label:"Class 10 Boards",icon:"📘",color:"#c9a84c",desc:"CBSE / State Board"},
  {id:"class11",  label:"Class 11 Boards",icon:"📗",color:"#4ecbb4",desc:"CBSE / State Board"},
  {id:"class12",  label:"Class 12 Boards",icon:"📕",color:"#e05c5c",desc:"CBSE / State Board"},
  {id:"jee_mains",label:"JEE Mains",      icon:"🔬",color:"#5b8dee",desc:"NTA Engineering"},
  {id:"jee_adv",  label:"JEE Advanced",   icon:"⚗️",color:"#b05bee",desc:"IIT Entrance"},
  {id:"neet",     label:"NEET",           icon:"🧬",color:"#ee8d5b",desc:"Medical Entrance"},
];
const PAPER_TYPES=[
  {id:"past_papers",label:"Past Papers",icon:"📄"},
  {id:"sample_papers",label:"Sample Papers",icon:"🗂"},
  {id:"practice_questions",label:"Practice Questions",icon:"✏️"},
];
const SUBJECTS={
  class10:["Mathematics","Science","Social Science","English","Hindi"],
  class11:["Physics","Chemistry","Mathematics","Biology","Economics","Accountancy"],
  class12:["Physics","Chemistry","Mathematics","Biology","Economics","Accountancy"],
  jee_mains:["Full Paper","Physics","Chemistry","Mathematics"],
  jee_adv:["Paper 1","Paper 2","Physics","Chemistry","Mathematics"],
  neet:["Full Paper","Biology","Physics","Chemistry"],
};

let allPapers=[],selectedCatId=null,activeSubTab="past_papers",selectedFile=null,isAdmin=false,currentPage="home";

document.addEventListener("DOMContentLoaded",()=>{
  if(sessionStorage.getItem("pv_admin")==="true"){isAdmin=true;showAdminUI();}
  populateCategorySelect();
  fetchPapers();
});

async function fetchPapers(){
  try{
    allPapers=await dbSelect();
    document.getElementById("stat-total").textContent=allPapers.length;
    buildCategoryGrid();buildRecentPreview();
    if(currentPage==="stats")buildStatsPage();
    if(currentPage==="recent")buildRecentPage();
    if(currentPage==="category")renderPapers();
  }catch(e){toast("Could not connect to database","error");console.error(e);}
}

function toast(msg,type="info"){
  const icons={success:"✅",error:"❌",info:"ℹ️"};
  const el=document.createElement("div");
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{el.classList.add("hide");setTimeout(()=>el.remove(),350);},3500);
}

function handleUploadClick(){if(isAdmin)showPage("upload");else openAdminModal();}
function openAdminModal(){document.getElementById("admin-modal").style.display="flex";document.getElementById("admin-password-input").value="";document.getElementById("login-error").style.display="none";setTimeout(()=>document.getElementById("admin-password-input").focus(),100);}
function closeAdminModal(){document.getElementById("admin-modal").style.display="none";}
function attemptLogin(){
  const val=document.getElementById("admin-password-input").value;
  if(val===ADMIN_PASSWORD){isAdmin=true;sessionStorage.setItem("pv_admin","true");closeAdminModal();showAdminUI();showPage("upload");toast("Welcome back, Admin!","success");}
  else{document.getElementById("login-error").style.display="block";document.getElementById("admin-password-input").value="";document.getElementById("admin-password-input").focus();}
}
function logoutAdmin(){isAdmin=false;sessionStorage.removeItem("pv_admin");document.getElementById("admin-badge-wrap").style.display="none";showHome();toast("Logged out","info");}
function showAdminUI(){const w=document.getElementById("admin-badge-wrap");w.style.display="flex";}

function showPage(page){
  currentPage=page;
  ["home","category","stats","recent","upload","about","privacy"].forEach(p=>{
    const el=document.getElementById("page-"+p);
    if(el){el.style.display=p===page?"block":"none";if(p===page){el.classList.remove("fade-up");void el.offsetWidth;el.classList.add("fade-up");}}
  });
  document.getElementById("hero-section").style.display=page==="home"?"block":"none";
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
}

function showHome(){showPage("home");buildCategoryGrid();buildRecentPreview();}
function showStats(){showPage("stats");buildStatsPage();}
function showRecent(){showPage("recent");buildRecentPage();}

function openCategory(catId){
  selectedCatId=catId;activeSubTab="past_papers";
  const cat=CATEGORIES.find(c=>c.id===catId);
  document.getElementById("cat-page-eyebrow").textContent=cat.desc;
  document.getElementById("cat-page-title").textContent=cat.icon+"  "+cat.label;
  document.getElementById("search-input").value="";
  document.getElementById("sort-select").value="newest";
  const subSel=document.getElementById("filter-subject");
  subSel.innerHTML=`<option value="">All Subjects</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;subSel.appendChild(o);});
  document.querySelectorAll(".subtab-btn").forEach(b=>b.classList.toggle("active",b.dataset.subtab==="past_papers"));
  showPage("category");renderPapers();
}

function countFor(catId,typeId){return allPapers.filter(p=>p.category===catId&&(!typeId||p.paper_type===typeId)).length;}

function buildCategoryGrid(){
  const grid=document.getElementById("category-grid");grid.innerHTML="";
  CATEGORIES.forEach((cat,i)=>{
    const total=countFor(cat.id);
    const card=document.createElement("div");
    card.className="cat-card fade-up";card.style.animationDelay=(i*0.07)+"s";
    card.onclick=()=>openCategory(cat.id);
    const badgeBg=total>0?cat.color+"20":"rgba(255,255,255,.05)";
    const badgeBdr=total>0?cat.color+"50":"rgba(255,255,255,.08)";
    const badgeCol=total>0?cat.color:"#5a5468";
    const chips=PAPER_TYPES.map(t=>{const c=countFor(cat.id,t.id);return`<span class="cat-type-chip ${c>0?"has-papers":""}">${t.icon} ${t.label} (${c})</span>`;}).join("");
    card.innerHTML=`<div class="cat-card-accent" style="background:linear-gradient(90deg,${cat.color},${cat.color}44)"></div>
      <div class="cat-card-top"><div class="cat-emoji">${cat.icon}</div>
      <div class="cat-total-badge" style="background:${badgeBg};border-color:${badgeBdr};color:${badgeCol}">${total} ${total===1?"paper":"papers"}</div></div>
      <div class="cat-name">${cat.label}</div><div class="cat-desc">${cat.desc}</div>
      <div class="cat-type-row">${chips}</div>
      <div class="cat-arrow" style="color:${cat.color}">Browse papers <span>→</span></div>`;
    grid.appendChild(card);
  });
}

function buildRecentPreview(){
  const recent=allPapers.slice(0,5);
  const sec=document.getElementById("recent-preview-section");
  const list=document.getElementById("recent-preview-list");
  if(recent.length===0){sec.style.display="none";return;}
  sec.style.display="block";list.innerHTML="";
  recent.forEach(p=>list.appendChild(makeRecentCard(p)));
}

function buildRecentPage(){
  const list=document.getElementById("recent-full-list");list.innerHTML="";
  if(allPapers.length===0){list.innerHTML=`<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No papers yet</div></div>`;return;}
  allPapers.forEach(p=>list.appendChild(makeRecentCard(p)));
}

function makeRecentCard(paper){
  const cat=CATEGORIES.find(c=>c.id===paper.category);
  const ext=(paper.filename||"").split(".").pop().toLowerCase();
  const icon=ext==="pdf"?"📄":["png","jpg","jpeg"].includes(ext)?"🖼️":"📁";
  const card=document.createElement("div");card.className="recent-card";
  card.onclick=()=>openCategory(paper.category);
  card.innerHTML=`<div class="recent-icon">${icon}</div>
    <div class="recent-info"><div class="recent-title">${escHtml(paper.title)}</div>
    <div class="recent-meta">${escHtml(paper.subject)} · ${paper.year} · ${timeAgo(paper.uploaded_at)}</div></div>
    <span class="recent-cat" style="color:${cat?.color||"#888"};border-color:${cat?.color||"#333"}44">${cat?.label||paper.category}</span>`;
  return card;
}

function buildStatsPage(){
  const grid=document.getElementById("stats-grid");
  const total=allPapers.length;
  const cats=CATEGORIES.filter(c=>countFor(c.id)>0).length;
  const pp=allPapers.filter(p=>p.paper_type==="past_papers").length;
  const sp=allPapers.filter(p=>p.paper_type==="sample_papers").length;
  const pq=allPapers.filter(p=>p.paper_type==="practice_questions").length;
  const yrs=[...new Set(allPapers.map(p=>p.year))].length;
  grid.innerHTML="";
  [{num:total,label:"Total Papers"},{num:cats,label:"Active Categories"},{num:pp,label:"Past Papers"},{num:sp,label:"Sample Papers"},{num:pq,label:"Practice Sets"},{num:yrs,label:"Years Covered"}]
  .forEach((c,i)=>{const el=document.createElement("div");el.className="stat-card fade-up";el.style.animationDelay=(i*0.06)+"s";el.innerHTML=`<div class="stat-card-num">${c.num}</div><div class="stat-card-label">${c.label}</div>`;grid.appendChild(el);});
  const bd=document.getElementById("breakdown-list");bd.innerHTML="";
  CATEGORIES.forEach(cat=>{
    const t=countFor(cat.id);if(t===0)return;
    const row=document.createElement("div");row.className="breakdown-row";
    const chips=PAPER_TYPES.map(tp=>{const c=countFor(cat.id,tp.id);if(c===0)return"";return`<span class="breakdown-chip" style="background:${cat.color}15;border-color:${cat.color}40;color:${cat.color}">${tp.icon} ${tp.label}: ${c}</span>`;}).join("");
    row.innerHTML=`<div class="breakdown-name">${cat.icon} ${cat.label}</div><div class="breakdown-types">${chips||'<span style="color:#5a5468;font-size:13px">No papers yet</span>'}</div><div class="breakdown-total">${t}</div>`;
    bd.appendChild(row);
  });
}

function switchSubTab(sub){
  activeSubTab=sub;
  document.querySelectorAll(".subtab-btn").forEach(b=>b.classList.toggle("active",b.dataset.subtab===sub));
  document.getElementById("search-input").value="";document.getElementById("filter-subject").value="";
  renderPapers();
}

function renderPapers(){
  const cat=CATEGORIES.find(c=>c.id===selectedCatId);
  const query=document.getElementById("search-input").value.toLowerCase().trim();
  const subj=document.getElementById("filter-subject").value;
  const sort=document.getElementById("sort-select").value;
  const container=document.getElementById("papers-list");
  const typeInfo=PAPER_TYPES.find(t=>t.id===activeSubTab);
  let list=allPapers.filter(p=>p.category===selectedCatId&&p.paper_type===activeSubTab);
  if(query)list=list.filter(p=>p.title.toLowerCase().includes(query)||p.subject.toLowerCase().includes(query)||String(p.year).includes(query));
  if(subj) list=list.filter(p=>p.subject===subj);
  if(sort==="oldest")   list=[...list].reverse();
  if(sort==="year_desc")list=[...list].sort((a,b)=>Number(b.year)-Number(a.year));
  if(sort==="year_asc") list=[...list].sort((a,b)=>Number(a.year)-Number(b.year));
  if(list.length===0){
    container.innerHTML=`<div class="empty-state fade-in"><div class="empty-icon">${query||subj?"🔍":typeInfo.icon}</div><div class="empty-title">${query||subj?"No matching papers":"No "+typeInfo.label+" yet"}</div>${!query&&!subj?`<div class="empty-hint">${isAdmin?"Upload papers using the Upload button.":"Check back soon!"}</div>`:""}</div>`;
    return;
  }
  container.innerHTML="";
  const listDiv=document.createElement("div");listDiv.className="papers-list fade-in";
  list.forEach(paper=>{
    const card=document.createElement("div");card.className="paper-card";
    const ext=(paper.filename||"").split(".").pop().toLowerCase();
    const icon=ext==="pdf"?"📄":["png","jpg","jpeg"].includes(ext)?"🖼️":"📁";
    const date=new Date(paper.uploaded_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
    const size=paper.file_size?(paper.file_size/1024/1024).toFixed(1)+" MB":"";
    const delBtn=isAdmin?`<button class="btn-del" onclick="deletePaper(${paper.id})">🗑</button>`:"";
    card.innerHTML=`<div class="paper-icon" style="background:${cat.color}18;border:1px solid ${cat.color}30">${icon}</div>
      <div class="paper-body"><div class="paper-title">${escHtml(paper.title)}</div>
      <div class="paper-meta"><span class="paper-tag" style="background:${cat.color}18;color:${cat.color}">${escHtml(paper.subject)}</span>
      <span class="paper-dim">${escHtml(String(paper.year))}</span>${size?`<span class="paper-dim">${size}</span>`:""}<span class="paper-dim">${date}</span></div></div>
      <div class="paper-actions">
        <button class="btn-view" onclick="viewPaper(${paper.id},'${escHtml(paper.filename)}')">👁 View</button>
        <button class="btn-dl" style="background:${cat.color}18;border:1px solid ${cat.color}44;color:${cat.color}" onclick="downloadPaper(${paper.id},'${escHtml(paper.filename)}')">⬇ Download</button>
        ${delBtn}</div>`;
    listDiv.appendChild(card);
  });
  container.appendChild(listDiv);
}

async function viewPaper(id,filename){
  toast("Loading paper…","info");
  try{const data=await dbGetFile(id);if(!data)return toast("File not found","error");
    const win=window.open();const ext=(filename||"").split(".").pop().toLowerCase();
    if(ext==="pdf"){win.document.write(`<html><head><title>${escHtml(filename)}</title></head><body style="margin:0;background:#111"><embed src="${data}" type="application/pdf" width="100%" style="height:100vh"></body></html>`);}
    else{win.document.write(`<html><head><title>${escHtml(filename)}</title></head><body style="margin:0;background:#111;display:flex;justify-content:center"><img src="${data}" style="max-width:100%"></body></html>`);}
  }catch(e){toast("Could not load file: "+e.message,"error");}
}

async function downloadPaper(id,filename){
  toast("Preparing download…","info");
  try{const data=await dbGetFile(id);if(!data)return toast("File not found","error");
    const a=document.createElement("a");a.href=data;a.download=filename||"paper";a.click();
    toast("Download started!","success");
  }catch(e){toast("Download failed: "+e.message,"error");}
}

async function deletePaper(id){
  if(!isAdmin)return;if(!confirm("Delete this paper permanently?"))return;
  try{await dbDelete(id);allPapers=allPapers.filter(p=>p.id!==id);document.getElementById("stat-total").textContent=allPapers.length;buildCategoryGrid();renderPapers();toast("Paper deleted","success");}
  catch(e){toast("Delete failed: "+e.message,"error");}
}

function populateCategorySelect(){
  const sel=document.getElementById("form-category");sel.innerHTML=`<option value="" disabled selected>Select exam…</option>`;
  CATEGORIES.forEach(cat=>{const o=document.createElement("option");o.value=cat.id;o.textContent=cat.icon+" "+cat.label;sel.appendChild(o);});
}

function onCategoryChange(){
  const catId=document.getElementById("form-category").value;
  const sub=document.getElementById("form-subject");
  sub.innerHTML=`<option value="" disabled selected>Select subject…</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sub.appendChild(o);});
  sub.disabled=false;checkUploadBtn();
}

function onFileSelect(e){
  const file=e.target.files[0];if(!file)return;
  if(file.size>5*1024*1024){toast("File exceeds 5MB limit","error");e.target.value="";return;}
  selectedFile=file;
  document.getElementById("upload-zone-content").innerHTML=`<div class="uz-icon">📄</div><div class="uz-text" style="color:#5ecb7a;font-weight:500">${escHtml(file.name)}</div><div class="uz-hint">${(file.size/1024/1024).toFixed(2)} MB — click to change</div>`;
  checkUploadBtn();
}

function checkUploadBtn(){
  const ok=document.getElementById("form-category").value&&document.getElementById("form-papertype").value&&document.getElementById("form-subject").value&&document.getElementById("form-year").value.trim()&&document.getElementById("form-title").value.trim()&&selectedFile;
  document.getElementById("upload-btn").disabled=!ok;
}

async function handleUpload(){
  if(!isAdmin)return;
  const category=document.getElementById("form-category").value;
  const paperType=document.getElementById("form-papertype").value;
  const subject=document.getElementById("form-subject").value;
  const year=document.getElementById("form-year").value.trim();
  const title=document.getElementById("form-title").value.trim();
  if(!category||!paperType||!subject||!year||!title||!selectedFile)return;
  const btn=document.getElementById("upload-btn");btn.disabled=true;btn.textContent="Uploading…";
  setProgress(true,30,"Reading file…");
  try{
    const fileData=await fileToBase64(selectedFile);
    setProgress(true,80,"Saving to cloud…");
    await dbInsert({title,category,paper_type:paperType,subject,year,filename:selectedFile.name,file_size:selectedFile.size,file_data:fileData});
    setProgress(true,100,"Done!");
    await fetchPapers();resetForm();toast("Paper uploaded successfully!","success");
    setTimeout(()=>showHome(),1200);
  }catch(e){toast("Upload failed: "+e.message,"error");}
  setProgress(false);btn.disabled=true;btn.textContent="Upload Paper →";
}

function resetForm(){
  ["form-category","form-papertype","form-year","form-title"].forEach(id=>{document.getElementById(id).value="";});
  document.getElementById("form-subject").value="";document.getElementById("form-subject").disabled=true;
  document.getElementById("file-input").value="";selectedFile=null;
  document.getElementById("upload-zone-content").innerHTML=`<div class="uz-icon">📁</div><div class="uz-text">Click or drag to upload</div><div class="uz-hint">Supports PDF, PNG, JPG up to 5MB</div>`;
  document.getElementById("upload-btn").disabled=true;
}

function setProgress(show,pct,label){
  document.getElementById("upload-progress-wrap").style.display=show?"block":"none";
  if(show){document.getElementById("progress-bar-fill").style.width=pct+"%";document.getElementById("progress-label").textContent=label||"";document.getElementById("progress-pct").textContent=pct+"%";}
}

function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("Failed to read file"));r.readAsDataURL(file);});}
function escHtml(str){return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function timeAgo(dateStr){const diff=Date.now()-new Date(dateStr).getTime();const m=Math.floor(diff/60000);if(m<1)return"just now";if(m<60)return m+"m ago";const h=Math.floor(m/60);if(h<24)return h+"h ago";const d=Math.floor(h/24);if(d<30)return d+"d ago";return new Date(dateStr).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});}

// ─── STATIC PAGES ────────────────────────────────────────────
function showAbout()   { showPage("about");   }
function showPrivacy() { showPage("privacy"); }
