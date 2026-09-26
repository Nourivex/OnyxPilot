#!/usr/bin/env python3
"""Build ikon activity bar dari file kerja Inkscape.

    npm run icon  (atau: python3 scripts/build-icon.py)

Alur:  resources/OnyxPilot.svg  (file kerja user, kondisi apapun)
    -> resources/onyx-bar.svg   (bersih, viewBox pas, siap VS Code)

Yang dilakukan skrip (tanpa mengubah artwork/warna user):
  1. Buang cruft Inkscape/Sodipodi (namedview, defs kosong, metadata,
     atribut inkscape:*, namespace tak terpakai).
  2. Pertahankan struktur <g transform> + semua atribut gambar persis apa adanya.
  3. Hitung bounding box isi (termasuk offset translate ancestor) lalu set
     viewBox = bbox + padding, supaya tidak ter-clip / tidak render kosong.
  4. Validasi ulang hasil (XML parse + minimal 1 elemen gambar).

Keluar non-zero bila gagal (aman dirangkai dengan &&).
"""

import re
import sys
import xml.dom.minidom as minidom

SRC = "resources/OnyxPilot.svg"
DST = "resources/onyx-bar.svg"
DROP_TAGS = {"defs", "sodipodi:namedview", "metadata", "title", "desc"}
NUM_RE = re.compile(r"-?\d+(?:\.\d+)?(?:[eE]-?\d+)?")
TRANSLATE_RE = re.compile(
    r"translate\(\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)?\s*\)"
)

SHAPE_ATTRS = {
    "image": ("x", "y", "width", "height"),
    "rect": ("x", "y", "width", "height"),
    "circle": ("cx", "cy", "r"),
    "ellipse": ("cx", "cy", "rx", "ry"),
}


def num(el, name, default=0.0):
    try:
        return float(el.getAttribute(name) or default)
    except ValueError:
        return float(default)


def ancestor_offset(node):
    """Jumlahkan translate(tx,ty) dari semua ancestor <g>."""
    tx, ty = 0.0, 0.0
    p = node.parentNode
    while p is not None and p.nodeType == p.ELEMENT_NODE:
        if p.tagName == "g":
            m = TRANSLATE_RE.search(p.getAttribute("transform") or "")
            if m:
                tx += float(m.group(1))
                ty += float(m.group(2) or 0.0)
        p = p.parentNode
    return tx, ty


def element_bbox(el):
    """(minx, miny, maxx, maxy) lokal elemen, atau None bila tak dikenal."""
    tag = el.tagName
    if tag == "path":
        nums = [float(n) for n in NUM_RE.findall(el.getAttribute("d") or "")]
        if len(nums) < 2:
            return None
        xs, ys = nums[0::2], nums[1::2]
        return (min(xs), min(ys), max(xs), max(ys))
    if tag in ("image", "rect"):
        x, y = num(el, "x"), num(el, "y")
        return (x, y, x + num(el, "width"), y + num(el, "height"))
    if tag == "circle":
        cx, cy, r = num(el, "cx"), num(el, "cy"), num(el, "r")
        return (cx - r, cy - r, cx + r, cy + r)
    if tag == "ellipse":
        cx, cy = num(el, "cx"), num(el, "cy")
        return (cx - num(el, "rx"), cy - num(el, "ry"),
                cx + num(el, "rx"), cy + num(el, "ry"))
    if tag == "line":
        return (min(num(el, "x1"), num(el, "x2")),
                min(num(el, "y1"), num(el, "y2")),
                max(num(el, "x1"), num(el, "x2")),
                max(num(el, "y1"), num(el, "y2")))
    if tag in ("polyline", "polygon"):
        nums = [float(n) for n in NUM_RE.findall(el.getAttribute("points") or "")]
        if len(nums) < 2:
            return None
        xs, ys = nums[0::2], nums[1::2]
        return (min(xs), min(ys), max(xs), max(ys))
    return None


def clean_attrs(el):
    """Buang atribut inkscape:/sodipodi: dan id generik; pertahankan sisanya."""
    for attr in [a for a in el.attributes.keys()]:
        if attr.startswith("inkscape:") or attr.startswith("sodipodi:"):
            el.removeAttribute(attr)
    if el.tagName == "g" and el.getAttribute("id") in ("g1", "layer1"):
        el.removeAttribute("id")


def main(src=SRC, dst=DST):
    try:
        doc = minidom.parse(src)
    except Exception as e:
        print(f"build-icon: gagal parse {src}: {e}", file=sys.stderr)
        return 1
    svg = doc.getElementsByTagName("svg")[0]

    content, boxes, kept_defs = [], [], False
    for child in list(svg.childNodes):
        if child.nodeType != child.ELEMENT_NODE:
            continue
        if child.tagName in DROP_TAGS:
            if child.tagName == "defs" and child.toxml() != "<defs/>":
                content.append(child)
                kept_defs = True
            continue
        content.append(child)

    for el in doc.getElementsByTagName("path") + sum(
        [list(doc.getElementsByTagName(t)) for t in
         ("image", "rect", "circle", "ellipse", "line", "polyline", "polygon")],
        [],
    ):
        box = element_bbox(el)
        if box is None:
            continue
        tx, ty = ancestor_offset(el)
        boxes.append((box[0] + tx, box[1] + ty, box[2] + tx, box[3] + ty))

    if not boxes:
        print("build-icon: tidak ada elemen gambar terbaca", file=sys.stderr)
        return 1

    minx = min(b[0] for b in boxes)
    miny = min(b[1] for b in boxes)
    maxx = max(b[2] for b in boxes)
    maxy = max(b[3] for b in boxes)
    pad = max(maxx - minx, maxy - miny) * 0.06
    vb = (minx - pad, miny - pad, (maxx - minx) + 2 * pad,
          (maxy - miny) + 2 * pad)

    for el in content:
        if el.nodeType == el.ELEMENT_NODE:
            clean_attrs(el)
            for sub in el.getElementsByTagName("*"):
                clean_attrs(sub)

    uses_xlink = "xlink:" in doc.toxml()
    attrs = 'xmlns="http://www.w3.org/2000/svg"'
    if uses_xlink:
        attrs += ' xmlns:xlink="http://www.w3.org/1999/xlink"'
    vb_str = " ".join(f"{v:.2f}".rstrip("0").rstrip(".") for v in vb)
    out = [f"<svg {attrs} viewBox=\"{vb_str}\">"]
    for el in content:
        out.append("  " + el.toxml())
    out.append("</svg>\n")
    text = "\n".join(out)

    try:
        minidom.parseString(text)
    except Exception as e:
        print(f"build-icon: output tidak valid: {e}", file=sys.stderr)
        return 1

    with open(dst, "w") as f:
        f.write(text)
    print(f"build-icon: {src} -> {dst}")
    print(f"  viewBox {vb_str} | {len(boxes)} elemen | {len(text)} bytes"
          + (" | defs kept" if kept_defs else ""))
    return 0


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else SRC
    dst = sys.argv[2] if len(sys.argv) > 2 else DST
    sys.exit(main(src, dst))
