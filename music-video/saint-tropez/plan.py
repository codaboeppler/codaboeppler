import json, random
random.seed(7)

BPM, PHASE, SONG = 107.67, 0.360, 166.24
BEAT = 60.0 / BPM
CLOSER = 2.98      # reserved for the two closing shots
lib = json.load(open('shots.json'))

# (name, start, end, beats-per-cut pattern, P(day))
SECTIONS = [
    ("intro",     0.00,  16.75, [2,4,2,2],     1.00),
    ("verse1",   16.75,  34.55, [2,2,1,2],     0.90),
    ("pre1",     34.55,  40.05, [1],           0.60),
    ("chorus1",  40.05,  80.50, [1,1,2,1],     0.50),
    ("verse2",   80.50,  96.70, [2,2,1,2],     0.30),
    ("pre2",     96.70, 106.83, [1],           0.20),
    ("chorus2", 106.83, 126.60, [1,1,2,1],     0.20),
    ("outro",   126.60, SONG-CLOSER, [2,4,2,4], 0.00),
]

SLOWEST = 0.55   # never stretch a shot more than ~1.8x; beyond that it stutters

class Pool:
    """Hands out shots, avoiding repeats and rotating the offset on reuse."""
    def __init__(self, shots):
        self.shots = shots
        self.queue, self.uses, self.last = [], [0]*len(shots), -1
    def longest(self):
        return max(b-a for a,b in self.shots)
    def cap(self, need):
        """Longest slot this pool can fill without over-stretching a shot."""
        return min(need, self.longest() / SLOWEST)
    def take(self, need):
        ok = [i for i,(a,b) in enumerate(self.shots) if (b-a) >= need*SLOWEST and i != self.last]
        if not ok:
            ok = [i for i,(a,b) in enumerate(self.shots) if (b-a) >= need*SLOWEST] \
                 or [max(range(len(self.shots)), key=lambda j: self.shots[j][1]-self.shots[j][0])]
        if not self.queue or not any(i in ok for i in self.queue):
            self.queue = random.sample(ok, len(ok))
        i = next(x for x in self.queue if x in ok)
        self.queue.remove(i); self.last = i
        a, b = self.shots[i]
        avail = b - a
        speed = min(1.0, avail / need)          # slow down only as far as needed
        src = need * speed
        slack = max(0.0, avail - src)
        off = a + (slack * ((self.uses[i] * 0.37) % 1.0))   # rotate the window on reuse
        self.uses[i] += 1
        return i, round(off,3), round(src,3), round(speed,4)

pools = {'day': Pool(lib['day']), 'night': Pool(lib['night'])}
cuts, t = [], 0.0
# start the grid on the first beat at or before the song start
grid = PHASE - BEAT * ((PHASE) // BEAT + 1)

for name, s, e, pattern, p_day in SECTIONS:
    # snap section start to the beat grid
    t = max(t, grid + round((s - grid) / BEAT) * BEAT)
    k = 0
    while t < e - 0.05 and t < SONG:
        beats = pattern[k % len(pattern)]; k += 1
        slot = min(beats * BEAT, e - t, SONG - t)
        if slot < BEAT * 0.45:
            break
        kind = 'day' if random.random() < p_day else 'night'
        slot = max(BEAT * 0.5, pools[kind].cap(slot))
        i, off, src, speed = pools[kind].take(slot)
        cuts.append(dict(t=round(t,3), len=round(slot,3), kind=kind, shot=i,
                         off=off, src=src, speed=speed,
                         flip=(random.random() < 0.18), sec=name))
        t += slot

# close on the pool jump, then underwater, both inside the slow-motion limit
for shot, length in ((6, 2.20), (7, CLOSER - 2.20)):
    a, b = lib['night'][shot]
    src = min(b - a, length)
    cuts.append(dict(t=round(SONG - CLOSER if shot == 6 else SONG - (CLOSER - 2.20), 3),
                     len=round(length, 3), kind='night', shot=shot, off=round(a, 3),
                     src=round(src, 3), speed=round(src / length, 4), flip=False, sec='outro'))
cuts[-1]['len'] = round(SONG - cuts[-1]['t'], 3)

# Section starts snap forward to the beat grid, which can leave a gap. Stretch
# the preceding cut to cover it -- taking more source if the shot has it, and
# only slowing down if it does not.
for a, b in zip(cuts, cuts[1:]):
    gap = round(b['t'] - (a['t'] + a['len']), 4)
    if gap > 0.002:
        a['len'] = round(a['len'] + gap, 3)
        shot_end = lib[a['kind']][a['shot']][1]
        a['src'] = round(min(shot_end - a['off'], a['len'] * a['speed']), 3)
        a['speed'] = round(a['src'] / a['len'], 4)

json.dump(cuts, open('cuts.json','w'), indent=1)

print(f"  beat {BEAT:.4f}s   {len(cuts)} cuts   ends {cuts[-1]['t']+cuts[-1]['len']:.2f}s / {SONG}s")
for name,_,_,_,_ in SECTIONS:
    c=[x for x in cuts if x['sec']==name]
    d=sum(1 for x in c if x['kind']=='day')
    sp=[x['speed'] for x in c]
    print(f"    {name:9s} {len(c):3d} cuts  avg {sum(x['len'] for x in c)/len(c):.2f}s  "
          f"day {d:3d}/{len(c)-d:<3d} night   slowest {min(sp):.2f}x")
