/* PaperVault app.js v4 — with Quiz System */
const ADMIN_PASSWORD = "papervault2024";
const SUPABASE_URL   = "https://kexjjrdvvakqwbmzvyka.supabase.co";
const SUPABASE_ANON  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtleGpqcmR2dmFrcXdibXp2eWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDQxNDksImV4cCI6MjA4ODI4MDE0OX0.dNyIkoZpsMer5XHSp3izw3bsuw2Nc_ShwzRg6ytA1ec";
const H = {"apikey":SUPABASE_ANON,"Authorization":"Bearer "+SUPABASE_ANON,"Content-Type":"application/json","Prefer":"return=representation"};

/* ── DB helpers ── */
async function dbQ(path,opts={}){const r=await fetch(SUPABASE_URL+"/rest/v1/"+path,{headers:H,...opts});if(!r.ok)throw new Error(await r.text());return r.status===204?null:r.json();}
const dbSelect  = ()=>dbQ("papers?select=id,uploaded_at,title,category,paper_type,subject,year,filename,file_size&order=uploaded_at.desc");
const dbInsert  = row=>dbQ("papers",{method:"POST",body:JSON.stringify(row)});
const dbGetFile = id=>dbQ(`papers?select=file_data&id=eq.${id}`).then(d=>d[0]?.file_data||null);
const dbDelete  = id=>dbQ(`papers?id=eq.${id}`,{method:"DELETE"});
const dbGetQs   = (cat,subj)=>dbQ(`quiz_questions?category=eq.${encodeURIComponent(cat)}&subject=eq.${encodeURIComponent(subj)}&order=id.asc`);
const dbAddQ    = row=>dbQ("quiz_questions",{method:"POST",body:JSON.stringify(row)});
const dbCountQs = ()=>dbQ("quiz_questions?select=id");
const dbSaveScore=row=>dbQ("quiz_scores",{method:"POST",body:JSON.stringify(row)});
const dbLeaderboard=(cat)=>dbQ("quiz_scores?select=username,category,subject,score,total,time_taken,created_at&order=score.desc,time_taken.asc&limit=50"+(cat?`&category=eq.${encodeURIComponent(cat)}`:""));

