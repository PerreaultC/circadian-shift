#!/usr/bin/env python3
"""Regenerate the PWA icons. Only needed if the PNGs are missing."""
from PIL import Image, ImageDraw

def make(sz):
    S = sz * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * .22), fill=(255, 255, 255, 255))
    m = int(S * .205); box = [m, m, S - m, S - m]
    d.pieslice(box, -90, 90, fill=(31, 90, 128, 255))     # night half
    d.pieslice(box, 90, 270, fill=(168, 105, 12, 255))    # day half
    d.ellipse(box, outline=(17, 17, 17, 255), width=int(S * .039))
    c = S // 2; ir = int(S * .086)
    d.ellipse([c - ir, c - ir, c + ir, c + ir], fill=(255, 255, 255, 255))
    lw = int(S * .043)
    d.line([c, int(S * .371), c, c], fill=(17, 17, 17, 255), width=lw)
    d.line([c, c, int(c + S * .09), int(c + S * .055)], fill=(17, 17, 17, 255), width=lw)
    return im.resize((sz, sz), Image.LANCZOS)

for s in (180, 192, 512):
    make(s).save('icon-%d.png' % s)
print('wrote icon-180.png icon-192.png icon-512.png')
