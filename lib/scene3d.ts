// @ts-nocheck
/* eslint-disable */
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { fmtInt, fmtMoney, fmtMonth, fmtPct } from "@/lib/format";

const ALIAS = { "--surface2": "--surface-2" };
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(ALIAS[n] || n).trim();
const pal = () => ({
  text: css("--text-primary"), muted: css("--text-secondary"), grid: css("--border"), surface: css("--surface-1"),
  blue: css("--series-1"), orange: css("--series-2"), aqua: css("--series-3"), yellow: css("--series-4"), gray: css("--neutral"), red: css("--series-red"),
  low: css("--ramp-low"), high: css("--ramp-high"), line: css("--border"), accent: css("--accent"),
});
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, t)));

/* ---------- 3D scene helper ---------- */
const DIRS={angled:[.75,.62,.85],top:[0,1,.001],side:[0,.14,1]};
export function niceTicks(lo,hi,n){const span=hi-lo||1,raw=span/n,mag=10**Math.floor(Math.log10(raw)),f=raw/mag,step=(f<1.5?1:f<3?2:f<7?5:10)*mag;const out=[];for(let v=Math.ceil(lo/step-1e-9)*step;v<=hi+1e-9;v+=step)out.push(+v.toFixed(6));return out}
export function makeScene(host,opts={}){
  const p=pal();
  THREE.ColorManagement.enabled=false;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  host.prepend(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(40,1,.1,400);
  scene.add(new THREE.AmbientLight(0xffffff,2.7));
  const dl=new THREE.DirectionalLight(0xffffff,2.8);dl.position.set(6,10,6);scene.add(dl);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;
  const labels=[],fitPts=[],v=new THREE.Vector3();let pend=false,W=0,H=0,dir=DIRS.angled.slice();
  function render(){pend=false;renderer.render(scene,camera);
    for(const l of labels){v.copy(l.pos).project(camera);const vis=v.z<1&&!l.off;l.el.style.display=vis?'':'none';
      if(vis)l.el.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*W}px,${(-v.y*.5+.5)*H}px)`;}}
  function request(){if(!pend){pend=true;requestAnimationFrame(render)}}
  controls.addEventListener('change',request);
  /* Fit: find the closest camera distance at which every point and label stays inside the frame with a margin. */
  function fit(){
    if(!W||!H||!fitPts.length)return;
    const box=new THREE.Box3();fitPts.forEach(q=>box.expandByPoint(q));
    const c=box.getCenter(new THREE.Vector3()),d0=new THREE.Vector3(...dir).normalize();
    const items=fitPts.map(q=>({pos:q,hw:0,hh:0}));
    labels.forEach(l=>{if(l.el.classList.contains('nodel'))return;l.el.style.display='';items.push({pos:l.pos,hw:l.el.offsetWidth/2,hh:l.el.offsetHeight/2})});
    const pad=8,padB=opts.padBottom||pad;
    const ok2=(d,tg)=>{camera.position.copy(tg).addScaledVector(d0,d);camera.lookAt(tg);camera.updateMatrixWorld();camera.updateProjectionMatrix();
      for(const it of items){v.copy(it.pos).project(camera);if(v.z>1)return false;const x=(v.x*.5+.5)*W,y=(-v.y*.5+.5)*H;if(x-it.hw<pad||x+it.hw>W-pad||y-it.hh<pad||y+it.hh>H-padB)return false}return true};
    const tc=c.clone(),fov=Math.tan(camera.fov*Math.PI/360);
    let hi=0;
    for(let it=0;it<4;it++){
      camera.position.copy(tc).addScaledVector(d0,hi||100);
      let lo=1;hi=400;
      for(let i=0;i<40;i++){const m=(lo+hi)/2;ok2(m,tc)?hi=m:lo=m}
      ok2(hi,tc);
      let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
      for(const q of items){v.copy(q.pos).project(camera);const x=(v.x*.5+.5)*W,y=(-v.y*.5+.5)*H;x0=Math.min(x0,x-q.hw);x1=Math.max(x1,x+q.hw);y0=Math.min(y0,y-q.hh);y1=Math.max(y1,y+q.hh)}
      const u=2*hi*fov/H,right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
      tc.addScaledVector(right,((x0+x1)/2-W/2)*u).addScaledVector(up,-(((y0+y1)/2)-(pad+(H-padB))/2)*u);
    }
    {let lo=1;hi=400;for(let i=0;i<40;i++){const m=(lo+hi)/2;ok2(m,tc)?hi=m:lo=m}ok2(hi,tc)}
    controls.target.copy(tc);controls.minDistance=hi*.35;controls.maxDistance=hi*2.2;controls.update();request();
  }
  function resize(){W=host.clientWidth;H=host.clientHeight;if(!W||!H)return;opts.onNarrow&&opts.onNarrow(W<520);renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();
    if(fitPts.length){const t=controls.target;dir=camera.position.clone().sub(t).normalize().toArray();fit()}request()}
  const ro=new ResizeObserver(resize);ro.observe(host);
  function preset(n){dir=((n==='angled'&&host.clientWidth<520)?[.45,1.05,.75]:(DIRS[n]||DIRS.angled)).slice();fit()}
  /* cls: 'lab' point label, 'tick' axis value, 'ttl' axis title. */
  function label(text,pos,cls='lab',color,noFit){const el=document.createElement('span');el.className='lab '+cls;el.textContent=text;if(color)el.style.borderColor=color;host.appendChild(el);const q=new THREE.Vector3(...pos);const rec={el,pos:q,off:false};el._l=rec;labels.push(rec);if(!noFit&&!cls.includes('nodel'))fitPts.push(q);return el}
  function line(a,b,mat){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);return new THREE.Line(g,mat)}
  function bar(a,b,r,color){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),len=A.distanceTo(B);
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,8),new THREE.MeshBasicMaterial({color}));
    m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());scene.add(m);return m}
  /* A framed box with gridded back walls, three solid axes, tick values and titles. xt/yt/zt are [{v,t}] in world units. */
  function axes({w,h,d,xt,yt,zt,xTitle,yTitle,zTitle,xShort,yShort,zShort}){
    const nar=host.clientWidth<520,thin=a=>nar&&a.length>4?a.map((k,i)=>i%2?{...k,t:''}:k):a;xt=thin(xt);zt=thin(zt);
    const gm=new THREE.LineBasicMaterial({color:p.grid}),seg=[];
    const add=(a,b)=>seg.push(...a,...b);
    xt.forEach(k=>{add([k.v,0,-d/2],[k.v,0,d/2]);add([k.v,0,-d/2],[k.v,h,-d/2])});
    zt.forEach(k=>{add([-w/2,0,k.v],[w/2,0,k.v]);add([-w/2,0,k.v],[-w/2,h,k.v])});
    yt.forEach(k=>{add([-w/2,k.v,-d/2],[w/2,k.v,-d/2]);add([-w/2,k.v,-d/2],[-w/2,k.v,d/2])});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(seg,3));scene.add(new THREE.LineSegments(g,gm));
    const wm=new THREE.MeshBasicMaterial({color:new THREE.Color(css('--surface-1')),transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false});
    const back=new THREE.Mesh(new THREE.PlaneGeometry(w,h),wm);back.position.set(0,h/2,-d/2);scene.add(back);
    const left=new THREE.Mesh(new THREE.PlaneGeometry(d,h),wm);left.rotation.y=Math.PI/2;left.position.set(-w/2,h/2,0);scene.add(left);
    const flr=new THREE.Mesh(new THREE.PlaneGeometry(w,d),wm);flr.rotation.x=-Math.PI/2;scene.add(flr);
    const em=new THREE.LineBasicMaterial({color:p.grid});
    [[-w/2,h,-d/2,w/2,h,-d/2],[-w/2,h,-d/2,-w/2,h,d/2],[w/2,0,-d/2,w/2,h,-d/2]].forEach(a=>scene.add(line(a.slice(0,3),a.slice(3),em)));
    const R=.045,col=p.text;
    bar([-w/2,0,d/2],[w/2,0,d/2],R,col);            // x axis, front edge
    bar([w/2,0,-d/2],[w/2,0,d/2],R,col);            // z axis, right edge
    bar([-w/2,0,d/2],[-w/2,h,d/2],R,col);           // y axis, front-left edge
    xt.forEach(k=>{k.t&&label(k.t,[k.v,0,d/2+.55],'tick');bar([k.v,0,d/2],[k.v,0,d/2+.2],R*.8,col)});
    zt.forEach(k=>{k.t&&label(k.t,[w/2+.9,0,k.v],'tick');bar([w/2,0,k.v],[w/2+.2,0,k.v],R*.8,col)});
    yt.forEach(k=>{k.t&&label(k.t,[-w/2-.8,k.v,d/2],'tick');bar([-w/2,k.v,d/2],[-w/2-.2,k.v,d/2],R*.8,col)});
    const T=(f,s)=>nar&&s?s:f;
    xTitle&&label(T(xTitle,xShort),[0,-1.3,d/2+(nar?1.9:1.3)],'ttl axis');
    zTitle&&label(T(zTitle,zShort),[w/2+.6,0,-d/2-1.6],'ttl axis');
    yTitle&&label(T(yTitle,yShort),[-w/2-.8,h+1.6,d/2],'ttl axis');
    const plain=s=>s.replace(/\s*[→↑]\s*/g,(m,i)=>s.slice(0,i).trim()&&s.slice(i+m.length).trim()?', ':' ').replace(/\s+/g,' ').trim();
    opts.onCaption&&opts.onCaption([['Left to right',xTitle],['Front to back',zTitle],['Up',yTitle]].filter(a=>a[1]).map(a=>a[0]+': '+plain(a[1])).join(' · '));
    [[-w,0,-d],[w,0,-d],[-w,h,-d],[w,h,-d],[-w,0,d],[w,0,d],[-w,h,d],[w,h,d]].forEach(c=>fitPts.push(new THREE.Vector3(c[0]/2,c[1],c[2]/2)));
  }
  const ray=new THREE.Raycaster(),m=new THREE.Vector2();let pickObjs=[],down=null;
  function hit(e){const r=renderer.domElement.getBoundingClientRect();m.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(m,camera);const h=ray.intersectObjects(pickObjs,false);return h.length?h[0]:null}
  let hoverH=null,clickH=null,dropMesh=null,tagRec=null;
  renderer.domElement.addEventListener('pointermove',e=>{if(hoverH&&e.buttons===0&&e.pointerType==='mouse')hoverH(hit(e))});
  renderer.domElement.addEventListener('pointerleave',()=>hoverH&&hoverH(null));
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
  renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6&&clickH)clickH(hit(e));down=null});
  /* A line from the floor up to the selected point, so its position on every axis can be read off. */
  function drop(pos){if(dropMesh){scene.remove(dropMesh);dropMesh.geometry.dispose();dropMesh=null}if(pos)dropMesh=bar([pos.x,0,pos.z],[pos.x,pos.y,pos.z],.035,p.accent);request()}
  function tag(text,pos){untag();const el=label(text,pos,'lab strong sel',null,true);tagRec=el._l;request()}
  function untag(){if(tagRec){labels.splice(labels.indexOf(tagRec),1);tagRec.el.remove();tagRec=null}}
  /* Hover previews, click selects and keeps the highlight until the next click. Clicking the same thing again, or empty space, clears it. */
  function pickSel(objs,deflt,tipFn,style){
    pickObjs=objs;let sel=null,hov=null;
    const show=()=>{style(sel,hov);opts.setTip(sel?tipFn(sel)+'<div class="t">Click it again, or empty space, to clear.</div>':hov?tipFn(hov):deflt);request()};
    hoverH=h=>{const o=h?h.object:null;if(o===hov)return;hov=o;show()};
    clickH=h=>{const o=h?h.object:null;sel=(o&&o!==sel)?o:null;hov=o;show()};
    show();
  }
  function dispose(){untag();ro.disconnect();controls.dispose();renderer.dispose();renderer.domElement.remove();labels.forEach(l=>l.el.remove());scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose()})}
  return {scene,camera,p,label,axes,request,preset,resize,dispose,pickSel,drop,tag,untag,pickRaw:(objs,hover,click)=>{pickObjs=objs;hoverH=hover;clickH=click},finish:()=>{resize();preset('angled')}};
}
const shortId=s=>String(s.id).slice(0,5);

/* ---------- 1. Review network ---------- */
export function buildReviews(host,ui,R,RS){
  const S=makeScene(host,{...ui,padBottom:150});
  const all=R.points,p=S.p,cols=[p.blue,p.orange,p.aqua,p.red],nM=R.months.length,nC=R.cats.length;
  const hash=(i,k)=>{const x=Math.sin(i*12.9898+k*78.233)*43758.5453;return x-Math.floor(x)};
  /* A fixed sample keeps the picture readable: up to 110 positive and 90 of each problem theme. */
  const quota=[110,90,90,60],byCat=R.cats.map(()=>[]);
  all.forEach((q,i)=>byCat[q[3]].push(i));
  const sel=[];byCat.forEach((arr,c)=>{arr.sort((a,b)=>hash(a,1)-hash(b,1));sel.push(...arr.slice(0,quota[c]||60))});
  const pts=sel.map(i=>all[i]),N=pts.length;
  const lane=[];let nL=0;R.cats.forEach((_,c)=>{lane[c]=all.some(q=>q[3]===c)?nL++:-1});
  const XS=.7,LS=3,YK=1.5,w=(nM-1)*XS+2,h=4*YK,d=(nL-1)*LS+2.8,x0=-((nM-1)*XS)/2;
  const P=pts.map((q,k)=>{const i=sel[k];return [x0+(q[5]+(hash(i,2)-.5)*.9)*XS,Math.min(h-.1,Math.max(.1,(q[4]-1)*YK+(hash(i,3)-.5)*.9)),(lane[q[3]]-(nL-1)/2)*LS+(hash(i,4)-.5)*1.6]});
  const shortName=c=>c.replace('Product or item problem','Product problem');
  const step=Math.ceil(nM/(host.clientWidth<520?4:6));
  S.axes({w,h,d,
    xt:R.months.map((m,i)=>({v:x0+i*XS,t:i%step===0?fmtMonth(m):''})).filter((_,i)=>i%step===0),
    yt:[1,2,3,4,5].map(s=>({v:(s-1)*YK,t:s+'★'})),
    zt:R.cats.map((c,i)=>({v:(lane[i]-(nL-1)/2)*LS,t:shortName(c)})).filter((_,i)=>lane[i]>=0),
    xTitle:'Month the review was written →',zTitle:'Theme of the comment →',yTitle:'Star rating',xShort:'Month →',zShort:'Theme →',yShort:'Stars'});
  /* Lines join each review to its two nearest neighbours by wording (distance in the word-similarity space). */
  const eset=new Set(),edges=[];
  pts.forEach((a,i)=>{const ds=pts.map((b,j)=>[j,(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2]).filter(x=>x[0]!==i&&pts[x[0]][3]===a[3]).sort((x,y)=>x[1]-y[1]).slice(0,2);
    ds.forEach(([j])=>{const key=i<j?i+'-'+j:j+'-'+i;if(!eset.has(key)){eset.add(key);edges.push([i,j])}})});
  const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,18,18),new THREE.MeshStandardMaterial({roughness:.28,metalness:.05}),N);S.scene.add(mesh);
  const lineMat=new THREE.LineBasicMaterial({color:p.muted,transparent:true,opacity:.38});let lines=null;
  const mark=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:p.text,wireframe:true}));mark.visible=false;S.scene.add(mark);
  /* A halo around each review whose order really arrived after the estimated date. */
  const halo=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,14),new THREE.MeshBasicMaterial({color:p.text,transparent:true,opacity:.3,depthWrite:false}),N);S.scene.add(halo);
  const size=q=>.085+Math.min(q[6],8)*.011;
  /* Text labels on a spread-out subset, problem themes first. */
  const order=[...Array(N).keys()].sort((a,b)=>((pts[a][3]===0)-(pts[b][3]===0))||hash(sel[a],5)-hash(sel[b],5)),shown=[],recs=new Array(N).fill(null);
  const snip=t=>{const s=String(t);if(s.length<=28)return s;const c=s.slice(0,28),k=c.lastIndexOf(' ');return (k>12?c.slice(0,k):c)+'…'};
  for(const i of order){if(shown.length>=9)break;
    if(shown.every(j=>Math.hypot(P[i][0]-P[j][0],(P[i][1]-P[j][1])*1.4,P[i][2]-P[j][2])>3.6)){shown.push(i);
      recs[i]=S.label(snip(pts[i][7]),[P[i][0],P[i][1]-.55,P[i][2]],'nodel')}}
  const o3=new THREE.Object3D(),c=new THREE.Color(),dimC=new THREE.Color(css('--surface2')),accent=new THREE.Color(p.accent);let vis=[],selIdx=null,nb=new Set(),selLines=null;
  function apply(){
    vis=pts.map(q=>RS.active[q[3]]&&q[5]<=RS.monthMax);
    if(selIdx!=null&&!vis[selIdx]){selIdx=null;nb=new Set();ui.setTip(defTip)}
    pts.forEach((q,i)=>{const s=vis[i]?size(q)*(i===selIdx?1.9:1):.0001;o3.position.set(...P[i]);o3.scale.set(s,s,s);o3.updateMatrix();mesh.setMatrixAt(i,o3.matrix);c.set(cols[q[3]]);if(selIdx!=null&&i!==selIdx&&!nb.has(i))c.lerp(dimC,.7);mesh.setColorAt(i,c);{const hs=vis[i]&&q[8]!=null&&q[8]>0?s*1.9:.0001;o3.scale.set(hs,hs,hs);o3.updateMatrix();halo.setMatrixAt(i,o3.matrix)}if(recs[i])recs[i]._l.off=!vis[i]});
    mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;halo.instanceMatrix.needsUpdate=true;
    if(lines){S.scene.remove(lines);lines.geometry.dispose()}
    const arr=[];for(const [a,b] of edges){if(vis[a]&&vis[b])arr.push(...P[a],...P[b])}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));lines=new THREE.LineSegments(g,lineMat);S.scene.add(lines);
    drawSel();S.request();
  }
  function drawSel(){
    if(selLines){S.scene.remove(selLines);selLines.geometry.dispose();selLines=null}
    S.untag();mark.visible=false;if(selIdx==null)return;
    const arr=[];edges.forEach(([a,b])=>{if((a===selIdx||b===selIdx)&&vis[a]&&vis[b])arr.push(...P[a],...P[b])});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));selLines=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:p.accent}));S.scene.add(selLines);
    mark.position.set(...P[selIdx]);mark.scale.setScalar(size(pts[selIdx])*3);mark.material.color.set(p.accent);mark.visible=true;
    S.tag(snip(pts[selIdx][7]),[P[selIdx][0],P[selIdx][1]+.9,P[selIdx][2]]);
  }
  const defTip='<span class="t">Each ball is one review (a sample of '+fmtInt(N)+'). Hover, or tap a ball to select it and read the review. Lines join reviews with similar wording.</span>';
  RS.apply=apply;apply();
  ui.setTip(defTip);
  const tipFor=i=>{const q=pts[i];return `<b style="color:${cols[q[3]]}">${esc(R.cats[q[3]])}</b> · ${q[4]}★ · ${fmtMonth(R.months[q[5]])}<div class="t">${esc(q[7])}</div>${q[9]&&q[9]!==q[7]?`<div class="t" style="font-style:italic;opacity:.75">${esc(q[9])}</div>`:''}<div class="t"><b>${q[8]==null?'Order not delivered, so no delivery date.':q[8]>0?'Order arrived '+Math.round(q[8])+' day'+(Math.round(q[8])===1?'':'s')+' after the estimate.':'Order arrived on time.'}</b></div>`};
  const idOf=h=>(h&&h.instanceId!=null&&vis[h.instanceId])?h.instanceId:null;
  function setSel(i){selIdx=i;nb=new Set();if(i!=null)edges.forEach(([a,b])=>{if(a===i)nb.add(b);if(b===i)nb.add(a)});apply();ui.setTip(i!=null?tipFor(i)+'<div class="t">Highlighted lines lead to the most similar reviews. Click it again, or empty space, to clear.</div>':defTip)}
  S.pickRaw([mesh],h=>{if(selIdx!=null)return;const i=idOf(h);if(i==null){mark.visible=false;ui.setTip(defTip);S.request();return}
      mark.material.color.set(p.text);mark.position.set(...P[i]);mark.scale.setScalar(size(pts[i])*1.6);mark.visible=true;ui.setTip(tipFor(i));S.request()},
    h=>{const i=idOf(h);setSel(i!=null&&i!==selIdx?i:null)});
  S.finish();
  return {...S,apply};
}

/* ---------- 2. Delivery surface ---------- */
function fillGrid(z){const nx=z.length,nz=z[0].length;let o=z.map(r=>[...r]);
  for(let k=0;k<12;k++){let ch=false;const nx2=o.map(r=>[...r]);
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){if(o[i][j]!=null)continue;const vs=[];for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){const v=o[i+a]&&o[i+a][j+b];if(v!=null)vs.push(v)}if(vs.length){nx2[i][j]=vs.reduce((a,b)=>a+b,0)/vs.length;ch=true}}
    o=nx2;if(!ch)break}
  const f=z.flat().filter(v=>v!=null),mean=f.length?f.reduce((a,b)=>a+b,0)/f.length:3;return o.map(r=>r.map(v=>v==null?mean:v))}
export function buildSurface(host,ui,U){
  const S=makeScene(host,ui);const p=S.p,nx=U.delayLabels.length,nz=U.freightCentres.length,SP=1.7,YK=1.2;
  const F=fillGrid(U.z),w=(nx-1)*SP+2,d=(nz-1)*SP+2,h=4*YK,x0=-((nx-1)*SP)/2,z0=-((nz-1)*SP)/2,flat=F.flat(),mn=Math.min(...flat),mx=Math.max(...flat);
  const yOf=s=>(Math.min(5,Math.max(1,s))-1)*YK;
  S.axes({w,h,d,
    xt:U.delayLabels.map((l,i)=>({v:x0+i*SP,t:l})),
    zt:U.freightCentres.map((f,j)=>({v:z0+j*SP,t:'R$ '+f})),
    yt:[1,2,3,4,5].map(s=>({v:yOf(s),t:s+'★'})),
    xTitle:'Delivery vs estimated date  →  later',zTitle:'Freight cost per order →',yTitle:'Average review score',xShort:'Days vs estimate →',zShort:'Freight →',yShort:'Avg score'});
  const pos=[],col=[],idx=[];
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const s=F[i][j];pos.push(x0+i*SP,yOf(s),z0+j*SP);const c=mix(p.low,p.high,1-(s-mn)/(mx-mn||1));col.push(c.r,c.g,c.b)}
  for(let i=0;i<nx-1;i++)for(let j=0;j<nz-1;j++){const a=i*nz+j,b=(i+1)*nz+j,c=i*nz+j+1,e=(i+1)*nz+j+1;idx.push(a,b,c,b,e,c)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  S.scene.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.8})));
  S.scene.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:p.text,wireframe:true,transparent:true,opacity:.25})));
  const dots=[],cell=[];
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){if(U.z[i][j]==null||U.n[i][j]<10)continue;
    const m=new THREE.Mesh(new THREE.SphereGeometry(.15,12,12),new THREE.MeshBasicMaterial({color:p.text}));m.position.set(x0+i*SP,yOf(F[i][j])+.02,z0+j*SP);S.scene.add(m);dots.push(m);cell.push([i,j]);
    S.label(U.z[i][j].toFixed(1),[x0+i*SP,yOf(F[i][j])+.5,z0+j*SP],'val')}
  S.pickSel(dots,'<span class="t">Numbers on the surface are average scores. Hover, or tap a dot to select it and see its order count.</span>',o=>{const [i,j]=cell[dots.indexOf(o)];return `<b>${esc(U.delayLabels[i])}</b> · freight about R$ ${U.freightCentres[j]}<div class="t">Average score ${U.z[i][j].toFixed(2)}★ from ${fmtInt(U.n[i][j])} orders</div>`},
    (sel,hov)=>{dots.forEach(d=>{d.scale.setScalar(d===sel?2.4:d===hov?1.6:1);d.material.color.set(d===sel?p.accent:p.text)});S.drop(sel?sel.position:null);
      if(sel){const [i,j]=cell[dots.indexOf(sel)];S.tag(U.z[i][j].toFixed(2)+'★',[sel.position.x,sel.position.y+.9,sel.position.z])}else S.untag()});
  S.finish();
  return S;
}

/* ---------- 3. States: delivery speed, late share, revenue and score ---------- */
export const MIN_STATE_ORDERS=30;
export const usableStates=(all)=>all.filter(s=>s.orders>=MIN_STATE_ORDERS&&s.avgDays!=null&&s.lateRate!=null&&s.avgScore!=null);
export function buildStates(host,ui,all){
  const S=makeScene(host,ui);const p=S.p;
  const st=usableStates(all),W=12,Dp=8,MAXH=6,COL=.3;
  const maxRev=Math.max(...st.map(s=>s.revenue),1),sc=st.map(s=>s.avgScore),smin=Math.min(...sc),smax=Math.max(...sc);
  const xLo=Math.floor(Math.min(...st.map(s=>s.avgDays))-1),xHi=Math.ceil(Math.max(...st.map(s=>s.avgDays))+1),zHi=Math.max(...st.map(s=>s.lateRate),.05)*1.15;
  const X=v=>((v-xLo)/(xHi-xLo))*W-W/2,Z=v=>(v/zHi)*Dp-Dp/2;
  S.axes({w:W,h:MAXH+.4,d:Dp,
    xt:niceTicks(xLo,xHi,5).map(v=>({v:X(v),t:v+' days'})),
    zt:niceTicks(0,zHi,4).map(v=>({v:Z(v),t:Math.round(v*100)+'% late'})),
    yt:[.25,.5,.75,1].map(t=>({v:t*MAXH,t:fmtMoney(t*t*maxRev)})),
    xTitle:'Average delivery time (days) →',zTitle:'Share of orders delivered late →',yTitle:'Revenue (square-root scale)',
    xShort:'Days →',zShort:'Late % →',yShort:'Revenue'});
  const byRev=[...st].sort((a,b)=>b.revenue-a.revenue),top=byRev.slice(0,8).map(s=>s.state),top3=byRev.slice(0,3).map(s=>s.state);
  const worst=[...st].sort((a,b)=>b.avgDays-a.avgDays).slice(0,3).map(s=>s.state),meshes=[];
  st.forEach(s=>{const hh=Math.max(.08,Math.sqrt(s.revenue/maxRev)*MAXH),t=1-(s.avgScore-smin)/(smax-smin||1);
    const m=new THREE.Mesh(new THREE.BoxGeometry(COL,hh,COL),new THREE.MeshStandardMaterial({color:mix(p.low,p.high,.2+.8*t)}));
    m.position.set(X(s.avgDays),hh/2,Z(s.lateRate));m.userData.s=s;S.scene.add(m);meshes.push(m);
    const nar=host.clientWidth<520;if(nar?top3.includes(s.state):(top.includes(s.state)||worst.includes(s.state))){const b3=top3.includes(s.state);S.label(b3?`${s.state} ${fmtMoney(s.revenue)}`:s.state,[m.position.x,hh+.35,m.position.z],b3?'lab strong':'lab')}});
  S.pickSel(meshes,'<span class="t">Each column is a state. The biggest earners and the slowest states are labelled. Hover, or tap a column to select it.</span>',o=>{const s=o.userData.s;return `<b>${s.state}</b> · ${fmtMoney(s.revenue)} · ${fmtInt(s.orders)} orders<div class="t">${s.avgDays.toFixed(1)} days to deliver · ${fmtPct(s.lateRate,0)} late · ${s.avgScore.toFixed(2)}★ average</div>`},
    (sel,hov)=>{meshes.forEach(m=>{const mt=m.material;mt.transparent=true;mt.opacity=sel&&m!==sel?.28:1;mt.emissive.set(m===sel?p.accent:m===hov?p.text:0x000000);mt.emissiveIntensity=m===sel?.7:.25});
      S.drop(sel?new THREE.Vector3(sel.position.x,sel.geometry.parameters.height,sel.position.z):null);
      if(sel){const s=sel.userData.s;S.tag(`${s.state} · ${fmtMoney(s.revenue)}`,[sel.position.x,sel.geometry.parameters.height+.9,sel.position.z])}else S.untag()});
  S.finish();
  return S;
}

/* ---------- 4. Seller bubbles ---------- */
export function buildSellers(host,ui,sl,onTimeRate){
  const S=makeScene(host,ui);const p=S.p,W=9,H=5.5,Dp=6.5;
  const risk=s=>s.lateRate>.2||s.rating<4;
  const oMin=Math.min(...sl.map(s=>s.orders))*.8,oMax=Math.max(...sl.map(s=>s.orders))*1.25,xMin=Math.log10(oMin),xMax=Math.log10(oMax);
  const rMin=Math.floor((Math.min(...sl.map(s=>s.rating))-.05)*4)/4,rMax=Math.min(5,Math.ceil((Math.max(...sl.map(s=>s.rating))+.05)*4)/4);
  const dMin=0,dMax=Math.max(...sl.map(s=>s.lateRate),1-onTimeRate)*1.15,maxRev=Math.max(...sl.map(s=>s.revenue),1);
  const X=o=>((Math.log10(o)-xMin)/(xMax-xMin||1))*W-W/2,Y=r=>((r-rMin)/(rMax-rMin||1))*H,Z=dl=>((dl-dMin)/(dMax-dMin||1))*Dp-Dp/2;
  const ot=[10,20,50,100,200,500,1000,2000,5000].filter(o=>o>=oMin&&o<=oMax);
  S.axes({w:W,h:H,d:Dp,
    xt:ot.map(o=>({v:X(o),t:fmtInt(o)})),
    yt:niceTicks(rMin,rMax,4).map(r=>({v:Y(r),t:r.toFixed(2).replace(/0$/,'')+'★'})),
    zt:niceTicks(dMin,dMax,4).map(dl=>({v:Z(dl),t:Math.round(dl*100)+'% late'})),
    xTitle:'Orders shipped (log scale) →',zTitle:'Share of orders delivered late →',yTitle:'Average review score',xShort:'Orders (log) →',zShort:'Late % →',yShort:'Rating'});
  const zero=Z(1-onTimeRate);
  if(zero>-Dp/2&&zero<Dp/2){const pl=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({color:p.orange,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));pl.position.set(0,H/2,zero);S.scene.add(pl)}
  const ms=[];
  sl.forEach(s=>{const r=.07+.25*Math.sqrt(s.revenue/maxRev);const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,20),new THREE.MeshStandardMaterial({color:risk(s)?p.orange:p.blue,transparent:true,opacity:.88}));
    m.position.set(X(s.orders),Y(s.rating),Z(s.lateRate));m.userData.s=s;S.scene.add(m);ms.push(m)});
  const pick=new Set([...[...sl].sort((a,b)=>b.revenue-a.revenue).slice(0,3),...[...sl].sort((a,b)=>b.lateRate-a.lateRate).slice(0,2),...[...sl].sort((a,b)=>a.rating-b.rating).slice(0,2)]);
  pick.forEach(s=>S.label(shortId(s),[X(s.orders),Y(s.rating)+.75,Z(s.lateRate)],'lab strong',risk(s)?p.orange:p.blue));
  S.pickSel(ms,'<span class="t">The orange plane marks the marketplace-wide late rate. Labels mark the three biggest sellers and the worst performers. Hover, or tap a bubble to select it.</span>',o=>{const s=o.userData.s;return `<b>Seller ${esc(shortId(s))}</b> · ${risk(s)?'at risk':'healthy'}<div class="t">${fmtInt(s.orders)} orders · ${s.rating.toFixed(2)}★ · ${fmtPct(s.lateRate,0)} of orders late · ${fmtMoney(s.revenue)}</div>`},
    (sel,hov)=>{ms.forEach(m=>{m.material.opacity=sel?(m===sel?1:.22):(m===hov?1:.88);m.scale.setScalar(m===sel?1.6:m===hov?1.25:1)});
      S.drop(sel?sel.position:null);
      if(sel){const s=sel.userData.s;S.tag(`${shortId(s)} · ${s.rating.toFixed(1)}★ · ${fmtPct(s.lateRate,0)} late`,[sel.position.x,sel.position.y+.95,sel.position.z])}else S.untag()});
  S.finish();
  return S;
}