/* ── Data ── */
const CATEGORIES=[
  {id:"class10",  label:"Class 10 Boards",icon:"📘",color:"#a855f7",grad:"linear-gradient(135deg,#7c3aed,#a855f7)",desc:"CBSE / State Board"},
  {id:"class11",  label:"Class 11 Boards",icon:"📗",color:"#06b6d4",grad:"linear-gradient(135deg,#0891b2,#06b6d4)",desc:"CBSE / State Board"},
  {id:"class12",  label:"Class 12 Boards",icon:"📕",color:"#ec4899",grad:"linear-gradient(135deg,#db2777,#ec4899)",desc:"CBSE / State Board"},
  {id:"jee_mains",label:"JEE Mains",      icon:"🔬",color:"#3b82f6",grad:"linear-gradient(135deg,#2563eb,#3b82f6)",desc:"NTA Engineering"},
  {id:"jee_adv",  label:"JEE Advanced",   icon:"⚗️",color:"#f59e0b",grad:"linear-gradient(135deg,#d97706,#f59e0b)",desc:"IIT Entrance"},
  {id:"neet",     label:"NEET",           icon:"🧬",color:"#22c55e",grad:"linear-gradient(135deg,#16a34a,#22c55e)",desc:"Medical Entrance"},
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

/* ── State ── */
let allPapers=[],selectedCatId=null,activeSubTab="past_papers",selectedFile=null,isAdmin=false,currentPage="home";
let quizUsername=sessionStorage.getItem("pv_quiz_user")||"";
let quizQuestions=[],quizCurrent=0,quizScore=0,quizTimerInterval=null,quizTimeLeft=60,quizTimePerQ=60,quizAnswered=false,quizResults=[];
let quizStartTime=0;

/* ── INIT ── */
document.addEventListener("DOMContentLoaded",()=>{
  if(sessionStorage.getItem("pv_admin")==="true"){isAdmin=true;showAdminUI();}
  populateCategorySelect();populateQCategorySelect();
  fetchPapers();fetchQuizCount();
});

async function fetchPapers(){
  try{allPapers=await dbSelect();document.getElementById("stat-total").textContent=allPapers.length;
    buildCategoryGrid();buildRecentPreview();
    if(currentPage==="stats")buildStatsPage();
    if(currentPage==="recent")buildRecentPage();
    if(currentPage==="category")renderPapers();
  }catch(e){toast("Could not connect to database","error");}
}

async function fetchQuizCount(){
  try{const d=await dbCountQs();document.getElementById("stat-quiz").textContent=d.length;}catch(e){}
}

/* ── TOAST ── */
function toast(msg,type="info"){
  const icons={success:"✅",error:"❌",info:"ℹ️"};
  const el=document.createElement("div");el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById("toast-container").appendChild(el);
  setTimeout(()=>{el.classList.add("hide");setTimeout(()=>el.remove(),350);},3500);
}

/* ── ADMIN ── */
function handleUploadClick(){if(isAdmin)showPage("upload");else openAdminModal();}
function openAdminModal(){document.getElementById("admin-modal").style.display="flex";document.getElementById("admin-password-input").value="";document.getElementById("login-error").style.display="none";setTimeout(()=>document.getElementById("admin-password-input").focus(),100);}
function closeAdminModal(){document.getElementById("admin-modal").style.display="none";}
function attemptLogin(){
  const val=document.getElementById("admin-password-input").value;
  if(val===ADMIN_PASSWORD){isAdmin=true;sessionStorage.setItem("pv_admin","true");closeAdminModal();showAdminUI();showPage("upload");toast("Welcome back, Admin!","success");}
  else{document.getElementById("login-error").style.display="block";document.getElementById("admin-password-input").value="";document.getElementById("admin-password-input").focus();}
}
function logoutAdmin(){isAdmin=false;sessionStorage.removeItem("pv_admin");document.getElementById("admin-badge-wrap").style.display="none";showHome();toast("Logged out","info");}
function showAdminUI(){document.getElementById("admin-badge-wrap").style.display="flex";}

/* ── PAGE NAV ── */
const ALL_PAGES=["home","category","stats","recent","about","privacy","upload","quiz","quiz-active","quiz-results","leaderboard"];
function showPage(page){
  currentPage=page;
  ALL_PAGES.forEach(p=>{const el=document.getElementById("page-"+p);if(!el)return;el.style.display=p===page?"block":"none";if(p===page){el.classList.remove("fade-up");void el.offsetWidth;el.classList.add("fade-up");}});
  document.getElementById("hero-section").style.display=page==="home"?"block":"none";
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}
function showHome()   {showPage("home");buildCategoryGrid();buildRecentPreview();}
function showStats()  {showPage("stats");buildStatsPage();}
function showRecent() {showPage("recent");buildRecentPage();}
function showAbout()  {showPage("about");}
function showPrivacy(){showPage("privacy");}
function showLeaderboard(){showPage("leaderboard");populateLbFilter();loadLeaderboard();}

function openCategory(catId){
  selectedCatId=catId;activeSubTab="past_papers";
  const cat=CATEGORIES.find(c=>c.id===catId);
  document.getElementById("cat-page-eyebrow").textContent=cat.desc;
  document.getElementById("cat-page-title").textContent=cat.icon+"  "+cat.label;
  document.getElementById("search-input").value="";document.getElementById("sort-select").value="newest";
  const sub=document.getElementById("filter-subject");sub.innerHTML=`<option value="">All Subjects</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sub.appendChild(o);});
  document.querySelectorAll(".subtab-btn").forEach(b=>b.classList.toggle("active",b.dataset.subtab==="past_papers"));
  showPage("category");renderPapers();
}

/* ── CATEGORY GRID ── */
function countFor(catId,typeId){return allPapers.filter(p=>p.category===catId&&(!typeId||p.paper_type===typeId)).length;}
function buildCategoryGrid(){
  const grid=document.getElementById("category-grid");grid.innerHTML="";
  CATEGORIES.forEach((cat,i)=>{
    const total=countFor(cat.id);
    const card=document.createElement("div");card.className="cat-card fade-up";card.style.animationDelay=(i*0.07)+"s";card.onclick=()=>openCategory(cat.id);
    const chips=PAPER_TYPES.map(t=>{const c=countFor(cat.id,t.id);return`<span class="cat-type-chip ${c>0?"has-papers":""}">${t.icon} ${t.label} (${c})</span>`;}).join("");
    card.innerHTML=`<div class="cat-card-accent" style="background:${cat.grad}"></div>
      <div class="cat-card-glow" style="background:radial-gradient(ellipse at 50% 0%,${cat.color}18,transparent 70%)"></div>
      <div class="cat-card-top"><div class="cat-emoji">${cat.icon}</div>
      <div class="cat-total-badge" style="background:${cat.color}20;border-color:${cat.color}50;color:${cat.color}">${total} ${total===1?"paper":"papers"}</div></div>
      <div class="cat-name">${cat.label}</div><div class="cat-desc">${cat.desc}</div>
      <div class="cat-type-row">${chips}</div>
      <div class="cat-arrow" style="color:${cat.color}">Browse papers →</div>`;
    grid.appendChild(card);
  });
}

/* ── RECENT ── */
function buildRecentPreview(){
  const recent=allPapers.slice(0,5),sec=document.getElementById("recent-preview-section"),list=document.getElementById("recent-preview-list");
  if(!recent.length){sec.style.display="none";return;}
  sec.style.display="block";list.innerHTML="";recent.forEach(p=>list.appendChild(makeRecentCard(p)));
}
function buildRecentPage(){
  const list=document.getElementById("recent-full-list");list.innerHTML="";
  if(!allPapers.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">No papers yet</div></div>`;return;}
  allPapers.forEach(p=>list.appendChild(makeRecentCard(p)));
}
function makeRecentCard(paper){
  const cat=CATEGORIES.find(c=>c.id===paper.category);
  const ext=(paper.filename||"").split(".").pop().toLowerCase();
  const icon=ext==="pdf"?"📄":["png","jpg","jpeg"].includes(ext)?"🖼️":"📁";
  const card=document.createElement("div");card.className="recent-card";card.onclick=()=>openCategory(paper.category);
  card.innerHTML=`<div class="recent-icon">${icon}</div>
    <div class="recent-info"><div class="recent-title">${escHtml(paper.title)}</div>
    <div class="recent-meta">${escHtml(paper.subject)} · ${paper.year} · ${timeAgo(paper.uploaded_at)}</div></div>
    <span class="recent-cat" style="color:${cat?.color||"#888"};border-color:${cat?.color||"#333"}44">${cat?.label||paper.category}</span>`;
  return card;
}

