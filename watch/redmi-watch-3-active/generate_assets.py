from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, shutil, zipfile

W,H=240,280
ROOT=Path(__file__).resolve().parent
DIST=ROOT/"dist"
IMG= DIST/"images"
BIG= IMG/"digits_big"
SMALL= IMG/"digits_small"

for p in (IMG,BIG,SMALL):
    p.mkdir(parents=True,exist_ok=True)

BG=(8,7,14)
PINK=(247,174,206)
PINK2=(216,138,189)
VIOLET=(181,162,244)
WHITE=(255,245,250)
MUTED=(171,153,190)

def font(size,bold=True):
    candidates=[
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    ]
    for c in candidates:
        try:return ImageFont.truetype(c,size)
        except:pass
    return ImageFont.load_default()

def bezier(p0,p1,p2,p3,steps=32):
    pts=[]
    for i in range(steps+1):
        t=i/steps;u=1-t
        x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0]
        y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]
        pts.append((int(x),int(y)))
    return pts

def glow_line(base,pts,fill,width=7,blur=7,alpha=100):
    layer=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    d.line(pts,fill=fill+(alpha,),width=width,joint="curve")
    layer=layer.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(layer)

def face_frame(sec):
    phase=sec/60*math.tau
    img=Image.new("RGBA",(W,H),BG+(255,))
    d=ImageDraw.Draw(img)

    # Ambient halo
    halo=Image.new("RGBA",(W,H),(0,0,0,0))
    hd=ImageDraw.Draw(halo)
    pulse=0.5+0.5*math.sin(phase*2)
    hd.ellipse((38,78,202,242),fill=(171,132,230,int(18+10*pulse)))
    halo=halo.filter(ImageFilter.GaussianBlur(24))
    img.alpha_composite(halo)

    # face body breathing
    cx=120+math.sin(phase)*2.1
    cy=161+math.sin(phase*1.15)*2.4
    rx=76*(1+0.012*math.sin(phase*1.2))
    ry=70*(1-0.016*math.sin(phase*1.2))

    # liquid limb phases: 0-14 idle, 15-29 listening, 30-44 thinking, 45-59 talking
    if sec<15:
        state="IDLE"; amp=.35
    elif sec<30:
        state="LISTEN"; amp=.65
    elif sec<45:
        state="THINK"; amp=.55
    else:
        state="TALK"; amp=.48

    # curved ribbon limbs
    endpoints=[]
    if state=="IDLE":
        endpoints=[(58+7*math.sin(phase*2),196+3*math.cos(phase)),(182+7*math.cos(phase*2),196+3*math.sin(phase))]
    elif state=="LISTEN":
        endpoints=[(52,184),(194,126+8*math.sin(phase*2))]
    elif state=="THINK":
        endpoints=[(72+4*math.sin(phase),116),(185,175+4*math.cos(phase))]
    else:
        endpoints=[(55,186+5*math.sin(phase*2)),(185,186-5*math.sin(phase*2))]

    for side,(ex,ey) in zip((-1,1),endpoints):
        ax=cx+side*61; ay=cy+22
        c1=(ax+side*18,ay-7)
        c2=(ex-side*24,ey+math.sin(phase+side)*4)
        pts=bezier((ax,ay),c1,c2,(ex,ey))
        glow_line(img,pts,(222,150,203),12,8,72)
        d=ImageDraw.Draw(img)
        d.line(pts,fill=PINK2+(220,),width=7,joint="curve")
        d.ellipse((ex-6,ey-8,ex+6,ey+8),fill=PINK+(235,))

    d=ImageDraw.Draw(img)

    # face outline volume
    d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),outline=(255,220,239,45),width=2)

    # eyes
    blink = sec in (7,8,27,28,47,48)
    eye_y=145
    gaze=0
    if state=="LISTEN": gaze=3.5
    if state=="THINK": gaze=-4
    eye_h=2 if blink else 13
    for ex in (91,149):
        x=ex+gaze
        d.rounded_rectangle((x-10,eye_y-eye_h,x+10,eye_y+eye_h),radius=10,fill=WHITE)
        if not blink:
            d.ellipse((x-2+gaze*.25,eye_y-2,x+3+gaze*.25,eye_y+3),fill=(116,92,150))

    # brows / expression
    brow_shift=-2 if state=="THINK" else 0
    d.arc((77,124+brow_shift,103,138+brow_shift),190,350,fill=(221,190,236),width=2)
    d.arc((137,124-brow_shift,163,138-brow_shift),190,350,fill=(221,190,236),width=2)

    # mouth
    if state=="TALK":
        openv=5+7*(0.5+0.5*math.sin(phase*6))
        d.ellipse((108,178-openv/2,132,178+openv),fill=(232,151,185))
        d.arc((107,171,133,190),0,180,fill=WHITE,width=2)
    elif state=="LISTEN":
        d.arc((108,171,132,187),5,175,fill=PINK,width=3)
    elif state=="THINK":
        d.arc((109,176,131,185),190,350,fill=PINK,width=3)
    else:
        d.arc((108,171,132,187),10,170,fill=PINK,width=3)

    # cheeks
    d.ellipse((70,169,82,176),fill=(241,134,182,42))
    d.ellipse((158,169,170,176),fill=(241,134,182,42))

    # status and tiny brand
    sf=font(11,True)
    d.text((12,251),"DAI",font=sf,fill=PINK)
    label_w=d.textbbox((0,0),state,font=sf)[2]
    d.text((120-label_w/2,247),state,font=sf,fill=MUTED)

    # battery shell placeholder; actual battery number can overlay in EasyFace
    d.rounded_rectangle((214,251,230,260),radius=2,outline=(205,188,220),width=1)
    d.rectangle((230,254,232,257),fill=(205,188,220))
    d.rectangle((216,253,226,258),fill=(205,188,220))

    return img.convert("RGB")

