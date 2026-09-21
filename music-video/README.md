# make_music_video.sh

Cuts video clips to a song using ffmpeg, entirely on your own machine. No upload,
no cloud service, no account.

## Setup

```sh
brew install ffmpeg
```

## Your command

```sh
cd ~/Downloads

OUT="Saint Tropez.mp4" BPM=120 \
  ~/path/to/make_music_video.sh \
  "Saint Tropez.m4a" \
  hf_20260921_194918_254342cb-6335-4aa7-a484-113c22a47c63.mp4 \
  hf_20260921_200707_d8152e4f-f98c-4d74-9be9-724019d392ee.mp4
```

Set `BPM` to the real tempo of the track — that is what makes the cuts land on
the beat instead of drifting against it. If you don't know it, drop `BPM=` and
the script falls back to an even 4-second cut.

## How it works

Two short clips can't fill a multi-minute song by themselves, so the script:

1. **Normalizes** every clip to one resolution, frame rate and pixel format, so
   sources that don't match (different sizes, frame rates, some with audio, some
   without) can be joined without artifacts.
2. **Ping-pongs** each clip — forward, then reversed — so a repeat reads as
   continuous motion rather than snapping back to the first frame.
3. **Intercuts** the clips on a beat grid for the full length of the song, each
   clip advancing through its own loop so you rarely see the same frames twice.
4. **Mixes** the song over the result, fading in from black at the top and out to
   black at the end.

Audio on the source clips is discarded; the song is the only soundtrack.

## Options

All set as environment variables before the command.

| Option | Default | What it does |
| --- | --- | --- |
| `OUT` | `music-video.mp4` | Output path |
| `BPM` | unset | Song tempo; cuts land on beats |
| `BEATS` | `8` | Beats per cut (with `BPM`) — `4` is twice as fast, `16` half |
| `CUT` | `4.0` | Seconds per cut, when no `BPM` is given |
| `RES` | first clip's | Output resolution, e.g. `1920x1080` |
| `ORIENT` | first clip's | `landscape`, `portrait` (9:16 for Reels/TikTok) or `square` |
| `FIT` | `crop` | `crop` fills the frame; `pad` letterboxes instead |
| `FLIP` | off | `FLIP=1` mirrors every 4th cut for extra variety |
| `FADE_IN` / `FADE_OUT` | `1.0` / `2.0` | Fade lengths in seconds |
| `CRF` | `18` | Quality; lower is better and larger (18 is visually lossless) |
| `FPS` | `30` | Output frame rate |
| `KEEP` | off | `KEEP=1` keeps intermediate files for inspection |

### Examples

```sh
# Vertical cut for Reels / TikTok
OUT=vertical.mp4 ORIENT=portrait BPM=120 ./make_music_video.sh song.m4a a.mp4 b.mp4

# Faster, more aggressive cutting (every 4 beats)
BPM=128 BEATS=4 ./make_music_video.sh song.m4a a.mp4 b.mp4

# More clips — they rotate in order
./make_music_video.sh song.m4a a.mp4 b.mp4 c.mp4 d.mp4
```

## Notes

- Takes any number of clips; two is just the minimum that makes intercutting
  interesting.
- Run time scales with song length and resolution. A 3-minute 1080p track takes a
  few minutes on an Apple Silicon Mac.
- Filenames with spaces are fine, as long as they're quoted.
