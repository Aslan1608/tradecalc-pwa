(()=>{"use strict";
const $=id=>document.getElementById(id);
const KNOWN=["GOOG","GOOGL","AMZN","AAPL","MSFT","NVDA","META","TSLA","AMD","AVGO","NFLX","PLTR"];
const COMPANY_MAP=[[/ALPHABET|GOOGLE/i,"GOOG"],[/AMAZON/i,"AMZN"],[/APPLE/i,"AAPL"],[/MICROSOFT/i,"MSFT"],[/NVIDIA/i,"NVDA"],[/META\s*PLATFORMS/i,"META"],[/TESLA/i,"TSLA"],[/BROADCOM/i,"AVGO"],[/NETFLIX/i,"NFLX"],[/PALANTIR/i,"PLTR"]];
const TFS=["1M","2M","3M","5M","10M","15M","30M","45M","1H","2H","3H","4H","6H","8H","12H","1D","2D","3D","1W","1MO"];
let metaWorker=null,metaToken=0;

function pn(v){let s=String(v??"").trim().replace(/\s/g,"");if(!s)return NaN;const c=s.lastIndexOf(","),d=s.lastIndexOf(".");if(c>-1&&d>-1)s=c>d?s.replace(/\./g,"").replace(",","."):s.replace(/,/g,"");else if(c>-1)s=s.replace(",",".");return Number(s)}
function validTrade(){const symbol=$("symbol").value.trim().toUpperCase(),tf=$("timeframe").value.trim().toUpperCase(),side=$("side").value,e=pn($("entry").value),sl=pn($("sl").value),tp=pn($("tp").value);return !!symbol&&!!tf&&Number.isFinite(e)&&Number.isFinite(sl)&&Number.isFinite(tp)&&(side==="long"?tp>e&&e>sl:sl>e&&e>tp)}
function addUI(){
  const v=document.querySelector(".version");if(v)v.textContent="V4.4";
  const sub=document.querySelector("#review .mini");if(sub)sub.textContent="Symbol, Zeiteinheit und Trade-Level prüfen und anschließend übernehmen";
  const conf=document.querySelector("#review .confidence");
  if(conf&&!$("symbolConfidence")){
    const a=document.createElement("div");a.innerHTML='<span>Symbol-Erkennung</span><strong id="symbolConfidence">—</strong>';
    const b=document.createElement("div");b.innerHTML='<span>Zeiteinheit-Erkennung</span><strong id="timeframeConfidence">—</strong>';
    conf.append(a,b);
  }
  if(!$("importToCalc")){
    const wrap=document.createElement("div");wrap.style.marginTop="12px";
    wrap.innerHTML='<button id="importToCalc" class="primary" style="width:100%;min-height:52px" disabled>In TradeCalc übernehmen</button><div id="exportMessage" class="status" style="margin-top:8px">Nach sicherer Erkennung oder manueller Korrektur werden die Werte freigegeben.</div>';
    $("review").appendChild(wrap);
    $("importToCalc").addEventListener("click",exportTrade);
  }
  $("symbol").placeholder="wird erkannt";$("timeframe").placeholder="wird erkannt";
  ["symbol","timeframe","side","entry","sl","tp"].forEach(id=>{$(id).addEventListener("input",refreshExport);$(id).addEventListener("change",refreshExport)});
}
function refreshExport(){const ok=validTrade();if($("importToCalc"))$("importToCalc").disabled=!ok;if($("exportMessage")){$("exportMessage").className="status "+(ok?"ok":"warn");$("exportMessage").textContent=ok?"Alle Pflichtwerte sind plausibel. Der Trade kann übernommen werden.":"Symbol, Zeiteinheit und plausible Trade-Level werden benötigt."}}
function exportTrade(){
  if(!validTrade())return;
  const payload={symbol:$("symbol").value.trim().toUpperCase(),timeframe:$("timeframe").value.trim().toUpperCase(),side:$("side").value,entry:$("entry").value.trim(),sl:$("sl").value.trim(),tp:$("tp").value.trim(),rr:$("rr").textContent.trim()};
  window.parent.postMessage({type:"TRADECALC_IMPORT",payload},location.origin);
  $("exportMessage").className="status ok";$("exportMessage").textContent="✓ Werte wurden an den TradeCalc-Rechner übergeben.";
}
function crop(img,x0,y0,x1,y1,scale=3,threshold=true){
  const sx=Math.max(0,Math.floor(img.naturalWidth*x0)),sy=Math.max(0,Math.floor(img.naturalHeight*y0)),sw=Math.max(1,Math.floor(img.naturalWidth*(x1-x0))),sh=Math.max(1,Math.floor(img.naturalHeight*(y1-y0))),c=document.createElement("canvas");
  c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));const ctx=c.getContext("2d",{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
  if(threshold){const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=g>125?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}ctx.putImageData(im,0,0)}
  return c;
}
async function worker(){if(metaWorker)return metaWorker;if(!window.Tesseract)throw new Error("OCR_LIBRARY");metaWorker=await Tesseract.createWorker("eng",1);return metaWorker}
function compact(t){return String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"")}
function parseMeta(text){const raw=String(text||"").toUpperCase(),flat=compact(raw);let symbol="";for(const t of KNOWN){if(flat.includes(t)){symbol=t;break}}if(!symbol){for(const [re,t] of COMPANY_MAP){if(re.test(raw)){symbol=t;break}}}
  let tf="";for(const t of TFS.sort((a,b)=>b.length-a.length)){if(flat.includes(t)){tf=t;break}}
  if(!tf){const m=flat.match(/(?:^|[^0-9])(1|2|3|4|5|6|8|10|12|15|30|45)(M|H|D|W)(?:$|[^A-Z])/);if(m)tf=m[1]+m[2]}
  return{symbol,tf,raw};
}
async function recognizeCanvas(canvas){const w=await worker();await w.setParameters({tessedit_pageseg_mode:Tesseract.PSM.SPARSE_TEXT,tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"});const r=await w.recognize(canvas);return{text:String(r?.data?.text||""),confidence:Number(r?.data?.confidence)||0}}
async function detectMetadata(){
  const token=++metaToken,img=$("preview");if(!img||!img.naturalWidth)return;
  $("symbolConfidence").textContent="läuft …";$("timeframeConfidence").textContent="läuft …";
  const variants=[crop(img,0,.80,.60,.92,3,true),crop(img,0,.84,.52,.925,4,true),crop(img,0,.04,.72,.17,3,true)];
  let best={symbol:"",tf:"",score:-1,confidence:0,text:""};
  try{
    for(const c of variants){if(token!==metaToken)return;const r=await recognizeCanvas(c),p=parseMeta(r.text),score=(p.symbol?4:0)+(p.tf?4:0)+r.confidence/100;if(score>best.score)best={...p,score,confidence:r.confidence,text:r.text};if(p.symbol&&p.tf)break}
    if(token!==metaToken)return;
    if(best.symbol){$("symbol").value=best.symbol;$("symbol").classList.add("detected");$("symbolConfidence").textContent=Math.round(Math.max(70,Math.min(95,best.confidence)))+" %"}else{$("symbol").value="";$("symbol").classList.remove("detected");$("symbolConfidence").textContent="nicht sicher"}
    if(best.tf){$("timeframe").value=best.tf;$("timeframe").classList.add("detected");$("timeframeConfidence").textContent=Math.round(Math.max(70,Math.min(95,best.confidence)))+" %"}else{$("timeframe").value="";$("timeframe").classList.remove("detected");$("timeframeConfidence").textContent="nicht sicher"}
    const old=$("ocrText").textContent;$("ocrText").textContent=old+"\n\nMETADATA OCR:\n"+(best.text||"kein sicherer Text");refreshExport();
  }catch(e){console.error(e);$("symbolConfidence").textContent="Fehler";$("timeframeConfidence").textContent="Fehler";refreshExport()}
}
function waitForPriceResult(){
  const start=Date.now(),timer=setInterval(()=>{const review=$("review"),done=review&&review.classList.contains("show");if(done){clearInterval(timer);detectMetadata()}else if(Date.now()-start>45000){clearInterval(timer)}},300);
}
addUI();
const analyze=$("analyze");if(analyze)analyze.addEventListener("click",()=>{metaToken++;$("symbol").value="";$("timeframe").value="";$("symbol").classList.remove("detected");$("timeframe").classList.remove("detected");$("symbolConfidence").textContent="—";$("timeframeConfidence").textContent="—";refreshExport();waitForPriceResult()});
$("file").addEventListener("change",()=>{metaToken++;$("symbol").value="";$("timeframe").value="";$("symbolConfidence").textContent="—";$("timeframeConfidence").textContent="—";refreshExport()});
refreshExport();
window.addEventListener("beforeunload",async()=>{if(metaWorker){try{await metaWorker.terminate()}catch{}}});
})();