# 60 second-driven frames
for sec in range(60):
    face_frame(sec).save(IMG/f"second_{sec:02d}.png",optimize=True)

# preview required by Redmi Watch 3 Active
face_frame(8).resize((156,182),Image.Resampling.LANCZOS).save(DIST/"preview.png",optimize=True)

# digit sprites
def digit_set(folder,size,font_size):
    f=font(font_size,True)
    for ch in "0123456789":
        im=Image.new("RGBA",size,(0,0,0,0))
        dd=ImageDraw.Draw(im)
        box=dd.textbbox((0,0),ch,font=f)
        x=(size[0]-(box[2]-box[0]))/2
        y=(size[1]-(box[3]-box[1]))/2-box[1]
        dd.text((x,y),ch,font=f,fill=WHITE)
        im.save(folder/f"{ch}.png",optimize=True)
    if folder==BIG:
        im=Image.new("RGBA",(12,size[1]),(0,0,0,0));dd=ImageDraw.Draw(im)
        r=2
        dd.ellipse((4,13-r,4+2*r,13+r),fill=WHITE)
        dd.ellipse((4,30-r,4+2*r,30+r),fill=WHITE)
        im.save(folder/"colon.png",optimize=True)

digit_set(BIG,(26,44),36)
digit_set(SMALL,(14,20),15)

# machine-readable frame map
(DIST/"frame_map.txt").write_text("\n".join(f"{i:02d}=images/second_{i:02d}.png" for i in range(60)),encoding="utf-8")

# Bundle the M65A shell profile and EasyFace layout next to the generated assets.
for name in ("easyface-layout.json", "m65a-shell.json"):
    source = ROOT / name
    if source.exists():
        shutil.copy2(source, DIST / name)

(DIST/"INSTALL.txt").write_text(
    "DAI Shell M65A - Redmi Watch 3 Active\n"
    "Resolution: 240x280\n\n"
    "This archive contains visual watch-face assets and layout metadata.\n"
    "Import/build it with a Redmi Watch 3 Active compatible EasyFace toolchain.\n"
    "Do not use ENG mode, USER DEBUG mode, force OTA, or unknown firmware files.\n",
    encoding="utf-8"
)

zip_path=DIST/"DAI_Watch_Redmi3Active_Assets.zip"
if zip_path.exists(): zip_path.unlink()
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    for p in sorted(DIST.rglob("*")):
        if p.is_file() and p!=zip_path:
            z.write(p,p.relative_to(DIST))

print("Generated",zip_path)
