// Mangrove marker illustrations: bold hand-drawn outline, pale fill, white highlight streaks, one pop of contrast.
// Run: node brand/scripts/marker.js  -> writes brand/illustration/marker-*.svg
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'illustration');
const C = { canopy:'#173A2E', leaf:'#2F6B3A', fill:'#C8D545', tint:'#E3EBA6', root:'#7A4E33', rootTint:'#D9B99F',
  tidal:'#2B8C86', water:'#BFE3DE', haze:'#9DA6C6', white:'#FFFFFF', pop:'#C8D545' };
let seed = 1; const rnd = () => { seed = (seed*16807) % 2147483647; return (seed-1)/2147483646; };
const f = n => Math.round(n*10)/10;

// smooth path through points (Catmull-Rom to cubic)
function smooth(pts, closed){
  const n = pts.length; if(n < 2) return '';
  const P = i => closed ? pts[(i+n)%n] : pts[Math.max(0, Math.min(n-1, i))];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n-1;
  for(let i=0;i<last;i++){ const p0=P(i-1), p1=P(i), p2=P(i+1), p3=P(i+2);
    d += ` C${f(p1[0]+(p2[0]-p0[0])/6)} ${f(p1[1]+(p2[1]-p0[1])/6)} ${f(p2[0]-(p3[0]-p1[0])/6)} ${f(p2[1]-(p3[1]-p1[1])/6)} ${f(p2[0])} ${f(p2[1])}`; }
  return closed ? d + 'Z' : d;
}
const wob = (pts, a) => pts.map(([x,y]) => [x+(rnd()-.5)*a, y+(rnd()-.5)*a]);
// a marker stroke: main pass plus a slightly offset second pass, so the edge looks hand-made
function ink(pts, color, w, closed=false, extra=''){
  const a = smooth(wob(pts, w*.35), closed), b = smooth(wob(pts, w*.35), closed);
  return `<path d="${a}" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round" fill="none" ${extra}/>` +
         `<path d="${b}" stroke="${color}" stroke-width="${f(w*.8)}" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".85"/>`;
}
const rot = (x, y, a) => [x*Math.cos(a) - y*Math.sin(a), x*Math.sin(a) + y*Math.cos(a)];
// leaf from base (bx,by): long, pointed mangrove leaf with one or two white streaks
function leaf(bx, by, len, wid, ang, o = {}){
  const N = 16, L = [], R = [], skew = (rnd()-.5)*.25;
  for(let i=0;i<=N;i++){ const t = i/N, hw = wid*Math.pow(Math.sin(Math.PI*Math.pow(t,.85)), 1.05)*(1-t*.25);
    const [x1,y1] = rot(t*len, -hw*(1+skew), ang), [x2,y2] = rot(t*len, hw*(1-skew), ang); L.push([bx+x1, by+y1]); R.push([bx+x2, by+y2]); }
  const outline = L.concat(R.slice(1,-1).reverse());
  const w = o.w || Math.max(7, len*.09);
  let s = `<path d="${smooth(wob(outline, w*.25), true)}" fill="${o.fill || C.tint}"/>`;
  const streaks = rnd() < .5 ? [-.28] : [-.32, .2];
  for(const off of streaks){ const pts = [];
    for(let i=3;i<=11;i++){ const t = i/16, hw = wid*Math.sin(Math.PI*t)*off; const [x,y] = rot(t*len, hw, ang); pts.push([bx+x, by+y]); }
    s += `<path d="${smooth(wob(pts, 1.5), false)}" stroke="${C.white}" stroke-width="${f(w*.7)}" stroke-linecap="round" fill="none"/>`; }
  s += ink(outline, o.ink || C.leaf, w, true);
  return s;
}
// a fan of leaves opening upward from a tip
function rosette(x, y, n, len, wid, dir = -Math.PI/2, spread = 2.2){
  let s = ''; for(let i=0;i<n;i++){ const a = dir - spread/2 + spread*(i+.5)/n + (rnd()-.5)*.18; s += leaf(x, y, len*(.85+rnd()*.3), wid, a); } return s; }
const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}</svg>\n`;
const dot = (x, y, r, c) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${c}" stroke="${C.canopy}" stroke-width="4"/>`;

// 1. Sprig: a forked stem, each tip opening into a rosette of long leaves, a bud as the pop (photo 2)
function sprig(){ seed = 11; let s = '', leaves = '';
  const main = [[300,575],[296,470],[305,380],[300,300]];
  const left = [[300,390],[250,330],[205,300]], right = [[302,420],[360,360],[410,340]];
  s += ink(main, C.root, 16) + ink(left, C.root, 12) + ink(right, C.root, 12);
  leaves += rosette(205, 300, 4, 120, 30, -Math.PI*.62, 1.9);
  leaves += rosette(410, 340, 4, 115, 28, -Math.PI*.38, 1.9);
  leaves += rosette(300, 300, 5, 150, 36, -Math.PI/2, 2.3);
  return svg(600, 600, s + leaves + dot(300, 300, 15, C.pop)); }

