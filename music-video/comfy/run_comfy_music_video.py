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


def build(song, clips, fps, width, height, loop_count, prefix, fmt, pingpong):
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

    wf["20"] = {
        "class_type": "VHS_LoadAudio",
        "inputs": {"audio_file": str(song), "seek_seconds": 0.0, "duration": 0.0},
    }
    wf["90"] = {
        "class_type": "VHS_VideoCombine",
        "inputs": {
            "images": [current, 0],
            "frame_rate": fps,
            "loop_count": loop_count,
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
    ap.add_argument("--no-pingpong", action="store_true")
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

    pingpong = not a.no_pingpong
    cycle = sum(clip_durs) * (2 if pingpong else 1)
    if cycle <= 0:
        sys.exit("error: clips have no duration")
    # loop_count is EXTRA repeats on top of the first pass; VHS caps it at 100
    loops = max(0, min(100, -(-int(song_dur * 1000) // int(cycle * 1000)) - 1))

    print(f"  song   {song_dur:.1f}s")
    print(f"  clips  {len(clips)} totalling {sum(clip_durs):.1f}s -> {w}x{h} @ {a.fps}fps")
    print(f"  cycle  {cycle:.1f}s{' (ping-pong)' if pingpong else ''} x {loops + 1} passes")

    covered = cycle * (loops + 1)
    if covered < song_dur - 0.5:
        print(
            f"  note:  {covered:.1f}s of video for a {song_dur:.1f}s song — VHS caps\n"
            "         loop_count at 100, so the song will be cut short."
        )
    elif covered > song_dur + 0.5:
        print(
            f"  note:  {covered:.1f}s of video vs a {song_dur:.1f}s song. VHS pads the\n"
            "         audio with silence rather than trimming, so expect a silent tail;\n"
            "         trim it afterwards, or pick a format preset that trims to audio."
        )

    wf = build(song, clips, a.fps, w, h, loops, a.prefix, a.format, pingpong)
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
