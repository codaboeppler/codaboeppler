#!/usr/bin/env python3
"""
Build a ComfyUI music-video workflow from local assets and run it on a local
ComfyUI server.

    python3 run_comfy_music_video.py SONG CLIP [CLIP ...]

Requires ComfyUI-VideoHelperSuite (VHS) installed in ComfyUI, and ffprobe on
PATH for length calculation. Node signatures follow VHS as published:
  VHS_LoadVideoPath  video, force_rate, custom_width, custom_height,
                     frame_load_cap, skip_first_frames, select_every_nth
  VHS_LoadAudio      audio_file, seek_seconds, duration
  VHS_VideoCombine   images, frame_rate, loop_count, filename_prefix, format,
                     pingpong, save_output, audio

Use --dry-run to write the workflow JSON without submitting it.
"""
import argparse, json, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path


def probe(path, entries, stream=False):
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", "v:0"]
    cmd += ["-show_entries", entries, "-of", "default=nk=1:nw=1", str(path)]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout
    except FileNotFoundError:
        sys.exit("error: ffprobe not found. Install it with: brew install ffmpeg")
    except subprocess.CalledProcessError:
        sys.exit(f"error: could not read media info from: {path}")
    vals = [v for v in out.split() if v.strip()]
    if not vals:
        sys.exit(f"error: could not read {entries} from: {path}")
    return vals


def build(song, clips, fps, width, height, repeat, split_at, prefix, fmt, pingpong):
    wf, img_ids = {}, []
    for i, clip in enumerate(clips):
        nid = str(10 + i)
        wf[nid] = {
            "class_type": "VHS_LoadVideoPath",
            "inputs": {
                "video": str(clip),
                "force_rate": fps,
                # forcing one size lets clips of different resolutions batch together
                "custom_width": width,
                "custom_height": height,
                "frame_load_cap": 0,
                "skip_first_frames": 0,
                "select_every_nth": 1,
            },
        }
        img_ids.append(nid)

    # ImageBatch takes two inputs, so chain them into a left-leaning tree
    current = img_ids[0]
    for n, nxt in enumerate(img_ids[1:]):
        bid = str(50 + n)
        wf[bid] = {
            "class_type": "ImageBatch",
            "inputs": {"image1": [current, 0], "image2": [nxt, 0]},
        }
        current = bid

    # Repeat the clip sequence past the song, then cut it to an exact frame
    # count. Both VHS nodes use BIGMAX limits, unlike core ImageFromBatch
    # which stops at 4096 frames (~2 minutes at 30fps).
    wf["60"] = {
        "class_type": "VHS_DuplicateImages",
        "inputs": {"images": [current, 0], "multiply_by": repeat},
    }
    wf["70"] = {
        "class_type": "VHS_SplitImages",
        "inputs": {"images": ["60", 0], "split_index": split_at},
    }

    wf["20"] = {
        "class_type": "VHS_LoadAudio",
        "inputs": {"audio_file": str(song), "seek_seconds": 0.0, "duration": 0.0},
    }
    wf["90"] = {
        "class_type": "VHS_VideoCombine",
        "inputs": {
            "images": ["70", 0],          # IMAGE_A = the first split_index frames
            "frame_rate": fps,
            "loop_count": 0,
            "filename_prefix": prefix,
            "format": fmt,
            "pingpong": pingpong,
            "save_output": True,
            "audio": ["20", 0],
        },
    }
    return wf


def post(server, workflow):
    body = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{server}/prompt", data=body, headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)["prompt_id"]
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:2000]
        sys.exit(f"error: ComfyUI rejected the workflow (HTTP {e.code}):\n{detail}")
    except urllib.error.URLError as e:
        sys.exit(
            f"error: could not reach ComfyUI at {server} ({e.reason}).\n"
            "Start it first, e.g.  python main.py --listen 127.0.0.1 --port 8188"
        )


