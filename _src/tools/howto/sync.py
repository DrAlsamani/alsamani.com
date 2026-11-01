# Finds when each caption appears in the recorded film, to line the sounds up with the picture
import sys, json, subprocess, numpy as np
L = sys.argv[1]; F = 20
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'raw_{L}.webm', '-vf', f'fps={F},crop=160:30:560:84,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, 30, 160).astype(float)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
ev = json.load(open(f'ev_{L}.json')); caps = [e['t'] for e in ev if e['k'] == 'cap']
# for each caption, the biggest change within a window after its clock time (the film only ever lags)
anchors = [(0.0, 0.0)]; last = 0
for c in caps:
    lo = max(int(c * F) - 2, last + 5); hi = lo + int(9 * F)
    seg = d[lo:hi]; th = max(6, seg.max() * .5); k = lo + int(np.argmax(seg > th)); anchors.append((c, (k + 1) / F)); last = k
print(json.dumps(anchors))
json.dump(anchors, open(f'anc_{L}.json', 'w'))
