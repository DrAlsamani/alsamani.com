# Builds the film's soundtrack from the recorded events: soft music, a chime on each step, clicks and typing. python3 mix.py ar
import json, sys, wave, numpy as np
L = sys.argv[1]; SR = 44100
ev = json.load(open(f'ev_{L}.json')); A = json.load(open(f'anc_{L}.json')); ax = [a[0] for a in A]; ay = [a[1] for a in A]
# the recorded film runs a little behind the clock: map each moment through the captions found in it
for e in ev: e['t'] = float(np.interp(e['t'], ax, ay)) if e['t'] <= ax[-1] else e['t'] + ay[-1] - ax[-1]
dur = ev[-1]['t'] + 1.5
N = int(dur * SR); t = np.arange(N) / SR
out = np.zeros(N)
def add(sig, at, gain=1.0):
    i = int(at * SR); j = min(N, i + len(sig))
    if i < N: out[i:j] += sig[:j - i] * gain
def env(n, a=0.005, r=0.2):
    x = np.arange(n) / SR; return np.minimum(1, x / a) * np.exp(-x / r)
def tone(f, d, r=0.3, a=0.005, h=(1, .3, .1)):
    n = int(d * SR); x = np.arange(n) / SR
    s = sum(w * np.sin(2 * np.pi * f * (k + 1) * x) for k, w in enumerate(h)); return s * env(n, a, r)
rng = np.random.default_rng(3)
def click():
    n = int(.035 * SR); x = np.arange(n) / SR
    s = rng.normal(0, 1, n) * np.exp(-x / .0015) * .25 + np.sin(2 * np.pi * 1100 * x) * np.exp(-x / .006) * .6
    return s
def key():
    n = int(.03 * SR); x = np.arange(n) / SR
    return rng.normal(0, 1, n) * np.exp(-x / .003) * .35 + np.sin(2 * np.pi * (2400 + rng.integers(-300, 300)) * x) * np.exp(-x / .006) * .25
# music: a calm pad in D major/B minor with a soft pulse, 84 bpm
bar = 60 / 84 * 4
chords = [[62, 66, 69, 74], [59, 62, 66, 71], [55, 59, 62, 67], [57, 61, 64, 69]]
mf = lambda m: 440 * 2 ** ((m - 69) / 12)
mus = np.zeros(N)
k = 0; at = 0.0
while at < dur:
    ch = chords[k % 4]; n = int(bar * SR) + int(.6 * SR); x = np.arange(n) / SR
    pad = sum(np.sin(2 * np.pi * mf(m) * x) + .25 * np.sin(2 * np.pi * mf(m) * 2.003 * x) for m in ch)
    e = np.minimum(1, x / .8) * np.minimum(1, np.maximum(0, (bar + .6 - x) / .8))
    seg = pad * e * .05
    for b in range(4):   # a soft bell on each beat, the chord's notes in turn
        bt = b * bar / 4; f = mf(ch[(b + k) % 4] + 12)
        i = int(bt * SR); bl = tone(f, .9, .35, .004, (1, .2)) * .05; seg[i:i + len(bl)] += bl[:max(0, min(len(bl), n - i))]
    i = int(at * SR); j = min(N, i + n); mus[i:j] += seg[:j - i]
    k += 1; at += bar
fade = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 2.0)
out += mus * fade * 0   # no music: only quiet clicks
for e in ev:
    if e['k'] == 'cap' and False: add(tone(mf(81), .6, .25) + tone(mf(88), .6, .3) * .7, e['t'], .22); add(tone(mf(93), .8, .35), e['t'] + .09, .12)
    elif e['k'] == 'click': add(click(), e['t'] + .02, .5)
    elif e['k'] == 'type' and False:
        for c in range(e['n']): add(key(), e['t'] + .05 + c * .047 + rng.uniform(-.008, .008), .35)
    elif e['k'] == 'lobby' and False: [add(tone(mf(m), 1.6, .6), e['t'] + d, .15) for m, d in [(74, 0), (78, .12), (81, .24), (86, .36)]]
st = [x for x in ev if x['k'] in ('stream', 'streamEnd')]
if False and len(st) == 2:   # a light ticking while the reply is written
    a = st[0]['t']; b2 = st[1]['t']; s = a
    while s < b2: add(key(), s, .12); s += .07
out = out / max(1e-9, np.abs(out).max()) * .35
pcm = (out * 32767).astype(np.int16); st2 = np.stack([pcm, pcm], 1)
w = wave.open(f'snd_{L}.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st2.tobytes()); w.close()
print('ok', round(dur, 1))