/* ── STATS ── */
function buildStatsPage(){
  const grid=document.getElementById("stats-grid");
  const cards=[
    {num:allPapers.length,label:"Total Papers"},
    {num:CATEGORIES.filter(c=>countFor(c.id)>0).length,label:"Active Categories"},
    {num:allPapers.filter(p=>p.paper_type==="past_papers").length,label:"Past Papers"},
    {num:allPapers.filter(p=>p.paper_type==="sample_papers").length,label:"Sample Papers"},
    {num:allPapers.filter(p=>p.paper_type==="practice_questions").length,label:"Practice Sets"},
    {num:[...new Set(allPapers.map(p=>p.year))].length,label:"Years Covered"},
  ];
  grid.innerHTML="";
  cards.forEach((c,i)=>{const el=document.createElement("div");el.className="stat-card fade-up";el.style.animationDelay=(i*0.06)+"s";el.innerHTML=`<div class="stat-card-num">${c.num}</div><div class="stat-card-label">${c.label}</div>`;grid.appendChild(el);});
  const bd=document.getElementById("breakdown-list");bd.innerHTML="";
  CATEGORIES.forEach(cat=>{
    const t=countFor(cat.id);if(!t)return;
    const row=document.createElement("div");row.className="breakdown-row";
    const chips=PAPER_TYPES.map(tp=>{const c=countFor(cat.id,tp.id);if(!c)return"";return`<span class="breakdown-chip" style="background:${cat.color}18;border-color:${cat.color}44;color:${cat.color}">${tp.icon} ${tp.label}: ${c}</span>`;}).join("");
    row.innerHTML=`<div class="breakdown-name">${cat.icon} ${cat.label}</div><div class="breakdown-types">${chips}</div><div class="breakdown-total">${t}</div>`;
    bd.appendChild(row);
  });
}

