#!/usr/bin/env python3
"""
Visual parity check: reference screenshot vs our screenshot.
SSIM on 480x270 grayscale (structure / layout / tone; robust to font + data differences),
plus a mean-colour delta. Writes side-by-side sheets to qa/compare/.
usage: python3 qa/compare.py pairs.tsv     (tsv: name<TAB>reference.png<TAB>ours.png)
"""
import subprocess, sys, re, os

def ssim(a, b, region=None, blur=0):
    crop = f"crop={region}," if region else ""
    g = f",gblur=sigma={blur}" if blur else ""
    flt = f"[0]{crop}scale=480:270,format=gray{g}[a];[1]{crop}scale=480:270,format=gray{g}[b];[a][b]ssim"
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", a, "-i", b, "-lavfi", flt, "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"All:([\d.]+)", out)
    return float(m.group(1)) if m else 0.0

def mean_rgb(p):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", p, "-vf", "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return tuple(raw[:3]) if len(raw) >= 3 else (0, 0, 0)

def sheet(name, a, b):
    os.makedirs("qa/compare", exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", a, "-i", b, "-filter_complex", "[0]scale=960:540[a];[1]scale=960:540[b];[a][b]hstack", f"qa/compare/{name}.png"])

rows = []
for line in open(sys.argv[1]):
    if not line.strip() or line.startswith("#"): continue
    name, ref, ours = line.rstrip("\n").split("\t")
    if not os.path.exists(ours):
        print(f"missing {ours}"); continue
    full = ssim(ref, ours)
    layout = ssim(ref, ours, blur=6)                   # block geometry + tone, glyph-agnostic
    chrome = ssim(ref, ours, "1920:72:0:0")          # top bar
    side = ssim(ref, ours, "244:1008:0:72")          # sidebar
    r1, r2 = mean_rgb(ref), mean_rgb(ours)
    tone = 1 - min(1, sum(abs(x - y) for x, y in zip(r1, r2)) / 60)
    score = 0.6 * full + 0.15 * chrome + 0.15 * side + 0.10 * tone
    design = 0.7 * layout + 0.3 * tone
    rows.append((name, full, chrome, side, tone, score, layout, design))
    sheet(name, ref, ours)
print(f"{'screen':22} {'ssim':>6} {'topbar':>7} {'sidebar':>8} {'tone':>6} {'pixel':>7} {'layout':>7} {'design':>7}")
for r in rows:
    print(f"{r[0]:22} {r[1]:6.3f} {r[2]:7.3f} {r[3]:8.3f} {r[4]:6.3f} {r[5]*100:6.1f}% {r[6]*100:6.1f}% {r[7]*100:6.1f}%")
if rows:
    n = len(rows)
    print(f"{'AVERAGE':22} {'':6} {'':7} {'':8} {'':6} {sum(r[5] for r in rows)/n*100:6.1f}% {sum(r[6] for r in rows)/n*100:6.1f}% {sum(r[7] for r in rows)/n*100:6.1f}%")
