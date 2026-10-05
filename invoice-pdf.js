/* My Invoice - PDF writer and on-screen preview.
   Draws the invoice once (buildInvoiceModel) and renders it two ways: a real PDF file and the preview on screen.
   To change how the invoice looks, edit buildInvoiceModel() only.
   Needs these from app.js at run time: profile, draft, invoiceNumber, entryHours, totalHours, totalAmount, money, fmt12, $ */
/* ---- built-in PDF writer (works offline, no libraries) ---- */
const HW=[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584],HB=[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
function pdfEnc(s){return String(s==null?"":s).replace(/\u2013/g,"\x96").replace(/\u2014/g,"\x97").replace(/\u00a0/g," ").replace(/[^\x20-\x7e\x96\x97]/g,"?")}
function pdfEsc(s){return pdfEnc(s).replace(/[\\()]/g,"\\$&")}
function pdfW(s,b,sz){let w=0,t=b?HB:HW;for(const ch of pdfEnc(s)){let c=ch.charCodeAt(0);w+=c===0x96?556:c===0x97?1000:t[c-32]}return w*sz/1000}
function buildInvoiceModel(){
 const W=595.28,H=841.89,M=40,R=W-M,BOTTOM=80;
 const hx=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255);
 const INK=hx("#1F2328"),SLATE=hx("#3B4651"),MUTE=hx("#6A737D"),RULE=hx("#C9CED4"),HAIR=hx("#E1E4E8"),FILL=hx("#F1F3F5");
 let pages=[],ops;
 const newPage=()=>{ops=[];pages.push(ops)};
 const rect=(x,y,w,h,o={})=>ops.push({k:"rect",x,y,w,h,fill:o.fill||null,stroke:o.stroke||null,lw:o.lw||.6});
 const line=(x1,y1,x2,y2,c,lw)=>ops.push({k:"line",x1,y1,x2,y2,c,lw});
 const text=(x,y,s,o={})=>{let b=!!o.b,sz=o.size||9;if(o.max)while(pdfW(s,b,sz)>o.max&&sz>6)sz-=.5;ops.push({k:"text",x,y,s:String(s==null?"":s),b,sz,c:o.color||INK,al:o.align||"l"})};
 const rate=Number(profile.rate)||0,no=invoiceNumber();
 const period=(draft.periodFrom||"—")+" – "+(draft.periodTo||"—");
 newPage();
 /* header */
 const top=H-48;
 text(M,top-14,"INVOICE",{b:1,size:20});
 const gx=R-230;
 [["Invoice No.",no],["Invoice Date",draft.invDate||"—"],["Invoice Period",period]].forEach((r,i)=>{let yy=top+8-(i+1)*22;rect(gx,yy,92,22,{fill:FILL,stroke:RULE});rect(gx+92,yy,138,22,{stroke:RULE});text(gx+8,yy+7,r[0],{size:8.5,color:MUTE});text(gx+100,yy+7,r[1],{b:1,size:9.5,max:124})});
 const hy=top-66;line(M,hy,R,hy,SLATE,1.6);
 /* parties */
 const by=hy-22,bh=90,gap=16,bw=(R-M-gap)/2;
 const party=(x,title,lines)=>{rect(x,by-bh,bw,bh,{stroke:RULE});rect(x,by-20,bw,20,{fill:FILL,stroke:RULE});text(x+10,by-14,title,{b:1,size:8,color:SLATE});lines.forEach((s,j)=>text(x+10,by-38-j*13,s,{b:1,size:9.5,max:bw-20}))};
 party(M,"SUPPLIER",[profile.name,profile.abn?"ABN "+profile.abn:"",profile.address,profile.phone].filter(Boolean));
 party(M+bw+gap,"BILL TO",[profile.company||profile.client||"—","Attn: "+(profile.attn||"—")]);
 /* table */
 const tw=R-M,hh=22,rw=24,sc=tw/515;
 const widths=[62,62,62,62,90,55,65,57].map(w=>w*sc);
 const names=["Date","Start Time","Break Time","Finish Time","Site Location","Hours","Rate","NET"];
 const centers=[];{let x=M;widths.forEach(w=>{centers.push(x+w/2);x+=w})}
 const rows=draft.entries.filter(e=>entryHours(e)>0).map(e=>[[e.date||"",1],[fmt12(e.start)],[(e.breakMinutes||0)+" min"],[fmt12(e.finish)],[e.site||""],[entryHours(e).toFixed(2),1],[money(rate)+"/hr"],[money(entryHours(e)*rate),1]]);
 let y=by-bh-28,i=0;
 while(i<rows.length||i===0){
  let fit=Math.floor((y-BOTTOM-hh)/rw);
  if(fit<1){newPage();y=H-60;continue}
  let n=Math.min(fit,rows.length-i);
  rect(M,y-hh,tw,hh,{fill:FILL});line(M,y-hh,R,y-hh,SLATE,1.2);
  names.forEach((nm,k)=>text(centers[k],y-hh/2-2.8,nm,{b:1,size:8,color:SLATE,align:"c"}));
  for(let r=0;r<n;r++){let top2=y-hh-r*rw,yy=top2-rw;if(r<n-1)line(M,yy,R,yy,HAIR,.6);rows[i+r].forEach((c,k)=>text(centers[k],yy+rw/2-3.2,c[0],{b:c[1],size:9,align:"c",max:widths[k]-4}))}
  rect(M,y-hh-n*rw,tw,hh+n*rw,{stroke:RULE});
  y-=hh+n*rw;i+=n;
  if(i<rows.length){newPage();y=H-60}else break;
 }
 /* totals */
 if(y-24-66<BOTTOM){newPage();y=H-60}
 const tx=R-230,y0=y-24;
 [["Total Hours",totalHours().toFixed(2)],["Subtotal",money(totalAmount())],["Total",money(totalAmount())]].forEach((r,k)=>{let yy=y0-(k+1)*22,g=k===2;rect(tx,yy,230,22,{fill:g?FILL:null,stroke:RULE});text(tx+10,yy+7,r[0],{b:g,size:g?10:9.5,color:g?INK:MUTE});text(R-10,yy+7,r[1],{b:1,size:g?11:9.5,align:"r"})});
 line(tx,y0-44,R,y0-44,SLATE,1.2);
 /* payment details */
 const left=[["Bank Name",profile.bank],["Branch Address",profile.branch]].filter(r=>r[1]);
 const right=[["Account Name",profile.accountName],["BSB",profile.bsb],["Account Number",profile.accountNumber]].filter(r=>r[1]);
 const nr=Math.max(left.length,right.length,1),ph=20+nr*24;
 let py=y0-66-34;
 if(py-ph<BOTTOM){newPage();py=H-60}
 rect(M,py-ph,tw,ph,{stroke:RULE});rect(M,py-20,tw,20,{fill:FILL,stroke:RULE});
 text(M+10,py-14,"PAYMENT DETAILS",{b:1,size:8,color:SLATE});
 line(M+tw/2,py-ph,M+tw/2,py-20,HAIR,.6);
 for(let r=1;r<nr;r++)line(M,py-20-r*24,R,py-20-r*24,HAIR,.6);
 [left,right].forEach((colr,c)=>colr.forEach((r,k)=>{let x0=M+c*tw/2,yy=py-20-(k+1)*24;text(x0+10,yy+9,r[0],{b:1,size:8.5,color:SLATE});text(x0+98,yy+9,r[1],{b:1,size:9.5,max:tw/2-108})}));
 /* footer on every page */
 pages.forEach((pg,k)=>{ops=pg;line(M,52,R,52,RULE,.6);text(M,38,(profile.name||"")+(profile.abn?"  |  ABN "+profile.abn:""),{size:8,color:MUTE});text(R,38,"Invoice "+no+"  |  Page "+(k+1)+" of "+pages.length,{size:8,color:MUTE,align:"r"})});
 return {W,H,pages}
}
const pf=n=>(+n).toFixed(2),pcol=(c,k)=>c.map(pf).join(" ")+(k?" RG":" rg");
function opPdf(o){
 if(o.k==="rect"){let s="";if(o.fill)s+=pcol(o.fill)+"\n";if(o.stroke)s+=pcol(o.stroke,1)+" "+o.lw+" w\n";return s+pf(o.x)+" "+pf(o.y)+" "+pf(o.w)+" "+pf(o.h)+" re "+(o.fill&&o.stroke?"B":o.fill?"f":"S")}
 if(o.k==="line")return pcol(o.c,1)+" "+o.lw+" w "+pf(o.x1)+" "+pf(o.y1)+" m "+pf(o.x2)+" "+pf(o.y2)+" l S";
 let w=pdfW(o.s,o.b,o.sz),x=o.al==="c"?o.x-w/2:o.al==="r"?o.x-w:o.x;
 return "BT /"+(o.b?"F2":"F1")+" "+pf(o.sz)+" Tf "+pcol(o.c)+" "+pf(x)+" "+pf(o.y)+" Td ("+pdfEsc(o.s)+") Tj ET"
}
function buildInvoicePdf(){
 const m=buildInvoiceModel(),W=m.W,H=m.H,pages=m.pages.map(pg=>pg.map(opPdf));
 const no=invoiceNumber();
 let objs=[];
 objs[1]="<</Type/Catalog/Pages 2 0 R>>";
 objs[2]="<</Type/Pages/Kids["+pages.map((_,k)=>(7+2*k)+" 0 R").join(" ")+"]/Count "+pages.length+">>";
 objs[3]="<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>";
 objs[4]="<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>";
 objs[5]="<</Title("+pdfEsc("Invoice "+no)+")/Author("+pdfEsc(profile.name||"")+")>>";
 pages.forEach((pg,k)=>{let st=pg.join("\n");objs[6+2*k]="<</Length "+st.length+">>\nstream\n"+st+"\nendstream";objs[7+2*k]="<</Type/Page/Parent 2 0 R/MediaBox[0 0 "+W+" "+H+"]/Resources<</Font<</F1 3 0 R/F2 4 0 R>>>>/Contents "+(6+2*k)+" 0 R>>"});
 let out="%PDF-1.4\n",offs=[];
 for(let k=1;k<objs.length;k++){offs[k]=out.length;out+=k+" 0 obj\n"+objs[k]+"\nendobj\n"}
 let xr=out.length;
 out+="xref\n0 "+objs.length+"\n0000000000 65535 f \n"+offs.slice(1).map(o=>String(o).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<</Size "+objs.length+"/Root 1 0 R/Info 5 0 R>>\nstartxref\n"+xr+"\n%%EOF";
 return Uint8Array.from(out,c=>c.charCodeAt(0)&255)
}
/* ---- on-screen preview: draws the very same pages as the PDF ---- */
const svgRgb=c=>"rgb("+c.map(v=>Math.round(v*255)).join(",")+")";
const svgEsc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/ /g,"\u00a0");
function opSvg(o,H){
 if(o.k==="rect")return `<rect x="${pf(o.x)}" y="${pf(H-o.y-o.h)}" width="${pf(o.w)}" height="${pf(o.h)}" fill="${o.fill?svgRgb(o.fill):"none"}"${o.stroke?` stroke="${svgRgb(o.stroke)}" stroke-width="${o.lw}"`:""}/>`;
 if(o.k==="line")return `<line x1="${pf(o.x1)}" y1="${pf(H-o.y1)}" x2="${pf(o.x2)}" y2="${pf(H-o.y2)}" stroke="${svgRgb(o.c)}" stroke-width="${o.lw}"/>`;
 return `<text x="${pf(o.x)}" y="${pf(H-o.y)}" font-size="${pf(o.sz)}" font-weight="${o.b?700:400}" fill="${svgRgb(o.c)}" text-anchor="${o.al==="c"?"middle":o.al==="r"?"end":"start"}">${svgEsc(o.s)}</text>`
}
function renderPreview(){
 let m=buildInvoiceModel(),box=$("invoicePreview");
 box.innerHTML=m.pages.map(pg=>`<svg class="pdfpage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.W} ${m.H}" font-family="Helvetica,Arial,sans-serif"><rect width="${m.W}" height="${m.H}" fill="#fff"/>${pg.map(o=>opSvg(o,m.H)).join("")}</svg>`).join("");
 box.classList.remove("zoom");
 box.querySelectorAll(".pdfpage").forEach(sv=>sv.onclick=()=>box.classList.toggle("zoom"));
}

function savePdf(){
 let name=("Invoice_"+invoiceNumber()).replace(/[^\w.-]+/g,"-")+".pdf",bytes;
 try{bytes=buildInvoicePdf()}catch(err){window.print();return}
 let file=new File([bytes],name,{type:"application/pdf"});
 let download=()=>{let url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)};
 if(navigator.canShare&&navigator.canShare({files:[file]}))navigator.share({files:[file],title:name}).catch(e=>{if(!e||e.name!=="AbortError")download()});
 else download()
}