/* ── SUBTAB / RENDER ── */
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
  if(!list.length){
    container.innerHTML=`<div class="empty-state fade-in"><div class="empty-icon">${query||subj?"🔍":typeInfo.icon}</div><div class="empty-title">${query||subj?"No matching papers":"No "+typeInfo.label+" yet"}</div>${!query&&!subj?`<div class="empty-hint">${isAdmin?"Upload papers using the button above.":"Check back soon!"}</div>`:""}</div>`;return;
  }
  container.innerHTML="";const listDiv=document.createElement("div");listDiv.className="papers-list fade-in";
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

/* ── VIEW / DOWNLOAD / DELETE ── */
async function viewPaper(id,filename){
  toast("Loading paper…","info");
  try{const data=await dbGetFile(id);if(!data)return toast("File not found","error");
    const win=window.open();const ext=(filename||"").split(".").pop().toLowerCase();
    if(ext==="pdf")win.document.write(`<html><body style="margin:0;background:#111"><embed src="${data}" type="application/pdf" width="100%" style="height:100vh"></body></html>`);
    else win.document.write(`<html><body style="margin:0;background:#111;display:flex;justify-content:center"><img src="${data}" style="max-width:100%"></body></html>`);
  }catch(e){toast("Could not load file","error");}
}
async function downloadPaper(id,filename){
  toast("Preparing download…","info");
  try{const data=await dbGetFile(id);if(!data)return toast("File not found","error");const a=document.createElement("a");a.href=data;a.download=filename||"paper";a.click();toast("Download started!","success");}
  catch(e){toast("Download failed","error");}
}
async function deletePaper(id){
  if(!isAdmin)return;if(!confirm("Delete this paper permanently?"))return;
  try{await dbDelete(id);allPapers=allPapers.filter(p=>p.id!==id);document.getElementById("stat-total").textContent=allPapers.length;buildCategoryGrid();renderPapers();toast("Paper deleted","success");}
  catch(e){toast("Delete failed","error");}
}

