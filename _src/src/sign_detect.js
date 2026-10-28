async function snLinesOf(page,OPS){
  const ol=await page.getOperatorList();const V=[],H=[];let m=[1,0,0,1,0,0];const st=[];
  const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
  const tp=(x,y)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
  const seg=(a,b)=>{const dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);if(dx<2&&dy>4)V.push({x:(a[0]+b[0])/2,y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])});else if(dy<2&&dx>4)H.push({y:(a[1]+b[1])/2,x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0])})};
  const rect=(x,y,w,h)=>{const p=[tp(x,y),tp(x+w,y),tp(x+w,y+h),tp(x,y+h)];const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    if(x1-x0<3&&y1-y0>4)V.push({x:(x0+x1)/2,y0,y1});else if(y1-y0<3&&x1-x0>4)H.push({y:(y0+y1)/2,x0,x1});else if(x1-x0>4&&y1-y0>4&&(x1-x0)*(y1-y0)<4e5){seg([x0,y0],[x0,y1]);seg([x1,y0],[x1,y1]);seg([x0,y0],[x1,y0]);seg([x0,y1],[x1,y1])}};
  for(let i=0;i<ol.fnArray.length;i++){const f=ol.fnArray[i],a=ol.argsArray[i];
    if(f===OPS.save)st.push(m.slice());else if(f===OPS.restore)m=st.pop()||m;else if(f===OPS.transform)m=mul(m,a);
    else if(f===OPS.paintFormXObjectBegin){st.push(m.slice());if(a&&a[0])m=mul(m,a[0])}else if(f===OPS.paintFormXObjectEnd)m=st.pop()||m;
    else if(f===OPS.constructPath){const ops=a[0],c=a[1];let k=0,cur=null,start=null;
      for(const o of ops){if(o===OPS.rectangle){rect(c[k],c[k+1],c[k+2],c[k+3]);k+=4}
        else if(o===OPS.moveTo){cur=start=tp(c[k],c[k+1]);k+=2}else if(o===OPS.lineTo){const n=tp(c[k],c[k+1]);if(cur)seg(cur,n);cur=n;k+=2}
        else if(o===OPS.curveTo){cur=tp(c[k+4],c[k+5]);k+=6}else if(o===OPS.curveTo2||o===OPS.curveTo3){cur=tp(c[k+2],c[k+3]);k+=4}else if(o===OPS.closePath){if(cur&&start)seg(cur,start);cur=start}}}}
  return {V,H};
}

function snNorm(s){return (s||'').normalize('NFKC').replace(/[ـ‎‏‪-‮ً-ْ]/g,'').replace(/ی/g,'ي').replace(/ھ/g,'ه').replace(/ک/g,'ك')}
function snFix(s){return snNorm(s).replace(/هللا/g,'الله').replace(/ا([أإآ])ل/g,'ال$1').replace(/\s+/g,' ').trim()}
function snKey(s){return snNorm(s).replace(/\s+/g,'')}
function snLines(items){const lines=[];items.slice().sort((a,b)=>b.y-a.y).forEach(i=>{let l=lines.find(l=>Math.abs(l.y-i.y)<Math.min(l.fs,i.fs)*.45);if(!l){l={y:i.y,fs:i.fs,it:[]};lines.push(l)}l.it.push(i)});return lines}
function snJoin(its,fs){its=its.slice().sort((a,b)=>(b.x+b.w)-(a.x+a.w));let s='',left=null;
  for(const i of its){const gap=left==null?0:left-(i.x+i.w);s+=(left!=null&&gap>fs*.18?' ':'')+i.s;left=left==null?i.x:Math.min(left,i.x)}return snFix(s)}
function snRuns(items){const runs=[];for(const l of snLines(items)){l.it.sort((a,b)=>(b.x+b.w)-(a.x+a.w));let cur=null;
  for(const i of l.it){if(!cur||cur.x-(i.x+i.w)>l.fs*1.6){cur={its:[],x:i.x,r:i.x+i.w,y:l.y,fs:l.fs};runs.push(cur)}cur.its.push(i);cur.x=Math.min(cur.x,i.x)}}
  runs.forEach(r=>{r.s=snJoin(r.its,r.fs);r.w=r.r-r.x;r.cx=r.x+r.w/2});return runs}