def wait(server, pid):
    print(f"  queued as {pid}; rendering", end="", flush=True)
    while True:
        time.sleep(3)
        print(".", end="", flush=True)
        try:
            with urllib.request.urlopen(f"{server}/history/{pid}", timeout=30) as r:
                hist = json.load(r)
        except urllib.error.URLError:
            continue
        if pid not in hist:
            continue
        print()
        entry = hist[pid]
        status = entry.get("status", {})
        if status.get("status_str") == "error" or not status.get("completed", True):
            for msg in status.get("messages", []):
                if msg[0] in ("execution_error", "execution_interrupted"):
                    d = msg[1]
                    sys.exit(
                        "error: ComfyUI failed on node "
                        f"{d.get('node_id')} ({d.get('node_type')}): "
                        f"{d.get('exception_message')}"
                    )
            sys.exit(f"error: ComfyUI run failed: {json.dumps(status)[:1000]}")
        return entry.get("outputs", {})


def main():
    ap = argparse.ArgumentParser(description="Render a music video with ComfyUI.")
    ap.add_argument("song")
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--width", type=int, default=0, help="default: first clip's")
    ap.add_argument("--height", type=int, default=0)
    ap.add_argument("--prefix", default="music-video")
    ap.add_argument("--format", default="video/h264-mp4")
    ap.add_argument("--pingpong", action="store_true",
                    help="bounce the whole sequence back in reverse")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out", default="workflow_api.json")
    a = ap.parse_args()

    song = Path(a.song).expanduser().resolve()
    clips = [Path(c).expanduser().resolve() for c in a.clips]
    for p in [song, *clips]:
        if not p.is_file():
            sys.exit(f"error: not found: {p}")

    song_dur = float(probe(song, "format=duration")[0])
    clip_durs = [float(probe(c, "format=duration")[0]) for c in clips]

    w, h = a.width, a.height
    if not (w and h):
        dims = probe(clips[0], "stream=width,height", stream=True)
        w, h = int(dims[0]), int(dims[1])
    w, h = (w // 2) * 2, (h // 2) * 2

    # Exact frame arithmetic: the output must land on the song's length so the
    # muxer neither pads the audio with silence nor cuts the song short.
    pingpong = a.pingpong
    target = max(1, round(song_dur * a.fps))
    # to_pingpong() turns N frames into 2N-2, so feed it half when enabled
    split_at = ((target + 2 + 1) // 2) if pingpong else target
    base_frames = sum(max(1, round(d * a.fps)) for d in clip_durs)
    # +1 repeat of margin: force_rate can yield a frame or two fewer than
    # duration x fps, and a short batch would truncate the video
    repeat = max(1, -(-split_at // base_frames) + 1)

    out_frames = (2 * split_at - 2) if pingpong else split_at
    print(f"  song   {song_dur:.1f}s -> {target} frames @ {a.fps}fps")
    print(f"  clips  {len(clips)} totalling {sum(clip_durs):.1f}s ({base_frames} frames) -> {w}x{h}")
    print(f"  build  repeat x{repeat}, cut to {split_at} frames"
          + (f", ping-pong -> {out_frames}" if pingpong else ""))
    print(f"  video  {out_frames / a.fps:.2f}s vs song {song_dur:.2f}s")

    wf = build(song, clips, a.fps, w, h, repeat, split_at, a.prefix, a.format, pingpong)
    Path(a.out).write_text(json.dumps(wf, indent=2))
    print(f"  wrote  {a.out}")

    if a.dry_run:
        print("  dry run — not submitted")
        return

    server = a.server.rstrip("/")
    outputs = wait(server, post(server, wf))
    files = [
        f"{v.get('subfolder') + '/' if v.get('subfolder') else ''}{v.get('filename')}"
        for node in outputs.values()
        for v in node.get("gifs", []) + node.get("videos", [])
        if v.get("filename")
    ]
    print("\n  done ->", ", ".join(files) if files else "check ComfyUI/output/")


if __name__ == "__main__":
    main()
