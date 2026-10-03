# Rebuilds brand/logo/source/reference-icon.png as clean vector geometry in brand colors.
#  - Leaves: measured axis, length and width profile; redrawn as smooth two-curve leaves.
#  - Trunk: one straight stroke. Petioles: straight strokes fitted to their pixels.
#  - Roots: each traced from its tip to the trunk along the skeleton, fitted with a smooth spline.
# Run: python brand/scripts/trace-logo.py
import os, math, numpy as np
from PIL import Image
from scipy.ndimage import label as cc_label, distance_transform_edt, binary_opening, binary_closing
from scipy.interpolate import splprep, splev
from skimage.morphology import skeletonize

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
img = np.asarray(Image.open(os.path.join(ROOT, 'logo', 'source', 'reference-icon.png')).convert('RGB')).astype(float)
BG = np.array([255, 254, 249])
SRC = {'green': (166,195,66), 'red': (239,87,11), 'amber': (255,170,1), 'orange': (255,119,0)}
lum = img @ np.array([.299, .587, .114]); chroma = img.max(-1) - img.min(-1)
fg = ((img - BG)**2).sum(-1) > 30**2
wood = binary_closing(binary_opening(fg & (lum < 170) & (chroma < 45), iterations=1), iterations=2)
leafmask = fg & (chroma >= 45)
H, W_ = wood.shape

ys, xs = np.where(fg)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
pad = 24; side = max(y1-y0, x1-x0) + 2*pad
ox = x0 - (side - (x1-x0))/2; oy = y0 - (side - (y1-y0))/2
T = lambda x, y: (x - ox, y - oy)
fmt = lambda v: f'{v:.1f}'
q = lambda p: f'{fmt(p[0])} {fmt(p[1])}'

dist = distance_transform_edt(wood)
# trunk position used to orient leaves (measured)
trunk_x = 448.5

# ---------- leaves ----------
def leaf_curve(L, k1, k2, A, n=60):
    t = np.linspace(0, 1, n)
    P = [np.array(v) for v in ([0, 0], [k1*L, -A], [L-k2*L, -A], [L, 0])]
    return ((1-t)**3)[:,None]*P[0] + (3*(1-t)**2*t)[:,None]*P[1] + (3*(1-t)*t**2)[:,None]*P[2] + (t**3)[:,None]*P[3]

leaves = []
lab, n = cc_label(leafmask)
lc = np.array(list(SRC.values())); roles = list(SRC)
for i in range(1, n+1):
    reg = lab == i
    if reg.sum() < 2000: continue
    yy, xx = np.where(reg); pts = np.stack([xx, yy], 1).astype(float)
    cen = pts.mean(0); _, _, vt = np.linalg.svd(pts - cen, full_matrices=False)
    axis = vt[0]
    pr = (pts - cen) @ axis
    lo, hi = np.percentile(pr, .2), np.percentile(pr, 99.8)
    base, tip = cen + axis*lo, cen + axis*hi
    if abs(tip[0] - trunk_x) < abs(base[0] - trunk_x): base, tip, axis = tip, base, -axis
    L = float(np.linalg.norm(tip - base)); ang = math.atan2(axis[1], axis[0])
    nrm = np.array([-axis[1], axis[0]])
    u = (pts - base) @ axis; v = (pts - base) @ nrm
    st = np.linspace(L*.05, L*.95, 25); bw = L/50
    prof = np.array([np.percentile(np.abs(v[np.abs(u-s) < bw]), 96) if (np.abs(u-s) < bw).sum() > 5 else 0 for s in st])
    best = None
    for k1 in np.linspace(.04, .55, 26):
        for k2 in np.linspace(.04, .55, 26):
            for A in np.linspace(prof.max(), prof.max()*1.6, 17):
                cv = leaf_curve(L, k1, k2, A); w = np.interp(st, cv[:,0], -cv[:,1])
                e = ((w - prof)**2).sum()
                if best is None or e < best[0]: best = (e, k1, k2, A)
    _, k1, k2, A = best
    role = roles[np.bincount(((img[reg][:,None,:] - lc[None])**2).sum(-1).argmin(-1), minlength=4).argmax()]
    leaves.append(dict(role=role, base=base, ang=ang, L=L, k1=k1, k2=k2, A=A, reg=reg))

def leaf_path(lf):
    c, s = math.cos(lf['ang']), math.sin(lf['ang']); bx, by = lf['base']; L, k1, k2, A = lf['L'], lf['k1'], lf['k2'], lf['A']
    P = lambda u, v: T(bx + u*c - v*s, by + u*s + v*c)
    return (f'M{q(P(0,0))} C{q(P(k1*L,-A))} {q(P(L-k2*L,-A))} {q(P(L,0))} '
            f'C{q(P(L-k2*L,A))} {q(P(k1*L,A))} {q(P(0,0))}Z')

