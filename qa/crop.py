#!/usr/bin/env python3
"""Stack the same crop of reference (top) and ours (bottom). usage: qa/crop.py name W:H:X:Y [out]"""
import subprocess, sys, glob
name, region = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else f"qa/compare/crop_{name}.png"
ref = next(l.split("\t")[1] for l in open("qa/pairs.tsv") if l.split("\t")[0] == name)
ref = glob.glob(ref.replace(" PM", "?PM"))[0]
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", ref, "-i", f"qa/shots/{name}.png", "-filter_complex",
                f"[0]crop={region}[a];[1]crop={region}[b];[a][b]vstack", out], check=True)
print(out)