function snCell(L,cy,tx,slot,rx){
  if(!L)return slot;
  const hs=L.H.filter(q=>q.x1-q.x0>20&&q.x0-2<=rx&&q.x1+2>=rx).map(q=>q.y);
  let top=Math.min(...hs.filter(y=>y>cy+2)),bot=Math.max(...hs.filter(y=>y<cy-2));
  const ok=isFinite(top)&&isFinite(bot)&&top-bot<=150;if(!ok){top=cy+4;bot=cy-4}
  const xs=[];L.V.filter(v=>v.y0<=bot+3&&v.y1>=top-3).map(v=>v.x).sort((a,b)=>a-b).forEach(x=>{if(!xs.length||x-xs[xs.length-1]>2.5)xs.push(x)});
  slot._xs=xs;slot._tx=tx;slot._ok=ok;slot._tb=[top,bot];
  if(xs.length<2)return slot;
  let k=-1;if(tx==null){for(let j=0;j<xs.length-1;j++)if(xs[j+1]-xs[j]>40){k=j;break}}else{for(let j=0;j<xs.length-1;j++)if(xs[j]<=tx&&tx<=xs[j+1])k=j}
  if(k<0)return slot;const xl=xs[k],xr=xs[k+1];
  Object.assign(slot,{x:+(xl+3).toFixed(1),w:+(xr-xl-6).toFixed(1)});
  if(ok)Object.assign(slot,{y:+(bot+2).toFixed(1),h:+(top-bot-4).toFixed(1)});
  return slot;
}
const SN_ROLE=/^(رئيس|نائب|عضو|مقرر|أمين|سكرتير|ممثل|مشرف)/;
async function snDetectPage(page,pi,OPS){
  let L=null;try{L=await snLinesOf(page,OPS)}catch(e){}
  const tc=await page.getTextContent();
  const raw=tc.items.filter(i=>i.str&&i.str.trim()).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],w:i.width,fs:Math.hypot(i.transform[2],i.transform[3])||10})).map(i=>(i.cx=i.x+i.w/2,i));
  const runs=snRuns(raw),res=[];
  for(const h of runs.filter(i=>/(ال)?توقيع$/.test(snKey(i.s))&&snKey(i.s).length<14)){
    const line=runs.filter(i=>Math.abs(i.y-h.y)<h.fs*.6);
    if(!line.some(i=>/اسم/.test(snKey(i.s))))continue;
    const roleH=line.find(i=>i!==h&&/صفة|المنصب|الوظيفة|المسمى/.test(snKey(i.s)));
    const fs=h.fs, b2=roleH?(roleH.x+h.r)/2:h.r+fs, b1=roleH?roleH.r+fs*.3:b2;
    const lines=snLines(raw.filter(i=>i.y<h.y-fs*.7&&i.cx>b1));
    const g=[];let pv=h.y;lines.forEach(l=>{g.push(pv-l.y);pv=l.y});
    const gs=g.slice(1).sort((a,b)=>a-b),med=gs.length?gs[Math.floor(gs.length/2)]:(g[0]||22);
    const out=[];pv=h.y;
    for(const l of lines){const gp=pv-l.y;if(out.length&&gp>med*1.9)break;if(!out.length&&gp>med*3.2)break;pv=l.y;
      let nameIt=l.it,roleIt=[];
      if(roleH){const zone=raw.filter(i=>Math.abs(i.y-l.y)<l.fs*.45&&i.cx>b2).sort((a,b)=>a.x-b.x);let best=null;
        for(let k=0;k<zone.length-1;k++){const gp=zone[k+1].x-(zone[k].x+zone[k].w),m=zone[k].x+zone[k].w;if(gp>l.fs*.35&&m>=roleH.x-l.fs&&m<=roleH.r+l.fs*6&&(!best||gp>best.gp))best={gp,at:m+gp/2}}
        const cut=best?best.at:b1;nameIt=zone.filter(i=>i.cx>cut);roleIt=zone.filter(i=>i.cx<=cut)}
      const n=snJoin(nameIt,l.fs).replace(/^[\d٠-٩]+\s*[-.)]?\s*/,'');
      if(n.replace(/[\d٠-٩\s.\-/]/g,'').length<3)continue;
      const role=roleIt.length?snJoin(roleIt,l.fs):'';
      out.push({n,r:role,y0:l.y,fs:l.fs})}
    const w=Math.max(60,Math.min(190,(roleH?Math.abs(h.cx-roleH.cx):fs*8)*.85)),hh=Math.max(16,Math.min(med*.86,60));
    for(const o of out){const cy=o.y0+o.fs*.32;res.push(snCell(L,cy,h.cx,{p:pi,n:o.n,r:o.r,x:+(h.cx-w/2).toFixed(1),y:+(cy-hh/2).toFixed(1),w:+w.toFixed(1),h:+hh.toFixed(1)},h.cx))}
  }
  if(!res.length){ // tables without a header row: rows with a role word and a name to its right
    const rr=runs.filter(r=>SN_ROLE.test(snKey(r.s))&&snKey(r.s).length<22);
    const rows=rr.map(r=>{const nm=runs.filter(q=>Math.abs(q.y-r.y)<r.fs*.5&&q.x>r.r).sort((a,b)=>b.r-a.r)[0];return nm?{r,nm}:null}).filter(Boolean);
    if(rows.length>=2)for(const {r,nm} of rows){const cy=r.y+r.fs*.32,n=nm.s.replace(/^[\d\u0660-\u0669]+\s*[-.)]?\s*/,'');if(n.length<3)continue;
      const w=120,hh=r.fs*1.8;res.push(snCell(L,cy,null,{p:pi,n,r:r.s,x:+(r.x-r.fs-w).toFixed(1),y:+(cy-hh/2).toFixed(1),w,h:+hh.toFixed(1)},r.x+r.w/2))}
  }
  // keep only column borders shared by most rows (drawn signatures add stray strokes)
  const grp=res.filter(r=>r._xs&&r._xs.length>=2);
  if(grp.length>=2){const cnt=[];grp.forEach(r=>r._xs.forEach(x=>{const c=cnt.find(c=>Math.abs(c.x-x)<3);c?c.n++:cnt.push({x,n:1})}));
    const keep=cnt.filter(c=>c.n>=Math.max(2,grp.length*.6)).map(c=>c.x).sort((a,b)=>a-b);
    if(keep.length>=2)for(const r of grp){const xs=keep,tx=r._tx;let k=-1;
      if(tx==null){for(let j=0;j<xs.length-1;j++)if(xs[j+1]-xs[j]>40){k=j;break}}else{for(let j=0;j<xs.length-1;j++)if(xs[j]<=tx&&tx<=xs[j+1])k=j}
      if(k>=0){r.x=+(xs[k]+3).toFixed(1);r.w=+(xs[k+1]-xs[k]-6).toFixed(1)}}}
  res.forEach(r=>{delete r._xs;delete r._tx;delete r._ok;delete r._tb});
  return res;
}