# ---------- wood: centerlines measured from the reference (source pixels) ----------
trunk_x, trunk_top, trunk_bot, stroke_w = 448.5, 332, 1048, 27.0
PETIOLES = [((448,402),(400,375)), ((448,470),(492,437)), ((448,530),(395,516)), ((448,612),(490,588))]
ROOTS = {
 'outer_left':  [(448,722),(420,743),(400,754),(385,770),(372,790),(358,805),(347,818),(334,830),(324,842),(311,860),(297,884),(289,900),(279,920),(272,940),(265,960),(260,980),(256,1000),(253,1020),(251.5,1040),(251.5,1050)],
 'mid_left':    [(448,786),(420,788),(400,794),(380,805),(367,818),(353,830),(342,842),(337,860),(330,884),(328,900),(325,920),(323,940),(322,960),(321,980),(321,1000),(321,1010)],
 'inner_left':  [(448,828),(431,842),(420,857),(412,868),(403,884),(396,900),(389,920),(385,940),(382,960),(380,980),(379,1000),(378.5,1020),(378.5,1030)],
 'inner_right': [(448,868),(476,885),(497,900),(511,920),(518,940),(522,960),(524,980),(526,1000),(526,1025)],
 'mid_right':   [(448,786),(476,787),(500,794),(520,802),(535,815),(549,830),(560,845),(568,860),(573,878),(576,900),(579,920),(581,940),(583,960),(584,980),(584,1000),(584,1010)],
 'outer_right': [(448,704),(476,717),(500,735),(520,757),(536,780),(548,800),(560,818),(576,836),(596,860),(606,878),(620,900),(631,920),(639,940),(647,960),(653,980),(658,1000),(662,1020),(665.5,1040),(665.5,1050)],
}
# join petioles and the trunk top into the leaves: end each stroke where the leaf is wide enough to cover it
def inset(lf, need):
    cv = leaf_curve(lf['L'], lf['k1'], lf['k2'], lf['A'], 400)
    i = int(np.argmax(-cv[:,1] >= need)); return cv[i, 0]
def into_leaf(lf, need):
    ax = np.array([math.cos(lf['ang']), math.sin(lf['ang'])]); return lf['base'] + ax*inset(lf, need)
need = stroke_w/2 + 3
petioles = []
for a, b in PETIOLES:
    a, b = np.array(a, float), np.array(b, float)
    lf = min(leaves, key=lambda l: np.linalg.norm(l['base'] - b))
    petioles.append((a, into_leaf(lf, need)))
top = min(leaves, key=lambda l: l['base'][1])
trunk_top = into_leaf(top, need)[1]

def spline(pts, smooth=40):
    a = np.array(pts, float); x, y = a[:,0], a[:,1]
    tck, _ = splprep([x, y], s=smooth, k=3)
    t = np.linspace(0, 1, 18); sx, sy = splev(t, tck)
    sx[0], sy[0], sx[-1], sy[-1] = x[0], y[0], x[-1], y[-1]
    P = [T(px, py) for px, py in zip(sx, sy)]
    d = f'M{q(P[0])}'
    for j in range(len(P)-1):
        p0, p1, p2, p3 = P[max(j-1,0)], P[j], P[j+1], P[min(j+2,len(P)-1)]
        d += f' C{fmt(p1[0]+(p2[0]-p0[0])/6)} {fmt(p1[1]+(p2[1]-p0[1])/6)} {fmt(p2[0]-(p3[0]-p1[0])/6)} {fmt(p2[1]-(p3[1]-p1[1])/6)} {q(p2)}'
    return d
root_d = [spline(v) for v in ROOTS.values()]
roots = list(ROOTS)

def svg(pal):
    sw = fmt(stroke_w); wc = pal['wood']
    body = f'<g stroke="{wc}" stroke-width="{sw}" fill="none">'
    body += f'<path d="M{q(T(trunk_x, trunk_top))} L{q(T(trunk_x, trunk_bot))}" stroke-linecap="butt"/>'
    body += ''.join(f'<path d="M{q(T(*a))} L{q(T(*b))}" stroke-linecap="butt"/>' for a, b in petioles)
    body += ''.join(f'<path d="{d}" stroke-linecap="butt" stroke-linejoin="round"/>' for d in root_d)
    body += '</g>'
    body += ''.join(f'<path d="{leaf_path(lf)}" fill="{pal[lf["role"]]}"/>' for lf in leaves)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side:.0f} {side:.0f}" fill="none" role="img" aria-label="AIDE-M">{body}</svg>\n'

LIGHT = {'green':'#C8D545', 'red':'#2B8C86', 'amber':'#4DB3AB', 'orange':'#2B8C86', 'wood':'#173A2E'}
DARK = dict(LIGHT, wood='#F4F7F5')
if __name__ == '__main__':
    open(os.path.join(ROOT, 'logo', 'mangrove-mark.svg'), 'w').write(svg(LIGHT))
    open(os.path.join(ROOT, 'logo', 'mangrove-mark-dark.svg'), 'w').write(svg(DARK))
    print('leaves', len(leaves), 'petioles', len(petioles), 'roots', len(roots))