/* ── UPLOAD ── */
function populateCategorySelect(){
  const sel=document.getElementById("form-category");sel.innerHTML=`<option value="" disabled selected>Select exam…</option>`;
  CATEGORIES.forEach(cat=>{const o=document.createElement("option");o.value=cat.id;o.textContent=cat.icon+" "+cat.label;sel.appendChild(o);});
}
function onCategoryChange(){
  const catId=document.getElementById("form-category").value;
  const sub=document.getElementById("form-subject");sub.innerHTML=`<option value="" disabled selected>Select subject…</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sub.appendChild(o);});
  sub.disabled=false;checkUploadBtn();
}
function onFileSelect(e){
  const file=e.target.files[0];if(!file)return;
  if(file.size>5*1024*1024){toast("File exceeds 5MB limit","error");e.target.value="";return;}
  selectedFile=file;
  document.getElementById("upload-zone-content").innerHTML=`<div class="uz-icon">📄</div><div class="uz-text" style="color:var(--green);font-weight:600">${escHtml(file.name)}</div><div class="uz-hint">${(file.size/1024/1024).toFixed(2)} MB — click to change</div>`;
  checkUploadBtn();
}
function checkUploadBtn(){
  const ok=document.getElementById("form-category").value&&document.getElementById("form-papertype").value&&document.getElementById("form-subject").value&&document.getElementById("form-year").value.trim()&&document.getElementById("form-title").value.trim()&&selectedFile;
  document.getElementById("upload-btn").disabled=!ok;
}
async function handleUpload(){
  if(!isAdmin)return;
  const category=document.getElementById("form-category").value,paperType=document.getElementById("form-papertype").value,
    subject=document.getElementById("form-subject").value,year=document.getElementById("form-year").value.trim(),
    title=document.getElementById("form-title").value.trim();
  if(!category||!paperType||!subject||!year||!title||!selectedFile)return;
  const btn=document.getElementById("upload-btn");btn.disabled=true;btn.textContent="Uploading…";setProgress(true,30,"Reading file…");
  try{
    const fileData=await fileToBase64(selectedFile);setProgress(true,80,"Saving to cloud…");
    await dbInsert({title,category,paper_type:paperType,subject,year,filename:selectedFile.name,file_size:selectedFile.size,file_data:fileData});
    setProgress(true,100,"Done!");await fetchPapers();resetForm();toast("Paper uploaded!","success");setTimeout(()=>showHome(),1200);
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

/* ════════════════════════════════════════════════════════════
   QUIZ SYSTEM
   ════════════════════════════════════════════════════════════ */

/* ── Quiz Admin: Add Question ── */
function populateQCategorySelect(){
  const sel=document.getElementById("qform-category");if(!sel)return;
  sel.innerHTML=`<option value="" disabled selected>Select exam…</option>`;
  CATEGORIES.forEach(cat=>{const o=document.createElement("option");o.value=cat.id;o.textContent=cat.icon+" "+cat.label;sel.appendChild(o);});
}
function onQCategoryChange(){
  const catId=document.getElementById("qform-category").value;
  const sub=document.getElementById("qform-subject");sub.innerHTML=`<option value="" disabled selected>Select subject…</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sub.appendChild(o);});
  sub.disabled=false;checkQBtn();
}
function checkQBtn(){
  const ok=document.getElementById("qform-category").value&&document.getElementById("qform-subject").value&&
    document.getElementById("qform-question").value.trim()&&document.getElementById("qform-a").value.trim()&&
    document.getElementById("qform-b").value.trim()&&document.getElementById("qform-c").value.trim()&&
    document.getElementById("qform-d").value.trim()&&document.getElementById("qform-correct").value;
  const btn=document.getElementById("qform-btn");if(btn)btn.disabled=!ok;
}
async function handleAddQuestion(){
  if(!isAdmin)return;
  const row={category:document.getElementById("qform-category").value,subject:document.getElementById("qform-subject").value,
    question:document.getElementById("qform-question").value.trim(),
    option_a:document.getElementById("qform-a").value.trim(),option_b:document.getElementById("qform-b").value.trim(),
    option_c:document.getElementById("qform-c").value.trim(),option_d:document.getElementById("qform-d").value.trim(),
    correct:document.getElementById("qform-correct").value,
    explanation:document.getElementById("qform-explanation").value.trim(),
    source:document.getElementById("qform-source").value.trim()};
  const btn=document.getElementById("qform-btn");btn.disabled=true;btn.textContent="Saving…";
  try{
    await dbAddQ(row);
    ["qform-question","qform-a","qform-b","qform-c","qform-d","qform-explanation","qform-source"].forEach(id=>{document.getElementById(id).value="";});
    document.getElementById("qform-correct").value="";
    toast("Question added!","success");fetchQuizCount();checkQBtn();
  }catch(e){toast("Failed to add question: "+e.message,"error");}
  btn.disabled=false;btn.textContent="Add Question →";
}

