/* My Invoice - app logic: screens, forms, saving, settings, backup.
   Load order in index.html: invoice-pdf.js first, then this file. */
const $=id=>document.getElementById(id);
const profileKey="myInvoiceProfileV5", dataKey="myInvoiceDataV5";
const today=()=>{let d=new Date();return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()};
let profile=JSON.parse(localStorage.getItem(profileKey)||"null")||{name:"",abn:"",address:"",phone:"",company:"",attn:"",client:"",rate:"",bank:"",branch:"",accountName:"",bsb:"",accountNumber:""};
let store=JSON.parse(localStorage.getItem(dataKey)||"null")||{prefix:"",nextNo:1,draft:null,invoices:[]};
let draft=store.draft||{prefix:"",invNo:store.nextNo,invDate:today(),periodFrom:"",periodTo:"",entries:[]};
let settingsReturn=null;
if(!draft.entries.length)draft.entries=[blankEntry()];

function persist(){store.draft=draft;localStorage.setItem(profileKey,JSON.stringify(profile));localStorage.setItem(dataKey,JSON.stringify(store))}
function show(id){
 if(id!=="settings")settingsReturn=null;
 document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
 $(id).classList.add("active");
 document.querySelectorAll(".nav button").forEach(b=>b.classList.remove("active"));
 if(["home"].includes(id))$("navHome").classList.add("active");
 if(["invoices"].includes(id))$("navInvoices").classList.add("active");
 if(["settings"].includes(id))$("navSettings").classList.add("active");
 if(id==="home"){resetNewBtn();$("homeContinue").style.display=hasDraftData()?"block":"none"}
 if(id==="invoices")renderInvoices();
 if(id==="settings"){loadSettings();$("rateNotice").style.display=settingsReturn?"block":"none"}
 if(id==="new")renderDraft();
 window.scrollTo(0,0);
}
function leaveSettings(){let t=settingsReturn||"home";settingsReturn=null;show(t)}
function pad2(n){return String(n).padStart(2,"0")}
function toISO(s){let m=/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec((s||"").trim());if(!m)return "";return (m[3].length===2?"20"+m[3]:m[3])+"-"+pad2(m[2])+"-"+pad2(m[1])}
function fromISO(v){let m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||"");return m?m[3]+"/"+m[2]+"/"+m[1]:""}
function addDay(s){let iso=toISO(s);if(!iso)return "";let d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+1);return pad2(d.getDate())+"/"+pad2(d.getMonth()+1)+"/"+d.getFullYear()}
function blankEntry(date){return {date:date||"",start:"",finish:"",breakMinutes:"",site:""}}
function isBlank(e){return !e.start&&!e.finish&&!e.site}
function hasDraftData(){return draft.entries.some(e=>e.date||e.start||e.finish||e.site||e.breakMinutes)||!!draft.periodFrom||!!draft.periodTo}
function badCount(){return draft.entries.filter(e=>!isBlank(e)&&entryHours(e)<=0).length}
function parseMinutes(t){
 if(t==null)return NaN;
 let m=/^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm|a|p)?$/.exec(String(t).trim().toLowerCase().replace(/\s+/g,""));
 if(!m)return NaN;
 let h=+m[1],mi=m[2]?+m[2]:0,ap=m[3];
 if(mi>59)return NaN;
 if(ap){if(h<1||h>12)return NaN;h=h%12+(ap[0]==="p"?12:0)}else if(h>23)return NaN;
 return h*60+mi
}
function toHHMM(t){let m=parseMinutes(t);return Number.isFinite(m)?pad2(Math.floor(m/60))+":"+pad2(m%60):""}
function entryHours(e){let a=parseMinutes(e.start),b=parseMinutes(e.finish),br=Number(e.breakMinutes);if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(br))return 0;let x=(b-a-br)/60;return x>0?x:0}
function money(x){return new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(x||0)}
function totalHours(){return draft.entries.reduce((s,e)=>s+entryHours(e),0)}
function totalAmount(){return totalHours()*(Number(profile.rate)||0)}
function renderDraft(){
 $("prefix").value=draft.prefix||"";$("invNo").value=draft.invNo||1;$("invDate").value=toISO(draft.invDate||today());$("periodFrom").value=toISO(draft.periodFrom);$("periodTo").value=toISO(draft.periodTo);
 $("entries").innerHTML="";
 draft.entries.forEach((e,i)=>{
 let div=document.createElement("div");div.className="entry";
 div.innerHTML=`<div class="entryhead"><b class="small">Entry ${i+1}</b><span class="entryactions"><button type="button" class="mini secondary" data-dup="${i}">Duplicate</button><button type="button" class="mini danger" data-del="${i}">Remove</button></span></div>
 <div class="entrygrid">
 <div><label>Date</label><input data-i="${i}" data-k="date" type="date" value="${toISO(e.date)}"></div>
 <div><label>Start Time</label><input data-i="${i}" data-k="start" type="time" value="${toHHMM(e.start)}"></div>
 <div><label>Break Time</label><div class="minutes"><input data-i="${i}" data-k="breakMinutes" type="number" min="0" step="1" inputmode="numeric" placeholder="30" value="${e.breakMinutes||""}"><span>min</span></div></div>
 <div><label>Finish Time</label><input data-i="${i}" data-k="finish" type="time" value="${toHHMM(e.finish)}"></div>
 <div class="site full"><label>Site Location</label><input data-i="${i}" data-k="site" placeholder="Enter site" value="${e.site||""}"></div>
 </div>`;
 $("entries").appendChild(div)
 });
 $("entries").querySelectorAll("input").forEach(x=>x.oninput=()=>{draft.entries[+x.dataset.i][x.dataset.k]=x.type==="date"?fromISO(x.value):x.value;persist();updateTotals()});
 $("entries").querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{let i=+b.dataset.del,e=draft.entries[i];if(!isBlank(e)&&!b.dataset.armed){b.dataset.armed="1";b.textContent="Tap to confirm";setTimeout(()=>{b.dataset.armed="";b.textContent="Remove"},4000);return}if(draft.entries.length>1)draft.entries.splice(i,1);else draft.entries[0]=blankEntry();persist();renderDraft()});
 $("entries").querySelectorAll("[data-dup]").forEach(b=>b.onclick=()=>{let i=+b.dataset.dup;draft.entries.splice(i+1,0,{...draft.entries[i],date:addDay(draft.entries[i].date)});persist();renderDraft()});
 $("prefix").oninput=()=>{draft.prefix=$("prefix").value;store.prefix=draft.prefix;persist()};
 $("invNo").oninput=()=>{draft.invNo=+$("invNo").value||1;persist()};
 $("invDate").oninput=()=>{draft.invDate=fromISO($("invDate").value);persist()};
 $("periodFrom").oninput=()=>{draft.periodFrom=fromISO($("periodFrom").value);if(draft.entries.length===1&&!draft.entries[0].date&&draft.periodFrom){draft.entries[0].date=draft.periodFrom;let d=document.querySelector('#entries [data-k="date"]');if(d)d.value=toISO(draft.periodFrom)}persist()};
 $("periodTo").oninput=()=>{draft.periodTo=fromISO($("periodTo").value);persist()};
 updateTotals()
}
function updateTotals(){$("sumHours").textContent=totalHours().toFixed(2);$("sumAmount").textContent=money(totalAmount())}
let newArmed=false,newTimer=null;
function resetNewBtn(){newArmed=false;clearTimeout(newTimer);$("homeNew").textContent="+ New Invoice"}
function flash(msg){let m=$("newMsg");m.textContent=msg;m.style.display="block";clearTimeout(flash.t);flash.t=setTimeout(()=>m.style.display="none",6000)}
$("homeNew").onclick=()=>{
 if(hasDraftData()&&!newArmed){newArmed=true;$("homeNew").textContent="Tap again to discard draft and start new";clearTimeout(newTimer);newTimer=setTimeout(resetNewBtn,5000);return}
 resetNewBtn();
 let pre=store.prefix||draft.prefix||(store.invoices[0]&&store.invoices[0].prefix)||"";
 draft={prefix:pre,invNo:store.nextNo,invDate:today(),periodFrom:"",periodTo:"",entries:[blankEntry()]};persist();show("new")
};
$("homeContinue").onclick=()=>show("new");
$("addEntry").onclick=()=>{let last=draft.entries[draft.entries.length-1];draft.entries.push(blankEntry(last&&last.date?addDay(last.date):(draft.periodFrom||"")));persist();renderDraft()};
$("review").onclick=()=>{
 if(!profile.rate){settingsReturn="new";alert("Please enter your hourly rate in Settings first. Your invoice is saved and you will come straight back to it.");show("settings");return}
 if(totalHours()<=0){flash("Add at least one work entry with a start time and finish time.");return}
 renderReview();show("reviewScreen")
};
function invoiceNumber(){return (draft.prefix||"")+(draft.prefix?"":"")+String(draft.invNo||1).padStart(3,"0")}
function renderReview(){
 $("rNo").textContent=invoiceNumber();$("rDate").textContent=draft.invDate;$("rPeriod").textContent=(draft.periodFrom||"—")+" – "+(draft.periodTo||"—");$("rCompany").textContent=profile.company||profile.client||"—";$("rAttn").textContent=profile.attn||"—";$("rHours").textContent=totalHours().toFixed(2);$("rTotal").textContent=money(totalAmount());
 let bad=badCount(),w=$("reviewWarn");
 w.style.display=bad?"block":"none";
 w.textContent=bad?(bad+(bad>1?" entries have":" entry has")+" missing or invalid times and will not be counted. Tap Back to fix "+(bad>1?"them.":"it.")):"";
 $("reviewEntries").innerHTML=draft.entries.filter(e=>!isBlank(e)).map(e=>{let h=entryHours(e);return `<div class="list-item"><div><b>${e.date||"No date"}</b><div class="small">${e.start?fmt12(e.start):"—"} – ${e.finish?fmt12(e.finish):"—"} • ${e.site||"No site"}</div></div><span class="pill${h>0?"":" bad"}">${h>0?h.toFixed(2)+" hrs • "+(e.breakMinutes||0)+" min break":"Check times"}</span></div>`}).join("")
}
$("generate").onclick=()=>{renderPreview();show("preview")};
function fmt12(t){let m=parseMinutes(t);if(!Number.isFinite(m))return t||"";let h=Math.floor(m/60)%24,mm=m%60;return String(h%12||12).padStart(2,"0")+":"+String(mm).padStart(2,"0")+" "+(h>=12?"PM":"AM")}
$("printPdf").onclick=savePdf;
$("saveInvoice").onclick=()=>{let inv={...draft,id:Date.now(),number:invoiceNumber(),hours:totalHours(),amount:totalAmount(),client:profile.client,company:profile.company||profile.client,attn:profile.attn||""};store.invoices.unshift(inv);store.nextNo=Math.max(store.nextNo,(Number(draft.invNo)||0)+1);draft={prefix:draft.prefix,invNo:store.nextNo,invDate:today(),periodFrom:"",periodTo:"",entries:[blankEntry()]};persist();alert("Invoice saved. A new invoice number is ready.");show("invoices")};
function renderInvoices(){
 if(!store.invoices.length){$("invoiceList").innerHTML='<div class="small">No saved invoices yet.</div>';return}
 $("invoiceList").innerHTML=store.invoices.map((i,idx)=>`<div class="list-item"><div><b>${i.number}</b><div class="small">${i.company||i.client||""}${i.attn?` • Attn: ${i.attn}`:""} • ${i.invDate} • ${Number(i.hours).toFixed(2)} hrs</div></div><span class="pill">${money(i.amount)}</span></div>`).join("")
}
function loadSettings(){let map={sName:"name",sAbn:"abn",sAddress:"address",sPhone:"phone",sCompany:"company",sAttn:"attn",sRate:"rate",sBank:"bank",sBranch:"branch",sAccountName:"accountName",sBsb:"bsb",sAccountNumber:"accountNumber"};for(let id in map)$(id).value=profile[map[id]]||""}
$("saveSettings").onclick=()=>{profile={name:$("sName").value,abn:$("sAbn").value,address:$("sAddress").value,phone:$("sPhone").value,company:$("sCompany").value,attn:$("sAttn").value,client:profile.client||"",rate:$("sRate").value,bank:$("sBank").value,branch:$("sBranch").value,accountName:$("sAccountName").value,bsb:$("sBsb").value,accountNumber:$("sAccountNumber").value};persist();alert("Settings saved on this phone.");if(settingsReturn&&profile.rate){let t=settingsReturn;settingsReturn=null;show(t)}};
$("backup").onclick=()=>{let backup={version:5,created:new Date().toISOString(),profile,store};let blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="My-Invoice-Backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("restoreBtn").onclick=()=>$("restoreFile").click();
$("restoreFile").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let b=JSON.parse(r.result);if(!b.profile||!b.store)throw Error();profile=b.profile;store=b.store;draft=store.draft||draft;persist();loadSettings();alert("Backup restored successfully.");}catch(err){alert("That backup file is not valid.")}};r.readAsText(f)};
show("home");

/* offline support */
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
