import json, subprocess, os, sys
from concurrent.futures import ThreadPoolExecutor
FPS=24
cuts=json.load(open('cuts.json'))
lib=json.load(open('shots.json'))
src={'day':'dayA.mp4','night':'nightB.mp4'}
edges=[round(c['t']*FPS) for c in cuts]+[round((cuts[-1]['t']+cuts[-1]['len'])*FPS)]
jobs=[]
for i,c in enumerate(cuts):
    n=max(1, edges[i+1]-edges[i])
    sp=c['speed']*0.995
    # how much source this segment needs, never running past the shot's own end
    avail=lib[c['kind']][c['shot']][1]-c['off']
    read=min(avail, n/FPS*sp+0.05)
    vf=("hflip," if c['flip'] else "")+ \
       f"setpts=(PTS-STARTPTS)/{sp:.5f},fps={FPS},scale=1280:720:flags=lanczos,setsar=1," \
       "format=yuv420p,tpad=stop_mode=clone:stop_duration=2"
    # -ss and -t are INPUT options here: they bound what is read from the shot.
    # Bounding the OUTPUT instead would truncate every slowed segment.
    jobs.append((i,n,['ffmpeg','-v','error','-y','-ss',f"{c['off']:.3f}",
        '-t',f"{read:.3f}",'-i',src[c['kind']],
        '-an','-vf',vf,'-frames:v',str(n),
        '-c:v','libx264','-preset','veryfast','-crf','16','-pix_fmt','yuv420p',
        '-r',str(FPS),'-video_track_timescale','12288',f'seg/s{i:04d}.mp4']))
fails=[]
def run(j):
    i,n,cmd=j
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode!=0: fails.append((i,r.stderr.strip()[:200]))
with ThreadPoolExecutor(max_workers=os.cpu_count()) as ex:
    list(ex.map(run,jobs))
print(f"  rendered {len(jobs)-len(fails)}/{len(jobs)}")
for i,e in fails[:5]: print(f"  FAIL {i}: {e}")
# verify every segment has exactly the frames it should
bad=[]
for i,n,_ in jobs:
    p=f'seg/s{i:04d}.mp4'
    if not os.path.exists(p): bad.append((i,'missing',n)); continue
    got=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-count_frames',
        '-show_entries','stream=nb_read_frames','-of','default=nk=1:nw=1',p],
        capture_output=True,text=True).stdout.strip()
    if got!=str(n): bad.append((i,got,n))
print(f"  frame-count mismatches: {len(bad)}")
for b in bad[:8]: print("   ",b)
