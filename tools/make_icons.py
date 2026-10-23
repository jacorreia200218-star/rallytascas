#!/usr/bin/env python3
"""Gera os ícones PNG da aplicação (usa apenas Pillow). Executado uma vez pelo assistente.

Uso: python3 tools/make_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

BG_TOP = (156, 52, 63)
BG_BOTTOM = (112, 30, 41)
CREAM = (251, 246, 236)
RING = (233, 218, 190)
GOLD = (217, 154, 43)
INK = (74, 36, 38)
S = 1024  # desenhar a grande e reduzir (anti-aliasing)


def gradient(size):
    img = Image.new("RGB", (size, size), BG_TOP)
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img


def draw_motif(img, scale):
    """Prato com talheres. `scale` < 1 mantém o motivo dentro da zona segura (maskable)."""
    d = ImageDraw.Draw(img)
    cx = cy = S // 2
    r = int(S * 0.30 * scale)

    # prato
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=CREAM)
    d.ellipse([cx - int(r * 0.74), cy - int(r * 0.74), cx + int(r * 0.74), cy + int(r * 0.74)], outline=RING, width=max(6, int(S * 0.012)))
    # estrela dourada ao centro (avaliação)
    import math
    sr, sr2 = r * 0.36, r * 0.15
    pts = []
    for i in range(10):
        ang = -math.pi / 2 + i * math.pi / 5
        rad = sr if i % 2 == 0 else sr2
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=GOLD)

    # garfo (esquerda)
    fx = cx - int(r * 1.26)
    top, bottom = cy - int(r * 0.80), cy + int(r * 0.85)
    w = int(S * 0.018)
    for k in (-2, 0, 2):
        d.rounded_rectangle([fx + k * w * 1.6 - w // 2, top, fx + k * w * 1.6 + w // 2, top + int(r * 0.80)], radius=w // 2, fill=CREAM)
    d.rounded_rectangle([fx - w * 3.4, top + int(r * 0.55), fx + w * 3.4, top + int(r * 0.95)], radius=w * 2, fill=CREAM)
    d.rounded_rectangle([fx - w * 0.9, top + int(r * 0.85), fx + w * 0.9, bottom], radius=w // 2, fill=CREAM)

    # faca (direita)
    kx = cx + int(r * 1.26)
    d.rounded_rectangle([kx - w * 2.2, top, kx + w * 1.6, top + int(r * 1.15)], radius=w * 2, fill=CREAM)
    d.rounded_rectangle([kx - w * 0.9, top + int(r * 1.0), kx + w * 0.9 + w * 0.2, bottom], radius=w // 2, fill=CREAM)
    return img


def make(path, size, scale, rounded=False):
    img = draw_motif(gradient(S), scale)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(path, "PNG", optimize=True)
    print("ok", path.name, size)


make(OUT / "icon-512.png", 512, 1.0)
make(OUT / "icon-192.png", 192, 1.0)
make(OUT / "icon-maskable-512.png", 512, 0.78)   # motivo mais pequeno: zona segura de 80%
make(OUT / "apple-touch-icon.png", 180, 1.0)     # o iOS aplica os cantos arredondados
