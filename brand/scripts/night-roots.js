// Night Roots v2: mangrove prop-root clusters at three depths on night water. No reflections.
// Pure function so the same code runs in Node (make-textures.js) and in the Figma plugin API.
function nightRoots(){
  const W = 1920, H = 1080, WL = 640;
  let seed = 101; const rnd = () => { seed = (seed*16807) % 2147483647; return (seed-1)/2147483646; };
  const f = n => Math.round(n*10)/10;
  const mix = (a, b, k) => { const p = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16)); const A = p(a), B = p(b);
    return '#' + A.map((v,i) => Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join(''); };
  let defs = `<linearGradient id="nr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#08120F"/><stop offset="1" stop-color="#0E1D19"/></linearGradient>
<linearGradient id="nr-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10241F"/><stop offset=".35" stop-color="#0B1714"/><stop offset="1" stop-color="#060D0B"/></linearGradient>
<linearGradient id="nr-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4DB3AB" stop-opacity=".16"/><stop offset="1" stop-color="#4DB3AB" stop-opacity="0"/></linearGradient>
<radialGradient id="nr-node"><stop offset="0" stop-color="#C8D545" stop-opacity=".55"/><stop offset="1" stop-color="#C8D545" stop-opacity="0"/></radialGradient>`;
  let p = `<rect width="${W}" height="${WL}" fill="url(#nr-sky)"/><rect y="${WL}" width="${W}" height="${H-WL}" fill="url(#nr-water)"/>`;
  p += `<rect y="${WL}" width="${W}" height="120" fill="url(#nr-glow)"/>`;
  // faint surface glints, denser near the waterline
  for(let i=0;i<46;i++){ const d = Math.pow(rnd(),1.8), y = WL+6+d*360, x = rnd()*W, l = 30+rnd()*260*(1-d*.6);
    p += `<path d="M${f(x)} ${f(y)} H${f(x+l)}" stroke="#4DB3AB" stroke-opacity="${f((.22-d*.18)*(.5+rnd()*.5)*100)/100}" stroke-width="1.2" stroke-linecap="round"/>`; }
  // clusters: [trunk x, scale, depth 0 = far .. 1 = near]
  const clusters = [[640,.42,0],[1830,.48,0],[240,.62,.45],[1010,.58,.4],[1460,1,1]];
  const nodes = [];
  for(const [cx, s, depth] of clusters){
    const far = 1-depth;
    const col = mix('#8A5A3B', '#2F5A52', far*.75), rim = mix('#C08A62', '#4E7F76', far*.75);
    const op = .45 + depth*.5, top = WL - 330*s;
    // trunk, fading upward
    const gid = 'nr-t' + Math.round(cx);
    defs += `<linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${col}" stop-opacity="${f(op*100)/100}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient>`;
    p += `<path d="M${cx} ${f(WL-40*s)} C${f(cx-6*s)} ${f(WL-160*s)} ${f(cx+8*s)} ${f(WL-240*s)} ${f(cx)} ${f(top)}" stroke="url(#${gid})" stroke-width="${f(12*s+2)}" stroke-linecap="round" fill="none"/>`;
    const n = Math.round(8 + 8*s);
    const bez = (a,b,c,d,t) => { const u = 1-t; return u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d; };
    const root = (d, w) => {
      p += `<path d="${d}" stroke="${col}" stroke-opacity="${f(op*100)/100}" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`;
      if(depth > .3) p += `<path d="${d}" stroke="${rim}" stroke-opacity="${f(op*40)/100}" stroke-width="${f(Math.max(.8,w*.25))}" fill="none" stroke-linecap="round" transform="translate(${f(-w*.3)} ${f(-w*.3)})"/>`;
    };
    for(let k=0;k<n;k++){
      const side = k%2 ? 1 : -1, reach = side*(60 + Math.pow(rnd(),.7)*320)*s;
      const ys = WL - (40 + rnd()*200)*s, ye = WL + (40 + rnd()*260)*s*(.6+depth*.4);
      // out from the trunk, an elbow, then a steep drop into the water
      const X = [cx, cx+reach*.55, cx+reach*.96, cx+reach], Y = [ys, ys-(8+rnd()*22)*s, ys+(ye-ys)*.18, ye];
      const w = (3 + rnd()*4)*s + .6;
      root(`M${f(X[0])} ${f(Y[0])} C${f(X[1])} ${f(Y[1])} ${f(X[2])} ${f(Y[2])} ${f(X[3])} ${f(Y[3])}`, w);
      // a thinner sibling splitting off below the elbow
      if(rnd() < .6){ const t = .62 + rnd()*.15, bx = bez(...X,t), by = bez(...Y,t), off = side*(18 + rnd()*60)*s, be = ye + (rnd()-.3)*60*s;
        root(`M${f(bx)} ${f(by)} C${f(bx+off*.4)} ${f(by+10*s)} ${f(bx+off)} ${f(by+(be-by)*.3)} ${f(bx+off)} ${f(be)}`, w*.55);
        if(rnd() < .35) nodes.push([bx+off, be, s, depth]); }
      if(rnd() < .3) nodes.push([X[3], Y[3], s, depth]);
    }
  }
  // evidence nodes at root tips: a soft halo and a crisp dot
  for(const [x, y, s, depth] of nodes){ const r = (2 + depth*1.4)*Math.max(.6,s);
    p += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r*5)}" fill="url(#nr-node)" opacity="${f((.3+depth*.4)*100)/100}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#C8D545" fill-opacity="${f((.55+depth*.4)*100)/100}"/>`; }
  p += `<path d="M0 ${WL} H${W}" stroke="#4DB3AB" stroke-opacity=".6" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs}</defs>${p}</svg>\n`;
}
if (typeof module !== 'undefined') module.exports = nightRoots;