/* ── Quiz Hub ── */
function showQuiz(){
  showPage("quiz");
  populateQuizCategorySelect();populateLbFilter();
  if(quizUsername){document.getElementById("quiz-login-wrap").style.display="none";document.getElementById("quiz-setup-wrap").style.display="block";document.getElementById("quiz-username-display").textContent=quizUsername;}
  else{document.getElementById("quiz-login-wrap").style.display="block";document.getElementById("quiz-setup-wrap").style.display="none";}
}
function setQuizUsername(){
  const val=document.getElementById("quiz-username-input").value.trim();
  if(val.length<3||val.length>24){document.getElementById("quiz-username-error").style.display="block";return;}
  quizUsername=val;sessionStorage.setItem("pv_quiz_user",val);
  document.getElementById("quiz-login-wrap").style.display="none";
  document.getElementById("quiz-setup-wrap").style.display="block";
  document.getElementById("quiz-username-display").textContent=val;
  document.getElementById("quiz-username-error").style.display="none";
  populateQuizCategorySelect();
}
function changeQuizUser(){quizUsername="";sessionStorage.removeItem("pv_quiz_user");document.getElementById("quiz-login-wrap").style.display="block";document.getElementById("quiz-setup-wrap").style.display="none";document.getElementById("quiz-username-input").value="";}
function populateQuizCategorySelect(){
  const sel=document.getElementById("quiz-category");if(!sel)return;
  sel.innerHTML=`<option value="" disabled selected>Select exam…</option>`;
  CATEGORIES.forEach(cat=>{const o=document.createElement("option");o.value=cat.id;o.textContent=cat.icon+" "+cat.label;sel.appendChild(o);});
}
function onQuizCategoryChange(){
  const catId=document.getElementById("quiz-category").value;
  const sub=document.getElementById("quiz-subject");sub.innerHTML=`<option value="" disabled selected>Select subject…</option>`;
  (SUBJECTS[catId]||[]).forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;sub.appendChild(o);});
  sub.disabled=false;checkStartBtn();
}
function checkStartBtn(){
  const ok=document.getElementById("quiz-category").value&&document.getElementById("quiz-subject").value;
  document.getElementById("quiz-start-btn").disabled=!ok;
}
async function generateAIQuestions(cat, subj, count) {
  const catObj = CATEGORIES.find(c => c.id === cat);
  const catLabel = catObj ? catObj.label : cat;

  const res = await fetch("/.netlify/functions/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category: catLabel, subject: subj, count })
  });

  if (!res.ok) throw new Error("AI generation failed: " + await res.text());
  return await res.json();
}

async function startQuiz(){
  const cat=document.getElementById("quiz-category").value;
  const subj=document.getElementById("quiz-subject").value;
  const count=parseInt(document.getElementById("quiz-count").value);
  quizTimePerQ=parseInt(document.getElementById("quiz-time").value);
  const btn=document.getElementById("quiz-start-btn");
  btn.disabled=true;btn.textContent="🧠 Generating questions…";
  document.getElementById("quiz-no-questions").style.display="none";

  // Show generating indicator
  const genDiv=document.getElementById("quiz-generating");
  if(genDiv)genDiv.style.display="flex";

  try{
    // Always generate fresh AI questions
    const aiQs = await generateAIQuestions(cat, subj, count);

    // Also try to mix in any real PYQs from DB
    let dbQs = [];
    try { dbQs = await dbGetQs(cat, subj) || []; } catch(e) {}

    // Merge: up to half from DB (real PYQs), rest from AI
    const maxDB = Math.floor(count / 2);
    const realQs = shuffle(dbQs).slice(0, maxDB);
    const aiSlice = shuffle(aiQs).slice(0, count - realQs.length);
    quizQuestions = shuffle([...realQs, ...aiSlice]);

    if(!quizQuestions.length){ toast("Could not generate questions","error"); return; }

    quizCurrent=0;quizScore=0;quizResults=[];quizStartTime=Date.now();
    const catObj=CATEGORIES.find(c=>c.id===cat);
    document.getElementById("qa-category-label").textContent=(catObj?.label||cat)+" · "+subj;
    if(genDiv)genDiv.style.display="none";
    showPage("quiz-active");loadQuestion();
  }catch(e){
    if(genDiv)genDiv.style.display="none";
    toast("Could not generate quiz: "+e.message,"error");
    console.error(e);
  }
  btn.disabled=false;btn.textContent="Start Quiz →";
}

/* ── Active Quiz ── */
function loadQuestion(){
  if(quizCurrent>=quizQuestions.length){endQuiz();return;}
  quizAnswered=false;
  const q=quizQuestions[quizCurrent];
  const total=quizQuestions.length;
  document.getElementById("qa-question-num").textContent=`Question ${quizCurrent+1} / ${total}`;
  document.getElementById("quiz-progress-fill").style.width=((quizCurrent/total)*100)+"%";
  document.getElementById("quiz-q-source").textContent=q.source?"📌 "+q.source:"📝 Quiz Question";
  document.getElementById("quiz-q-text").textContent=q.question;
  document.getElementById("quiz-explanation-box").style.display="none";
  const opts=document.getElementById("quiz-options");opts.innerHTML="";
  [["A",q.option_a],["B",q.option_b],["C",q.option_c],["D",q.option_d]].forEach(([letter,text])=>{
    const div=document.createElement("div");div.className="quiz-option";div.dataset.letter=letter;
    div.innerHTML=`<div class="quiz-option-letter">${letter}</div><span>${escHtml(text)}</span>`;
    div.onclick=()=>selectAnswer(letter);
    opts.appendChild(div);
  });
  startTimer(quizTimePerQ);
}

