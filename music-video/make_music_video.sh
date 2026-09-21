#!/usr/bin/env bash
#
# make_music_video.sh — cut two (or more) video clips to a song, locally, with ffmpeg.
#
#   ./make_music_video.sh <song> <clip1> <clip2> [clip3 ...]
#
# The clips are looped ping-pong (forward, then reversed) so they never visibly
# "snap" back to the start, then intercut on a fixed beat grid for the full
# length of the song. Audio comes from the song; any audio on the clips is
# dropped.
#
# Options (environment variables):
#   OUT=path        output file                     (default: music-video.mp4)
#   BPM=120         song tempo; cuts land on beats  (default: unset -> CUT)
#   BEATS=8         beats per cut, with BPM         (default: 8)
#   CUT=4.0         seconds per cut, without BPM    (default: 4.0)
#   RES=1920x1080   output resolution               (default: from first clip)
#   ORIENT=...      landscape | portrait | square   (default: from first clip)
#   FIT=crop|pad    fill frame, or letterbox        (default: crop)
#   FLIP=1          mirror every 4th cut for variety (default: off)
#   FADE_IN=1.0     fade in from black, seconds     (default: 1.0)
#   FADE_OUT=2.0    fade out to black, seconds      (default: 2.0)
#   CRF=18          quality, lower is better        (default: 18)
#   KEEP=1          keep intermediate files         (default: off)
#
set -euo pipefail

die() { printf 'error: %s\n' "$*" >&2; exit 1; }
note() { printf '  %s\n' "$*" >&2; }
step() { printf '\n==> %s\n' "$*" >&2; }

command -v ffmpeg  >/dev/null 2>&1 || die "ffmpeg not found. Install it with: brew install ffmpeg"
command -v ffprobe >/dev/null 2>&1 || die "ffprobe not found. Install it with: brew install ffmpeg"

[ $# -ge 2 ] || die "usage: $0 <song> <clip1> [clip2 ...]"

SONG=$1; shift
CLIPS=("$@")

[ -f "$SONG" ] || die "song not found: $SONG"
for c in "${CLIPS[@]}"; do [ -f "$c" ] || die "clip not found: $c"; done

OUT=${OUT:-music-video.mp4}
BEATS=${BEATS:-8}
CUT=${CUT:-4.0}
FIT=${FIT:-crop}
FLIP=${FLIP:-0}
FADE_IN=${FADE_IN:-1.0}
FADE_OUT=${FADE_OUT:-2.0}
CRF=${CRF:-18}
FPS=${FPS:-30}

probe() { ffprobe -v error -show_entries "$1" -of default=nk=1:nw=1 "$2" 2>/dev/null | head -1 || true; }
calc() { awk "BEGIN{printf \"%.4f\", $1}"; }

# ---------------------------------------------------------------- song length
DUR=$(probe format=duration "$SONG")
[ -n "$DUR" ] || die "could not read a duration from: $SONG"
case $DUR in ''|*[!0-9.]*) die "unexpected duration '$DUR' from: $SONG";; esac

# ------------------------------------------------------------- cut length (L)
if [ -n "${BPM:-}" ]; then
  L=$(calc "60.0 / $BPM * $BEATS")
  note "tempo ${BPM} BPM x ${BEATS} beats -> ${L}s per cut"
else
  L=$CUT
  note "${L}s per cut (pass BPM=... to cut on the beat instead)"
fi
awk -v l="$L" 'BEGIN{exit !(l>0.2)}' || die "cut length ${L}s is too short"

# --------------------------------------------------------- output resolution
if [ -n "${RES:-}" ]; then
  W=${RES%x*}; H=${RES#*x}
else
  W=$(probe stream=width "${CLIPS[0]}"); H=$(probe stream=height "${CLIPS[0]}")
  [ -n "$W" ] && [ -n "$H" ] || die "could not read dimensions from: ${CLIPS[0]}"
  case ${ORIENT:-} in
    landscape) [ "$W" -lt "$H" ] && { t=$W; W=$H; H=$t; } || true ;;
    portrait)  [ "$W" -gt "$H" ] && { t=$W; W=$H; H=$t; } || true ;;
    square)    [ "$W" -lt "$H" ] && H=$W || W=$H ;;
  esac
fi
W=$(( (W / 2) * 2 )); H=$(( (H / 2) * 2 ))   # h264 needs even dimensions

