# Writes the contour-crown mark and lockup into brand/ files and the guide page. Illustrations: brand/scripts/marker.js
# Run: python brand/scripts/sync-logo.py
import os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def mark_body(dome, cut, core, root, water):
    return f'''<path d="M8 30 A24 17 0 0 1 56 30 Z" fill="{dome}"/>
  <path d="M14.5 30 A17.5 12 0 0 1 49.5 30" stroke="{cut}" stroke-width="1.7" fill="none"/>
  <path d="M22 30 A10 7.2 0 0 1 42 30 Z" fill="{core}"/>
  <path d="M32 30 V34" stroke="{root}" stroke-width="2.8" stroke-linecap="round"/>
  <g stroke="{root}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M32 33 L22 35 L13 55"/><path d="M32 34 L26 38 L22.5 55"/><path d="M32 34 L38 38 L41.5 55"/><path d="M32 33 L42 35 L51 55"/>
  </g>
  <path d="M5 44 H59" stroke="{water}" stroke-width="2.2" stroke-linecap="round"/>'''

LIGHT = mark_body('#173A2E', '#F4F7F5', '#C8D545', '#7A4E33', '#2B8C86')
DARK = mark_body('#F4F7F5', '#173A2E', '#C8D545', '#C9A07F', '#4DB3AB')

def plate_body():
    WL, p = 120, []
    for i in range(8):
        y = WL + 9 + i*8; x0 = 18 + (i*37) % 23; x1 = 120 + (i*53) % 28
        p.append(f'<path d="M{x0} {y} H{x1}" stroke="#2B8C86" stroke-opacity="{.42-i*.045:.2f}" stroke-width="1"/>')
    for i, (rx, ry, fill) in enumerate([(62,40,'#E4EAE6'),(49,31,'#F4F7F5'),(36,22,'#E4EAE6'),(23,14,'#F4F7F5')]):
        p.append(f'<path d="M{80-rx} 78 A{rx} {ry} 0 0 1 {80+rx} 78 Z" fill="{fill}" stroke="#173A2E" stroke-width="{1.8 if i==0 else 1.2}" stroke-linejoin="round"/>')
    p.append('<path d="M70 78 A10 7 0 0 1 90 78 Z" fill="#C8D545" stroke="#173A2E" stroke-width="1.2"/>')
    p.append('<path d="M80 78 V100" stroke="#7A4E33" stroke-width="3.4" stroke-linecap="round"/>')
    for k, (dx, end) in enumerate([(-54,186),(-34,176),(-16,170),(14,172),(33,180),(52,188)]):
        y0 = 90 + k % 3 * 4
        p.append(f'<path d="M80 {y0} C{80+dx*.45:.1f} {y0-6} {80+dx*.9:.1f} {y0+4} {80+dx} {end}" stroke="#7A4E33" stroke-width="2" stroke-linecap="round" fill="none"/>')
    p.append(f'<path d="M8 {WL} H152" stroke="#2B8C86" stroke-width="1.8" stroke-linecap="round"/>')
    return '\n'.join(p)

PLATE = plate_body()

def w(path, text):
    full = os.path.join(ROOT, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(text)

w('logo/mangrove-mark.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" role="img" aria-label="Mangrove">\n  {LIGHT}\n</svg>\n')
w('logo/mangrove-mark-dark.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" role="img" aria-label="Mangrove">\n  {DARK}\n</svg>\n')
w('logo/mangrove-lockup.svg', f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 64" fill="none" role="img" aria-label="Mangrove">
  {LIGHT}
  <text x="72" y="34" fill="#173A2E" font-family="Newsreader, Georgia, serif" font-size="32" font-weight="500" letter-spacing="-0.5">Mangrove</text>
  <text x="73" y="54" fill="#6B7974" font-family="'IBM Plex Mono', monospace" font-size="9.5" letter-spacing="1.2">EVIDENCE THAT HOLDS GROUND</text>
</svg>
''')
w('illustration/field-plate-mangrove.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" fill="none" role="img" aria-label="Field plate: a mangrove with a contour-line crown on stilt roots in water">\n{PLATE}\n</svg>\n')
mascot = os.path.join(ROOT, 'mascot', 'pip.svg')
if os.path.exists(mascot):
    os.remove(mascot)
    try: os.rmdir(os.path.dirname(mascot))
    except OSError: pass

# guide page
p = os.path.join(ROOT, 'index.html'); s = open(p, encoding='utf-8').read()
s = re.sub(r'(<symbol id="mark" viewBox="0 0 64 64">).*?(</symbol>)', lambda m: m.group(1) + '\n      ' + LIGHT + '\n    ' + m.group(2), s, count=1, flags=re.S)
s = re.sub(r'(<symbol id="mark-dark" viewBox="0 0 64 64">).*?(</symbol>)', lambda m: m.group(1) + '\n      ' + DARK + '\n    ' + m.group(2), s, count=1, flags=re.S)
open(p, 'w', encoding='utf-8').write(s)
print('synced')