function selectAnswer(letter){
  if(quizAnswered)return;quizAnswered=true;clearInterval(quizTimerInterval);
  const q=quizQuestions[quizCurrent];
  const isCorrect=letter===q.correct;
  if(isCorrect)quizScore++;
  quizResults.push({question:q.question,chosen:letter,correct:q.correct,isCorrect,
    optionA:q.option_a,optionB:q.option_b,optionC:q.option_c,optionD:q.option_d,explanation:q.explanation});
  document.querySelectorAll(".quiz-option").forEach(el=>{
    el.classList.add("disabled");
    if(el.dataset.letter===q.correct)el.classList.add("correct");
    else if(el.dataset.letter===letter&&!isCorrect)el.classList.add("wrong");
  });
  const expBox=document.getElementById("quiz-explanation-box");
  const lbl=document.getElementById("qe-label");const txt=document.getElementById("qe-text");
  if(isCorrect){lbl.textContent="✅ Correct!";lbl.style.color="var(--green)";}
  else{lbl.textContent="❌ Incorrect";lbl.style.color="var(--red)";}
  txt.textContent=q.explanation||"The correct answer is "+q.correct+".";
  expBox.style.display="block";
  const nextBtn=expBox.querySelector(".quiz-next-btn");
  if(nextBtn)nextBtn.textContent=quizCurrent+1>=quizQuestions.length?"See Results →":"Next Question →";
}

function nextQuestion(){quizCurrent++;loadQuestion();}

function startTimer(seconds){
  quizTimeLeft=seconds;clearInterval(quizTimerInterval);
  const circle=document.getElementById("timer-circle");
  const circumference=113;
  updateTimerDisplay(seconds,seconds,circle,circumference);
  quizTimerInterval=setInterval(()=>{
    quizTimeLeft--;updateTimerDisplay(quizTimeLeft,seconds,circle,circumference);
    if(quizTimeLeft<=0){clearInterval(quizTimerInterval);if(!quizAnswered)timeOut();}
  },1000);
}

function updateTimerDisplay(left,total,circle,circ){
  document.getElementById("timer-display").textContent=left;
  const offset=circ-(circ*(left/total));
  circle.style.strokeDashoffset=offset;
  if(left<=10){circle.style.stroke="var(--red)";document.getElementById("timer-display").style.color="var(--red)";}
  else if(left<=20){circle.style.stroke="var(--amber)";document.getElementById("timer-display").style.color="var(--amber)";}
  else{circle.style.stroke="var(--violet2)";document.getElementById("timer-display").style.color="var(--violet2)";}
}

function timeOut(){
  quizAnswered=true;
  const q=quizQuestions[quizCurrent];
  quizResults.push({question:q.question,chosen:null,correct:q.correct,isCorrect:false,
    optionA:q.option_a,optionB:q.option_b,optionC:q.option_c,optionD:q.option_d,explanation:q.explanation});
  document.querySelectorAll(".quiz-option").forEach(el=>{
    el.classList.add("disabled");if(el.dataset.letter===q.correct)el.classList.add("reveal");
  });
  const expBox=document.getElementById("quiz-explanation-box");
  document.getElementById("qe-label").textContent="⏰ Time's Up!";
  document.getElementById("qe-label").style.color="var(--amber)";
  document.getElementById("qe-text").textContent=(q.explanation||"")+" Correct answer: "+q.correct;
  expBox.style.display="block";
}

