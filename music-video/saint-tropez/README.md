# Saint Tropez — the edit

The actual cut, reproducible. Source assets are not committed (they are large and
not mine to redistribute); drop them in as `dayA.mp4`, `nightB.mp4` and the
`.m4a` and re-run.

## What the song turned out to be

- 166.24s, **107.67 BPM** (beat 0.5573s)
- The `.m4a` carries a **timed lyric subtitle track**, which gave the exact song
  structure for free:

| section | start |
| --- | --- |
| intro | 0.00 |
| verse 1 | 16.75 |
| prechorus | 34.55 |
| chorus | 40.05 |
| verse 2 | 80.50 |
| prechorus | 96.70 |
| chorus | 106.83 |
| outro | 126.60 |

Tempo came from an onset-flux autocorrelation over the decoded audio. A
competing fit to the lyric timings alone suggested 101.32 BPM, but it scored
worse against actual onset energy (0.124 vs 0.132) — it was overfitting 26
points, so 107.67 won.

## What the footage turned out to be

Neither clip is a single shot. Each is a ~5s montage, and scene detection found
**8 shots in each** — 16 total, averaging 0.6s. The beat is 0.557s, so the source
is already cut at roughly one shot per beat.

They also split cleanly by time of day: clip A is **daytime** (marina,
speedboat, beach club, dock party at golden hour), clip B is **night** (disco
ball, bar, dance floor, pool). That is the spine of the edit — the video opens
fully day and ends fully night, with the crossover through the first chorus.

## How it cuts

`plan.py` lays 188 cuts on the beat grid. Cut length and day/night mix are
per-section, so the energy tracks the song:

| section | beats per cut | day : night |
| --- | --- | --- |
| intro | 2–4 | 13 : 0 |
| verse 1 | 1–2 | 17 : 1 |
| prechorus | 1 | 6 : 4 |
| chorus | 1–2 | 27 : 32 |
| verse 2 | 1–2 | 4 : 13 |
| prechorus | 1 | 4 : 14 |
| chorus | 1–2 | 10 : 19 |
| outro | 2–4 | 0 : 24 |

Shots are drawn from a rotating pool that avoids immediate repeats and advances
the window on reuse, so a reused shot shows different frames. 37 cuts are
mirrored for variety. It closes on the pool jump, then underwater, fading out.

Where a slot is longer than the shot, the shot slows to fill it — capped at
**0.55x**. Past roughly 1.8x, 24fps source visibly stutters. An earlier pass
produced 0.13x (7.7x slow) because the fallback shot picker ignored the length
filter; the cap and a bounded hold length fixed it.

`render.py` renders each cut, then concat + mux.

## Two things worth knowing if you change this

- **Frame counts, not durations.** Each segment's length comes from
  `round(t_next * fps) - round(t * fps)`. Rounding each cut independently drifts
  and desyncs the audio by the end.
- **`-ss`/`-t` must be INPUT options** (before `-i`). After `-i`, `-t` bounds the
  *output*, which truncates every slowed segment — 83 of 188 came out short
  before this was fixed.

Section starts snap to the beat grid, which can open a small gap against the
previous cut; a post-pass stretches the preceding cut to close it.

## Run

```sh
python3 plan.py      # -> cuts.json
python3 render.py    # -> seg/*.mp4
ls seg/s*.mp4 | sort | sed "s|^|file '|; s|$|'|" > list.txt
ffmpeg -f concat -safe 0 -i list.txt -i song.m4a \
  -filter_complex "[0:v]fade=t=in:st=0:d=1.2,fade=t=out:st=163.24:d=3.0[v];\
[1:a]afade=t=out:st=162.74:d=3.5[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 320k -movflags +faststart -shortest "Saint Tropez.mp4"
```
