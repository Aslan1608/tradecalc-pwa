(()=>{"use strict";
const $=id=>document.getElementById(id);
const oldAnalyze=$("analyze");
const analyzeButton=oldAnalyze.cloneNode(true);
oldAnalyze.replaceWith(analyzeButton);
const version=document.querySelector(".version");
if(version)version.textContent="V4.3";
const subtitle=document.querySelector("#review .mini");
if(subtitle)subtitle.textContent="Sicherer Vorschlag – unsichere Werte bleiben absichtlich leer";
let worker=null;

function pn(v){
  let s=String(v??"").trim().replace(/\s/g,"");
  if(!s)return NaN;
  const c=s.lastIndexOf(","),d=s.lastIndexOf(".");
  if(c>-1&&d>-1)s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");
  else if(c>-1)s=s.replace(",",".");
  return Number(s);
}
function fmt(v){return Number.isFinite(v)?new Intl.NumberFormat("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v):"—"}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function setProgress(label,pct){
  const p=clamp(Math.round(pct||0),0,100);
  $("progress").classList.add("show");
  $("progressBar").style.width=p+"%";
  $("progressPct").textContent=p+" %";
  $("progressLabel").textContent=label;
}
function clearDetected(){
  ["entry","sl","tp","side"].forEach(id=>$(id).classList.remove("detected"));
}
function clearPrices(){
  ["entry","sl","tp"].forEach(id=>$(id).value="");
  $("rr").textContent="—";
}
function pxClass(r,g,b){
  if(r>175&&g>155&&b<145&&Math.abs(r-g)<115)return"yellow";
  if(r>150&&g<135&&b<145&&r>g*1.28&&r>b*1.18)return"red";
  if(g>85&&b>65&&r<145&&g>r*1.08&&g>b*.92)return"green";
  return"";
}
function smooth(a){
  return a.map((_,i)=>{
    let s=0,n=0;
    for(let j=Math.max(0,i-2);j<=Math.min(a.length-1,i+2);j++){s+=a[j];n++}
    return s/n;
  });
}
function rowBands(counts,threshold,minHeight,yOffset){
  const a=smooth(counts),out=[];
  let start=-1;
  for(let i=0;i<=a.length;i++){
    const active=i<a.length&&a[i]>=threshold;
    if(active&&start<0)start=i;
    if(!active&&start>=0){
      const end=i;
      if(end-start>=minHeight){
        let area=0;
        for(let k=start;k<end;k++)area+=a[k];
        out.push({y0:start+yOffset,y1:end+yOffset,cy:(start+end)/2+yOffset,area});
      }
      start=-1;
    }
  }
  return out;
}
function detectBands(img){
  const c=$("workCanvas"),ctx=c.getContext("2d",{willReadFrequently:true});
  const scale=Math.min(1,900/img.naturalWidth);
  const W=Math.round(img.naturalWidth*scale),H=Math.round(img.naturalHeight*scale);
  c.width=W;c.height=H;ctx.drawImage(img,0,0,W,H);
  const data=ctx.getImageData(0,0,W,H).data;
  const x0=Math.floor(W*.82),y0=Math.floor(H*.09),y1=Math.floor(H*.76);
  const counts={yellow:Array(y1-y0).fill(0),red:Array(y1-y0).fill(0),green:Array(y1-y0).fill(0)};
  for(let y=y0;y<y1;y++){
    for(let x=x0;x<W;x+=2){
      const i=(y*W+x)*4,k=pxClass(data[i],data[i+1],data[i+2]);
      if(k)counts[k][y-y0]++;
    }
  }
  const threshold=Math.max(10,(W-x0)*.10),minHeight=Math.max(5,Math.round(H*.003));
  const result={};
  for(const k of ["yellow","red","green"]){
    result[k]=rowBands(counts[k],threshold,minHeight,y0).map(b=>{
      let minX=W,maxX=0;
      for(let y=Math.floor(b.y0);y<Math.ceil(b.y1);y++){
        for(let x=x0;x<W;x++){
          const i=(y*W+x)*4;
          if(pxClass(data[i],data[i+1],data[i+2])===k){minX=Math.min(minX,x);maxX=Math.max(maxX,x)}
        }
      }
      return{k,x0:minX/scale,x1:(maxX+1)/scale,y0:b.y0/scale,y1:b.y1/scale,cy:b.cy/scale,area:b.area,width:(maxX-minX+1)/scale};
    }).filter(b=>b.width>=img.naturalWidth*.075).sort((a,b)=>a.cy-b.cy);
  }
  return result;
}
function choose(labels){
  const entries=labels.yellow.slice().sort((a,b)=>b.area-a.area);
  if(!entries.length)return{ok:false,reason:"Gelbes Entry-Label nicht gefunden."};
  const entry=entries[0];
  const redBelow=labels.red.filter(b=>b.cy>entry.cy).sort((a,b)=>a.cy-b.cy);
  const redAbove=labels.red.filter(b=>b.cy<entry.cy).sort((a,b)=>b.cy-a.cy);
  const greenAbove=labels.green.filter(b=>b.cy<entry.cy).sort((a,b)=>a.cy-b.cy);
  const greenBelow=labels.green.filter(b=>b.cy>entry.cy).sort((a,b)=>b.cy-a.cy);
  const longOk=redBelow.length&&greenAbove.length;
  const shortOk=redAbove.length&&greenBelow.length;
  if(!longOk&&!shortOk)return{ok:false,reason:"TP/Entry/SL-Farbreihenfolge nicht eindeutig."};
  let side=longOk&&!shortOk?"long":shortOk&&!longOk?"short":((redBelow[0].cy-greenAbove[0].cy)>=(greenBelow[0].cy-redAbove[0].cy)?"long":"short");
  const stop=side==="long"?redBelow[0]:redAbove[0];
  const target=side==="long"?greenAbove[0]:greenBelow[0];
  const ok=side==="long"?target.cy<entry.cy&&entry.cy<stop.cy:stop.cy<entry.cy&&entry.cy<target.cy;
  return{ok,side,entry,stop,target,reason:ok?"":"Farbige Preislabels liegen nicht plausibel."};
}
function crop(img,b,pad,scale){
  const x=Math.max(0,Math.floor(b.x0-8)),y=Math.max(0,Math.floor(b.y0-pad));
  const right=img.naturalWidth,bottom=Math.min(img.naturalHeight,Math.ceil(b.y1+pad));
  const w=right-x,h=bottom-y,c=document.createElement("canvas");
  c.width=Math.round(w*scale);c.height=Math.round(h*scale);
  const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(img,x,y,w,h,0,0,c.width,c.height);
  return c;
}
async function getWorker(){
  if(worker)return worker;
  if(!window.Tesseract)throw new Error("OCR_LIBRARY");
  worker=await Tesseract.createWorker("eng",1);
  return worker;
}
function price(text){
  const m=String(text||"").match(/\d{2,5}\s*[,.]\s*\d{2}/);
  return m?pn(m[0].replace(/\s/g,"")):NaN;
}
async function readPrice(img,b,label,base){
  const variants=[crop(img,b,8,3),crop(img,b,3,4),crop(img,b,0,4)];
  let best={value:NaN,text:"",confidence:0};
  const w=await getWorker();
  await w.setParameters({tessedit_pageseg_mode:Tesseract.PSM.SINGLE_LINE,tessedit_char_whitelist:"0123456789,."});
  for(let i=0;i<variants.length;i++){
    setProgress(label,base+i*4);
    const r=await w.recognize(variants[i]),text=String(r?.data?.text||"").trim(),value=price(text),confidence=Number(r?.data?.confidence)||0;
    if(Number.isFinite(value)&&confidence>=best.confidence)best={value,text,confidence};
    if(Number.isFinite(value)&&confidence>=55)break;
  }
  return best;
}
function fail(reason,diagnostic){
  clearPrices();
  $("priceConfidence").textContent="0 %";
  $("review").classList.add("show");
  $("reviewMessage").className="status warn";
  $("reviewMessage").textContent="Sicherheitsstopp: "+reason+" Es wurden keine falschen Werte eingetragen.";
  $("message").className="status warn";
  $("message").textContent="Analyse unsicher – Preisfelder bleiben absichtlich leer.";
  $("ocrText").textContent=diagnostic||reason;
  $("review").scrollIntoView({behavior:"smooth",block:"start"});
}
async function analyze(){
  const img=$("preview"),file=$("file").files&&$("file").files[0];
  if(!file||!img.naturalWidth)return;
  analyzeButton.disabled=true;$("remove").disabled=true;
  clearDetected();clearPrices();$("review").classList.remove("show");
  try{
    setProgress("Farbige Preislabels suchen …",5);
    const labels=detectBands(img),g=choose(labels);
    if(!g.ok){fail(g.reason,JSON.stringify(labels,null,2));return}
    $("side").value=g.side;$("side").classList.add("detected");
    const entry=await readPrice(img,g.entry,"Entry-Label lesen …",18);
    const stop=await readPrice(img,g.stop,"Stop-Loss-Label lesen …",38);
    const target=await readPrice(img,g.target,"Take-Profit-Label lesen …",58);
    if(![entry.value,stop.value,target.value].every(Number.isFinite)){
      fail("Mindestens ein farbiges Preislabel konnte nicht sauber gelesen werden.",
        ["ENTRY: "+entry.text,"STOP: "+stop.text,"TARGET: "+target.text,JSON.stringify(g,null,2)].join("\n"));
      return;
    }
    const risk=g.side==="long"?entry.value-stop.value:stop.value-entry.value;
    const reward=g.side==="long"?target.value-entry.value:entry.value-target.value;
    const rr=reward/risk;
    const valid=risk>0&&reward>0&&rr>=.2&&rr<=20&&risk/entry.value<=.35&&reward/entry.value<=.65;
    if(!valid){
      fail("Preisreihenfolge oder CRV ist unplausibel.",
        ["ENTRY: "+entry.value,"STOP: "+stop.value,"TARGET: "+target.value,"CRV: "+rr].join("\n"));
      return;
    }
    $("entry").value=fmt(entry.value);$("sl").value=fmt(stop.value);$("tp").value=fmt(target.value);
    ["entry","sl","tp"].forEach(id=>$(id).classList.add("detected"));
    $("rr").textContent=fmt(rr)+" : 1";
    const avg=(entry.confidence+stop.confidence+target.confidence)/3;
    $("priceConfidence").textContent=Math.round(clamp(65+avg*.3,65,95))+" %";
    $("sideConfidence").textContent="95 %";
    $("review").classList.add("show");
    $("reviewMessage").className="status ok";
    $("reviewMessage").textContent="TP, Entry und SL wurden ausschließlich aus den farbigen TradingView-Preislabels gelesen. Bitte einmal visuell vergleichen.";
    $("message").className="status ok";
    $("message").textContent="Sichere Label-Zuordnung abgeschlossen.";
    $("ocrText").textContent=["ENTRY: "+entry.text,"STOP: "+stop.text,"TARGET: "+target.text,"SIDE: "+g.side].join("\n");
    setProgress("Analyse abgeschlossen",100);
    $("review").scrollIntoView({behavior:"smooth",block:"start"});
  }catch(e){
    console.error(e);
    fail(e?.message==="OCR_LIBRARY"?"OCR-Komponenten konnten nicht geladen werden.":"Analyse ist fehlgeschlagen.");
  }finally{
    analyzeButton.disabled=false;$("remove").disabled=false;
    setTimeout(()=>$("progress").classList.remove("show"),1000);
  }
}
analyzeButton.addEventListener("click",analyze);
$("file").addEventListener("change",()=>{
  clearDetected();clearPrices();$("review").classList.remove("show");
  setTimeout(()=>{$("message").textContent="Screenshot geladen. V4.3 liest nur die farbigen Preislabels – keine beliebigen Skalenwerte.";},0);
});
window.addEventListener("beforeunload",async()=>{if(worker){try{await worker.terminate()}catch{}}});
})();