async function endQuiz(){
  clearInterval(quizTimerInterval);
  const total=quizQuestions.length;const pct=Math.round((quizScore/total)*100);
  const timeTaken=Math.round((Date.now()-quizStartTime)/1000);
  try{await dbSaveScore({username:quizUsername,category:document.getElementById("qa-category-label").textContent.split("·")[0].trim(),subject:document.getElementById("qa-category-label").textContent.split("·")[1]?.trim()||"",score:quizScore,total,time_taken:timeTaken});}catch(e){console.warn("Score save failed",e);}
  showPage("quiz-results");
  let icon="🎉",title="Excellent!";
  if(pct<40){icon="😓";title="Keep Practising";}else if(pct<60){icon="🙂";title="Good Effort!";}else if(pct<80){icon="😊";title="Well Done!";}
  document.getElementById("results-icon").textContent=icon;
  document.getElementById("results-title").textContent=title;
  document.getElementById("results-score").textContent=quizScore+"/"+total;
  document.getElementById("results-stats").textContent=pct+"% correct · "+timeTaken+"s total";
  const list=document.getElementById("results-review-list");list.innerHTML="";
  quizResults.forEach((r,i)=>{
    const item=document.createElement("div");item.className="review-item "+(r.isCorrect?"correct":"wrong");
    const opts={"A":r.optionA,"B":r.optionB,"C":r.optionC,"D":r.optionD};
    const chosenText=r.chosen?r.chosen+". "+opts[r.chosen]:"Not answered";
    const correctText=r.correct+". "+opts[r.correct];
    item.innerHTML=`<div class="review-q">Q${i+1}. ${escHtml(r.question)}</div>
      <div class="review-ans" style="color:${r.isCorrect?"var(--green)":"var(--red)"}">Your answer: ${escHtml(chosenText)}</div>
      ${!r.isCorrect?`<div class="review-ans" style="color:var(--green)">Correct: ${escHtml(correctText)}</div>`:""}
      ${r.explanation?`<div class="review-exp">💡 ${escHtml(r.explanation)}</div>`:""}`;
    list.appendChild(item);
  });
}

/* ── Leaderboard ── */
function populateLbFilter(){
  const sel=document.getElementById("lb-filter-cat");if(!sel)return;
  sel.innerHTML=`<option value="">All Exams</option>`;
  CATEGORIES.forEach(cat=>{const o=document.createElement("option");o.value=cat.id;o.textContent=cat.label;sel.appendChild(o);});
}
async function loadLeaderboard(){
  const cat=document.getElementById("lb-filter-cat").value;
  const list=document.getElementById("leaderboard-list");
  list.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text3)">Loading…</div>`;
  try{
    const rows=await dbLeaderboard(cat);
    if(!rows||!rows.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No scores yet</div><div class="empty-hint">Be the first to complete a quiz!</div></div>`;return;}
    list.innerHTML="";
    rows.forEach((row,i)=>{
      const pct=Math.round((row.score/row.total)*100);
      const rankClass=i===0?"gold":i===1?"silver":i===2?"bronze":"";
      const el=document.createElement("div");el.className="lb-row fade-up";el.style.animationDelay=(i*0.04)+"s";
      el.innerHTML=`<div class="lb-rank ${rankClass}">${i+1}</div>
        <div><div class="lb-name">${escHtml(row.username)}</div><div class="lb-meta">${escHtml(row.category||"")} ${row.subject?"· "+escHtml(row.subject):""}</div></div>
        <div class="lb-score-wrap"><div class="lb-score">${row.score}/${row.total}</div><div class="lb-pct">${pct}% · ${row.time_taken}s</div></div>`;
      list.appendChild(el);
    });
  }catch(e){list.innerHTML=`<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Could not load leaderboard</div></div>`;}
}

/* ── UTILS ── */
function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error("Failed to read file"));r.readAsDataURL(file);});}
function escHtml(str){return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function timeAgo(dateStr){const diff=Date.now()-new Date(dateStr).getTime();const m=Math.floor(diff/60000);if(m<1)return"just now";if(m<60)return m+"m ago";const h=Math.floor(m/60);if(h<24)return h+"h ago";const d=Math.floor(h/24);if(d<30)return d+"d ago";return new Date(dateStr).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
