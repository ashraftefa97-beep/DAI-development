from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, shutil, zipfile

W,H=240,280
ROOT=Path(__file__).resolve().parent
DIST=ROOT/"dist"
IMG=DIST/"images"
BIG=IMG/"digits_big"
SMALL=IMG/"digits_small"

for p in (IMG,BIG,SMALL):
    p.mkdir(parents=True,exist_ok=True)

# Classic DAI palette copied from the web avatar's dark theme.
BG_TOP=(18,17,34)
BG_BOTTOM=(9,9,18)
EYE_A=(255,247,236)
EYE_B=(255,228,237)
EYE_C=(206,189,247)
BROW=(222,193,238)
MOUTH=(255,218,229)
CHEEK=(247,142,183)
WHITE=(255,247,236)

def font(size,bold=True):
    candidates=[
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"
    ]
    for c in candidates:
        try:return ImageFont.truetype(c,size)
        except:pass
    return ImageFont.load_default()

def vertical_gradient(size, top, bottom):
    w,h=size
    im=Image.new("RGB",(w,h))
    px=im.load()
    for y in range(h):
        t=y/max(1,h-1)
        col=tuple(round(top[i]*(1-t)+bottom[i]*t) for i in range(3))
        for x in range(w):
            px[x,y]=col
    return im

def radial_glow(base,cx,cy,rx,ry,color,alpha=36,blur=24):
    layer=Image.new("RGBA",(W,H),(0,0,0,0))
    d=ImageDraw.Draw(layer)
    d.ellipse((cx-rx,cy-ry,cx+rx,cy+ry),fill=color+(alpha,))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))

def gradient_capsule(base,box,top,bottom,radius):
    x0,y0,x1,y1=map(int,box)
    w=max(1,x1-x0); h=max(1,y1-y0)
    grad=vertical_gradient((w,h),top,bottom).convert("RGBA")
    mask=Image.new("L",(w,h),0)
    md=ImageDraw.Draw(mask)
    md.rounded_rectangle((0,0,w-1,h-1),radius=radius,fill=255)
    shadow=Image.new("RGBA",(W,H),(0,0,0,0))
    sh=ImageDraw.Draw(shadow)
    sh.rounded_rectangle((x0,y0,x1,y1),radius=radius,fill=(245,195,220,46))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6)))
    base.paste(grad,(x0,y0),mask)

def cubic_points(p0,p1,p2,p3,steps=28):
    out=[]
    for i in range(steps+1):
        t=i/steps;u=1-t
        x=u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0]
        y=u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]
        out.append((round(x),round(y)))
    return out

