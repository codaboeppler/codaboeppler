# ComfyUI music video

Builds a VideoHelperSuite workflow from your assets and runs it on your local
ComfyUI.

## Requires

- ComfyUI running locally (`python main.py --listen 127.0.0.1 --port 8188`)
- [ComfyUI-VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite)
  installed via ComfyUI Manager
- `ffprobe` (`brew install ffmpeg`) — used only to measure lengths

## Run

```sh
cd ~/Downloads

python3 run_comfy_music_video.py \
  "Saint Tropez.m4a" \
  hf_20260921_194918_254342cb-6335-4aa7-a484-113c22a47c63.mp4 \
  hf_20260921_200707_d8152e4f-f98c-4d74-9be9-724019d392ee.mp4
```

Add `--dry-run` to write `workflow_api.json` without submitting it.

Useful flags: `--width/--height` (e.g. `1080 1920` for vertical), `--fps`,
`--format`, `--no-pingpong`, `--server`, `--prefix`.

## The graph

```
VHS_LoadVideoPath (clip 1) ─┐
                            ImageBatch ─→ VHS_DuplicateImages ─→ VHS_SplitImages ─┐
VHS_LoadVideoPath (clip 2) ─┘              (repeat past song)     (cut to exact)  │
                                                                                  ↓
VHS_LoadAudio (song) ───────────────────────────────────────────→ VHS_VideoCombine ─→ .mp4
```

Both loaders force the same `custom_width`/`custom_height`, which is what lets
clips of different resolutions batch together.

`VHS_DuplicateImages` repeats the clip sequence past the song's length, then
`VHS_SplitImages` cuts it to an exact frame count — `round(song_seconds × fps)`.
That matters: `VHS_VideoCombine` always muxes with `-shortest` and pads audio
with `apad` rather than trimming it, so a video even slightly longer than the
song ends on silence, and a shorter one cuts the song off. Landing on the exact
frame count avoids both.

The core `ImageFromBatch` node would do the same cut, but it caps `length` at
4096 frames — about 2¼ minutes at 30fps. The VHS nodes use `BIGMAX`, so they
handle full-length songs.

Clips play in order and repeat (A, B, A, B, …). Every transition is a cut
between two different clips, which reads as a deliberate edit.

`--pingpong` bounces the whole sequence back in reverse instead; the script
halves the frame count to compensate, since VHS turns N frames into 2N−2.

## Limitation

Cuts fall where each clip ends, not on the beat. For beat-synced cutting, use
the ffmpeg script one directory up.
