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
                            ImageBatch ─→ VHS_VideoCombine ─→ .mp4
VHS_LoadVideoPath (clip 2) ─┘                  ↑
VHS_LoadAudio (song) ──────────────────────────┘
```

Both loaders force the same `custom_width`/`custom_height`, which is what lets
clips of different resolutions batch together. `VHS_VideoCombine` repeats the
batch with `loop_count` and bounces it with `pingpong` to cover the song; the
script computes `loop_count` from the measured durations.

## Known limitation

Length granularity is coarse. One ping-pong cycle of two 5-second clips is
~20 seconds, and `loop_count` only adds whole cycles, so the video rarely lands
exactly on the song's length. VHS pads audio with silence rather than trimming,
so an over-long video gets a silent tail. The script prints the mismatch when it
happens.

If you want the cut to land on the beat and end exactly with the song, the
ffmpeg script one directory up does that directly.