// 2. Sapling standing in water, hills behind (photo 3)
function sapling(){ seed = 23; let s = '';
  s += ink([[20,330],[110,250],[190,232],[260,268],[320,300]], C.haze, 7);
  s += ink([[360,300],[440,240],[520,236],[590,290]], C.haze, 7);
  for(let i=0;i<6;i++){ const y = 380 + i*34, x0 = 40 + rnd()*60, x1 = 520 + rnd()*60;
    s += ink([[x0,y],[(x0+x1)/2, y+(rnd()-.5)*8],[x1,y]], i ? C.water : C.tidal, i ? 9 : 8); }
  for(let i=0;i<4;i++){ const y = 392 + i*34; s += `<path d="M${f(140+rnd()*200)} ${y} h${f(40+rnd()*60)}" stroke="${C.white}" stroke-width="5" stroke-linecap="round"/>`; }
  const roots = [[-150,505,270],[-95,470,300],[-48,530,322],[22,500,330],[70,540,312],[118,470,292],[160,500,268]];
  for(const [dx, end, ys] of roots){ const pts = [[300,ys],[300+dx*.5,ys-8+rnd()*12],[300+dx*.93,ys+50],[300+dx,end]];
    s += ink(pts, C.root, 12); s += `<path d="${smooth(pts.slice(1,3).map(([a,b]) => [a-2,b-5]), false)}" stroke="${C.rootTint}" stroke-width="4" stroke-linecap="round" fill="none"/>`; }
  s += ink([[300,330],[296,240],[302,150]], C.root, 22);
  s += ink([[299,230],[215,170]], C.root, 13) + ink([[301,210],[390,150]], C.root, 13) + ink([[300,190],[260,120]], C.root, 10);
  s += rosette(215, 170, 5, 120, 30, -Math.PI*.72, 2.3) + rosette(390, 150, 5, 120, 30, -Math.PI*.28, 2.3) + rosette(260, 120, 4, 105, 26, -Math.PI*.6, 2) + rosette(305, 150, 5, 135, 32, -Math.PI/2, 2.4);
  return svg(600, 600, s); }

// 3. Root tangle catching light, a channel of turquoise between (photo 1)
function tangle(){ seed = 37; let s = '';
  s += ink([[40,420],[160,380],[300,410],[440,380],[560,410]], C.water, 46);
  s += ink([[60,412],[200,392]], C.white, 8) + ink([[330,402],[470,388]], C.white, 8);
  for(let k=0;k<7;k++){ const pts = []; let x = 40 + rnd()*120, y = 200 + rnd()*260;
    for(let i=0;i<6;i++){ pts.push([x,y]); x += 60 + rnd()*60; y += (rnd()-.5)*150; }
    s += ink(pts, C.root, 15 + rnd()*8);
    s += `<path d="${smooth(pts.slice(1,4).map(([a,b]) => [a-3,b-6]), false)}" stroke="${C.rootTint}" stroke-width="4" stroke-linecap="round" fill="none"/>`; }
  return svg(600, 600, s); }

// 4. Propagule: the long seed pod hanging from a leaf pair
function propagule(){ seed = 41; let s = '';
  s += ink([[300,150],[302,185]], C.root, 10);
  s += rosette(300, 172, 4, 130, 32, -Math.PI/2, 2.6);
  const pod = []; for(let i=0;i<=20;i++){ const t = i/20, w = 20*Math.sin(Math.PI*Math.min(1,t*1.15))*(1-t*.55) + 4; pod.push([300-w, 190+t*360]); }
  const pod2 = pod.map(([x,y]) => [600-x, y]).reverse();
  const outline = pod.concat(pod2);
  s += `<path d="${smooth(wob(outline,3), true)}" fill="${C.rootTint}"/>`;
  s += `<path d="${smooth([[290,230],[288,330],[292,440]], false)}" stroke="${C.white}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  s += ink(outline, C.root, 10, true);
  s += dot(301, 556, 11, C.fill);
  return svg(600, 600, s); }

// 5. Channel winding through, roots on both banks
function channel(){ seed = 53; let s = '';
  const mid = [[90,600],[180,470],[150,350],[290,250],[300,140],[430,40]];
  s += ink(mid, C.water, 120); s += ink(mid, C.tidal, 10, false, 'opacity=".0"');
  s += ink(mid.map(([x,y]) => [x-42,y+6]), C.tidal, 8) + ink(mid.map(([x,y]) => [x+46,y-4]), C.tidal, 8);
  s += ink([[160,500],[175,440]], C.white, 8) + ink([[260,290],[300,230]], C.white, 8);
  for(let i=0;i<9;i++){ const side = i%2 ? 1 : -1, t = i/9, base = mid[Math.min(5, Math.floor(t*6))], x = base[0] + side*(90+rnd()*40), y = base[1] - 20;
    s += ink([[x,y],[x+side*20,y-40],[x+side*45,y-10],[x+side*60,y+30]], C.root, 9); }
  return svg(600, 600, s); }

// 6. Shoreline: low hills, tide lines, small saplings
function shoreline(){ seed = 61; let s = '';
  s += ink([[10,300],[120,230],[230,250],[330,300]], C.haze, 8) + ink([[300,300],[420,210],[540,230],[595,280]], C.haze, 8);
  for(let i=0;i<5;i++){ const y = 340 + i*42; s += ink([[30+rnd()*40,y],[300,y+(rnd()-.5)*10],[560+rnd()*30,y]], i===0 ? C.tidal : C.water, i===0 ? 8 : 10); }
  for(const [x, sc] of [[150,.6],[330,.9],[470,.5]]){ const base = 340;
    for(const dx of [-30,-12,12,30]) s += ink([[x,base-30*sc],[x+dx*sc*.6,base-34*sc],[x+dx*sc,base+10]], C.root, 6);
    s += ink([[x,base-28*sc],[x,base-80*sc]], C.root, 8);
    s += rosette(x, base-80*sc, 5, 60*sc, 16*sc, -Math.PI/2, 2.6); }
  s += dot(520, 110, 22, C.pop);
  return svg(600, 600, s); }

const all = { sprig, sapling, tangle, propagule, channel, shoreline };
if (require.main === module){
  fs.mkdirSync(OUT, { recursive: true });
  for(const [k, fn] of Object.entries(all)) fs.writeFileSync(path.join(OUT, `marker-${k}.svg`), fn());
  console.log('wrote', Object.keys(all).map(k => `marker-${k}.svg`).join(', '));
}
module.exports = all;