# ------------------------------------------------------------- scale filter
if [ "$FIT" = "pad" ]; then
  SCALE="scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black"
else
  SCALE="scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}"
fi
VF="${SCALE},fps=${FPS},setsar=1,format=yuv420p"

WORK=$(mktemp -d "${TMPDIR:-/tmp}/musicvideo.XXXXXX")
[ "${KEEP:-0}" = "1" ] || trap 'rm -rf "$WORK"' EXIT

ENC="-c:v libx264 -preset medium -crf ${CRF} -pix_fmt yuv420p -r ${FPS}"

step "Song is ${DUR}s -> ${W}x${H} @ ${FPS}fps, ${L}s cuts"

# ------------------------------------- normalize + ping-pong + loop each clip
i=0
for c in "${CLIPS[@]}"; do
  step "Preparing clip $((i+1))/${#CLIPS[@]}: $(basename "$c")"

  note "normalizing to ${W}x${H}"
  ffmpeg -nostdin -v error -y -i "$c" -an -vf "$VF" $ENC "$WORK/norm_$i.mp4"

  note "building seamless ping-pong loop"
  ffmpeg -nostdin -v error -y -i "$WORK/norm_$i.mp4" -an -vf reverse $ENC "$WORK/rev_$i.mp4"
  printf "file '%s'\nfile '%s'\n" "$WORK/norm_$i.mp4" "$WORK/rev_$i.mp4" > "$WORK/pp_$i.txt"
  ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$WORK/pp_$i.txt" -c copy "$WORK/pp_$i.mp4"

  note "extending past song length"
  ffmpeg -nostdin -v error -y -stream_loop -1 -i "$WORK/pp_$i.mp4" \
         -t "$(calc "$DUR + $L + 1")" -an -c copy "$WORK/long_$i.mp4"

  eval "OFF_$i=0"
  i=$((i+1))
done
NCLIPS=$i

# ---------------------------------------------------------- cut the sequence
N=$(awk -v d="$DUR" -v l="$L" 'BEGIN{n=d/l; ni=int(n); if(n>ni) ni++; print ni}')
step "Cutting $N segments"

: > "$WORK/list.txt"
s=0
while [ "$s" -lt "$N" ]; do
  k=$(( s % NCLIPS ))
  eval "off=\$OFF_$k"

  seg_vf=""
  if [ "$FLIP" = "1" ] && [ $(( s % 4 )) -eq 3 ]; then seg_vf="-vf hflip"; fi

  ffmpeg -nostdin -v error -y -ss "$off" -i "$WORK/long_$k.mp4" -t "$L" \
         -an $seg_vf $ENC "$WORK/seg_$s.mp4"

  printf "file '%s'\n" "$WORK/seg_$s.mp4" >> "$WORK/list.txt"
  eval "OFF_$k=\$(calc \"\$off + \$L\")"
  s=$((s+1))
  printf '\r  %d/%d' "$s" "$N" >&2
done
printf '\n' >&2

step "Joining segments"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$WORK/list.txt" -c copy "$WORK/bed.mp4"

# ------------------------------------------------- mux the song, add fades
step "Mixing in the song and adding fades"
FO_START=$(calc "$DUR - $FADE_OUT")
AF_START=$(calc "$DUR - $FADE_OUT - 1.0")
awk -v v="$FO_START" 'BEGIN{exit !(v>0)}' || { FO_START=0; AF_START=0; }

ffmpeg -nostdin -v error -y -i "$WORK/bed.mp4" -i "$SONG" \
  -filter_complex \
    "[0:v]trim=0:${DUR},setpts=PTS-STARTPTS,\
fade=t=in:st=0:d=${FADE_IN},fade=t=out:st=${FO_START}:d=${FADE_OUT}[v];\
     [1:a]afade=t=out:st=${AF_START}:d=$(calc "$FADE_OUT + 1.0")[a]" \
  -map "[v]" -map "[a]" \
  $ENC -c:a aac -b:a 320k -movflags +faststart -shortest "$OUT"

step "Done"
FINAL=$(probe format=duration "$OUT")
printf '\n  %s\n  %sx%s, %ss, %s\n\n' \
  "$OUT" "$W" "$H" "${FINAL%.*}" "$(du -h "$OUT" | cut -f1)" >&2