def draw_classic_face(sec):
    phase=sec/60*math.tau

    # Very dark indigo background like the Classic web avatar.
    bg=vertical_gradient((W,H),BG_TOP,BG_BOTTOM).convert("RGBA")
    img=bg.copy()

    # Classic has no face/head outline. Only a soft ambient presence.
    pulse=.5+.5*math.sin(phase*.85)
    radial_glow(img,120,145,76,82,(95,78,140),18+round(8*pulse),30)

    # Web Classic idle motion profile: tiny X/Y drift, micro tilt, breathing scale.
    dx=1.8*math.sin(phase*.85)
    dy=2.6*math.sin(phase*.72+.8)
    tilt=math.radians(.9*math.sin(phase*.66))
    scale=1+.008*math.sin(phase*.72)

    # Blink moments are deliberately sparse, matching Classic's calm idle feel.
    blink_strength=0.0
    for center in (8,31,52):
        dist=min((sec-center)%60,(center-sec)%60)
        if dist==0: blink_strength=1
        elif dist==1: blink_strength=max(blink_strength,.62)

    # Gentle gaze cycle; no body or hands in Classic Bare.
    gaze_x=3.0*math.sin(phase*.48)
    gaze_y=1.4*math.sin(phase*.37+1.1)

    # Small smile pulse around the middle of the loop.
    smile=max(0,math.sin((sec-18)/8*math.pi)) if 18<=sec<=26 else 0
    smile=max(smile, .22+.08*math.sin(phase*.9))

    # Draw to a local transparent face layer so the whole expression can micro-rotate.
    face=Image.new("RGBA",(150,150),(0,0,0,0))
    d=ImageDraw.Draw(face)

    # Coordinates roughly mirror draw.mjs: tall oval eyes + arc mouth + brows.
    cx,cy=75,70
    eye_y=55+gaze_y
    eye_h=max(4,52*(1-.92*blink_strength))
    eye_w=23
    spacing=46

    for side in (-1,1):
        ex=cx+side*spacing/2+gaze_x
        if eye_h<=7:
            d.rounded_rectangle((ex-eye_w/2,eye_y-2,ex+eye_w/2,eye_y+2),radius=3,fill=EYE_B+(255,))
        else:
            # Gradient capsule equivalent to the Classic web eye material.
            tmp=Image.new("RGBA",(150,150),(0,0,0,0))
            gradient_capsule(tmp,(ex-eye_w/2,eye_y-eye_h/2,ex+eye_w/2,eye_y+eye_h/2),EYE_A,EYE_C,11)
            face.alpha_composite(tmp)

    # Brows: subtle and separate, as in the Classic site avatar.
    brow_y=23+gaze_y*.25
    for side in (-1,1):
        bx=cx+side*spacing/2
        pts=cubic_points((bx-11,brow_y+2),(bx-4,brow_y-3),(bx+5,brow_y-4),(bx+11,brow_y))
        d.line(pts,fill=BROW+(158,),width=2)

    # Classic arc mouth. Smile changes curvature, never becomes a cartoon body.
    mouth_y=104
    half=18+2*smile
    depth=5+8*smile
    pts=cubic_points((cx-half,mouth_y),(cx-8,mouth_y+depth),(cx+8,mouth_y+depth),(cx+half,mouth_y))
    d.line(pts,fill=MOUTH+(235,),width=3)

    # Very faint cheeks, only visible during stronger smile.
    if smile>.45:
        a=round(28+38*smile)
        d.ellipse((31,83,43,89),fill=CHEEK+(a,))
        d.ellipse((107,83,119,89),fill=CHEEK+(a,))

    # Apply the same "alive but calm" micro motion to the complete face.
    if abs(tilt)>.0001:
        face=face.rotate(math.degrees(tilt),resample=Image.Resampling.BICUBIC,expand=False,center=(75,70))
    if abs(scale-1)>.0001:
        nw=max(1,round(face.width*scale)); nh=max(1,round(face.height*scale))
        scaled=face.resize((nw,nh),Image.Resampling.LANCZOS)
        face=Image.new("RGBA",(150,150),(0,0,0,0))
        face.alpha_composite(scaled,((150-nw)//2,(150-nh)//2))

    img.alpha_composite(face,(round(45+dx),round(72+dy)))
    return img.convert("RGB")

# 60 second-driven Classic DAI frames for Redmi Watch 3 Active.
for sec in range(60):
    draw_classic_face(sec).save(IMG/f"second_{sec:02d}.png",optimize=True)

# Preview required by Redmi Watch 3 Active.
draw_classic_face(12).resize((156,182),Image.Resampling.LANCZOS).save(DIST/"preview.png",optimize=True)

# Digit sprites used by EasyFace clock overlays.
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

(DIST/"frame_map.txt").write_text(
    "\n".join(f"{i:02d}=images/second_{i:02d}.png" for i in range(60)),
    encoding="utf-8"
)

for name in ("easyface-layout.json","m65a-shell.json"):
    source=ROOT/name
    if source.exists():
        shutil.copy2(source,DIST/name)

(DIST/"INSTALL.txt").write_text(
    "DAI Classic Shell M65A - Redmi Watch 3 Active\n"
    "Resolution: 240x280\n\n"
    "Visual style: DAI Classic from the website (bare face, oval gradient eyes, arc mouth).\n"
    "Animation: 60 second-driven frames for compatibility with Redmi Watch 3 Active.\n"
    "This archive is a watch-face asset pack, NOT OTA firmware.\n"
    "Do not use ENG mode, USER DEBUG mode, force OTA, or unknown firmware files.\n",
    encoding="utf-8"
)

zip_path=DIST/"DAI_Watch_Redmi3Active_Assets.zip"
if zip_path.exists():zip_path.unlink()
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    for p in sorted(DIST.rglob("*")):
        if p.is_file() and p!=zip_path:
            z.write(p,p.relative_to(DIST))

print("Generated",zip_path)
