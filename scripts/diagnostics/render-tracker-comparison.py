"""Render measured tracker output over original-speed recorded video.

Usage: python3 render-tracker-comparison.py MANIFEST.json OUTPUT.mp4
Manifest entries: {name, video, trial, labels: [source floor times]}.
No guessed ball positions or manually inserted tracker events are rendered.
"""
import sys,json,math,bisect,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

entries=json.loads(Path(sys.argv[1]).read_text())['clips'];output=Path(sys.argv[2])
output.parent.mkdir(parents=True,exist_ok=True)
W,H,FPS=1280,944,30
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
fonts={size:ImageFont.truetype(font_path,size)for size in [14,16,18,20,22]}
edges=[(5,6),(5,7),(7,9),(6,8),(8,10),(5,11),(6,12),(11,12),(11,13),(13,15),(12,14),(14,16)]
streams=[];duration=0
for entry in entries:
    trial=json.loads(Path(entry['trial']).read_text());entry['rows']=trial['rows'];entry['times']=[r['time']for r in trial['rows']]
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',entry['video']]))
    entry['duration']=float(info['format']['duration']);duration=max(duration,entry['duration']);entry['last']=Image.new('RGB',(640,360))
    entry['contact_frames']={};entry['final_count']=trial['count']
    streams.append(subprocess.Popen(['ffmpeg','-nostdin','-v','error','-threads','1','-i',entry['video'],'-vf','hflip,scale=640:360,fps=30','-threads','1','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE))
encoder=subprocess.Popen(['ffmpeg','-nostdin','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','30','-i','-','-an','-c:v','libx264','-threads','2','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart',str(output)],stdin=subprocess.PIPE)
try:
    for index in range(math.ceil(duration*FPS)):
        t=index/FPS;canvas=Image.new('RGB',(W,H),'#071522');draw=ImageDraw.Draw(canvas)
        for panel,(entry,stream)in enumerate(zip(entries,streams)):
            raw=stream.stdout.read(640*360*3)
            if raw:entry['last']=Image.frombytes('RGB',(640,360),raw)
            clean=entry['last'];x=(panel%2)*640;y=(panel//2)*432
            draw.text((x+14,y+8),entry['name'],font=fonts[20],fill='#f0f6fa')
            picture=clean.copy();pd=ImageDraw.Draw(picture)
            ri=max(0,bisect.bisect_right(entry['times'],min(t,entry['duration']))-1);row=entry['rows'][ri];p=row['person']
            if p:
                for a,b in edges:
                    if p['confidence'][a]>=.5 and p['confidence'][b]>=.5:pd.line([tuple(v*.5 for v in p['xy'][a]),tuple(v*.5 for v in p['xy'][b])],fill='#68c8e8',width=1)
                for a in [9,10]:
                    if p['confidence'][a]>=.5:
                        wx,wy=[v*.5 for v in p['xy'][a]];pd.ellipse((wx-4,wy-4,wx+4,wy+4),fill='#83e5ff')
            if row['selected']:
                box=[v*.5 for v in row['selected']['box']];pd.rectangle(box,outline='#5ee1aa',width=2)
            if row.get('candidateMeasurement'):
                cx,cy,d=[v*.5 for v in row['candidateMeasurement']];pd.ellipse((cx-d*.55,cy-d*.55,cx+d*.55,cy+d*.55),outline='#ffc857',width=2)
            canvas.paste(picture,(x,y+36));draw=ImageDraw.Draw(canvas)
            reviewed=bisect.bisect_right(entry['labels'],min(t,entry['duration']))
            base=entry['baseRows'][min(ri,len(entry['baseRows'])-1)]['count']
            draw.text((x+14,y+402),f'Base {base}   |   Candidate {row["count"]}   |   Reviewed {reviewed}',font=fonts[18],fill='#f0f6fa')
            if t>entry['duration']:
                draw.rounded_rectangle((x+350,y+45,x+625,y+77),radius=6,fill='#071522')
                draw.text((x+362,y+52),f'Clip ended: {entry["final_count"]}/{len(entry["labels"])}',font=fonts[16],fill='#ffc857')
            for no,contact in enumerate(entry['labels']):
                if round(contact*FPS)==index:entry['contact_frames'][no]=clean.copy()
        draw.text((15,875),'Original speed · Recorded video, not a live Safari test · Audio omitted',font=fonts[18],fill='#e4edf5')
        draw.text((15,900),'Green: selected ball   Cyan: measured body/wrists   Amber: recovery proposal',font=fonts[16],fill='#b6c9d7')
        draw.text((15,923),'Final audit: 101/105 matched, 0 extra. Newest fast clip still misses 4.',font=fonts[16],fill='#ffc857')
        encoder.stdin.write(canvas.tobytes())
        if index==150:canvas.save(output.with_suffix('.png'))
    encoder.stdin.close()
    if encoder.wait()!=0:raise RuntimeError('Video encoder failed')
    for entry in entries:
        n=len(entry['labels']);sheet=Image.new('RGB',(7*250,math.ceil(n/7)*200),'#071522');sd=ImageDraw.Draw(sheet)
        for no,frame in entry['contact_frames'].items():
            x=(no%7)*250;y=(no//7)*200;sheet.paste(frame.crop((250,190,500,360)),(x,y));sd.text((x+8,y+174),f'#{no+1}  {entry["labels"][no]:.3f}s',font=fonts[16],fill='white')
        sheet.save(output.parent/(entry['key']+'-contact-review.png'))
finally:
    for stream in streams:
        stream.terminate();stream.stdout.close();stream.wait()
    if encoder.poll()is None:encoder.kill();encoder.wait()
print(json.dumps({'output':str(output),'seconds':duration,'fps':FPS}))
