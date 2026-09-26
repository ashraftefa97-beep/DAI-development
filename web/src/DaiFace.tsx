import { useEffect, useRef } from 'react';
import { DaiMotion, clamp } from './motion.mjs';
import { drawDai, stageScale } from './draw.mjs';
import { daiSfx } from './daiSfx';
import type { DaiAvatarStyle } from './avatarCatalog';

export type DaiState = 'idle' | 'typing' | 'reply' | 'listen' | 'wave' | 'search' | 'found' | 'talk' | 'happy' | 'stretch' | 'fishing' | 'heart' | 'dance' | 'idea' | 'sleep' | 'blush' | 'wow' | 'approve' | 'focus' | 'relax' | 'working' | 'response_ready' | 'peek' | 'nod_yes' | 'shake_no' | 'celebrate' | 'shy' | 'alert' | 'look_around' | 'recharge' | 'success' | 'error' | 'music_groove' | 'wake_up' | 'roam_walk' | 'bounce' | 'bow' | 'double_wave' | 'side_stretch' | 'startled' | 'scout' | 'window_peek' | 'tip_toe' | 'thought_orbit' | 'cozy_sway' | 'welcome_back' | 'giggle' | 'laugh' | 'proud' | 'excited' | 'confused' | 'thinking_deep' | 'question' | 'surprise_soft' | 'cheer' | 'clap' | 'salute' | 'hello_shy' | 'goodbye' | 'yawn' | 'dream' | 'meditate' | 'breathe' | 'read' | 'write' | 'type_fast' | 'code_focus' | 'brainstorm' | 'lightbulb_pop' | 'scan' | 'detect' | 'loading' | 'wait_patient' | 'impatient' | 'sneak' | 'hop_left' | 'hop_right' | 'spin' | 'sway' | 'pose_star' | 'party' | 'music_nod' | 'camera_pose' | 'victory' | 'high_five' | 'peace' | 'curious' | 'voicewait';
export type DaiRenderQuality='high'|'medium'|'low';
export type { DaiAvatarStyle } from './avatarCatalog';
export default function DaiFace({state='idle', reduced=false, quality='high', avatar='classic'}: {state?:DaiState; reduced?:boolean; quality?:DaiRenderQuality; avatar?:DaiAvatarStyle}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const motion=useRef(new DaiMotion());
  useEffect(()=>{ motion.current.setAvatar(avatar); motion.current.setGesture(state); },[state,avatar]);
  useEffect(()=>{ motion.current.setQuality(quality); },[quality]);
  useEffect(()=>{
    const onVoice=(event:Event)=>{
      const detail=(event as CustomEvent<{
        level?:number;
        active?:boolean;
        wide?:number;
        round?:number;
        accent?:number;
      }>).detail||{};
      motion.current.setVoiceLevel(
        detail.level||0,
        detail.active!==false,
        {
          wide:detail.wide||0,
          round:detail.round||0,
          accent:detail.accent||0
        }
      );
    };
    const onMood=(event:Event)=>{
      const detail=(event as CustomEvent<{mood?:string;intensity?:number}>).detail||{};
      motion.current.setSpeechMood(detail.mood||'neutral',detail.intensity??.65);
    };
    window.addEventListener('dai:voice-level',onVoice as EventListener);
    window.addEventListener('dai:speech-mood',onMood as EventListener);
    return()=>{
      window.removeEventListener('dai:voice-level',onVoice as EventListener);
      window.removeEventListener('dai:speech-mood',onMood as EventListener);
    };
  },[]);
  useEffect(()=>{
    const m=motion.current, query=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{ m.reduced=reduced||query.matches; if(m.reduced)m.particles=[]; };
    update();query.addEventListener('change',update);
    return ()=>query.removeEventListener('change',update);
  },[reduced]);
  useEffect(()=>{
    const node=canvas.current!, c=node.getContext('2d');
    if(!c)return;
    const m=motion.current;
    let w=600,h=420,frame=0,last=performance.now(),lastDraw=0,dragTotal=0,px=0,py=0;
    const resize=()=>{
      const rect=node.getBoundingClientRect(); w=rect.width;h=rect.height;
      // Premium supersampling keeps curved eyes, mouth strokes and tiny avatar
      // signatures crisp on Retina/HiDPI screens without changing CSS size.
      const area=w*h;
      const dprCap=quality==='high'
        ? (area<=360000?3:2.5)
        : quality==='medium'
          ? (area<=360000?2.2:1.9)
          : 1.5;
      const dpr=Math.min(devicePixelRatio||1,dprCap);
      node.width=Math.max(1,Math.round(w*dpr));
      node.height=Math.max(1,Math.round(h*dpr));
      c.setTransform(dpr,0,0,dpr,0,0);
      c.imageSmoothingEnabled=true;
      c.imageSmoothingQuality='high';
      drawDai(c,m,w,h,avatar);
    };
    const observer=new ResizeObserver(resize);observer.observe(node);resize();
    const tick=(now:number)=>{
      if(!document.hidden) {
        const dt=Math.min((now-last)/1000,.1);
        // Simulation timing must stay independent from render throttling.
        // Medium/low quality may skip draws, but DAI still advances in real time.
        m.advance(dt);
        for(const event of m.consumeAudioEvents()) daiSfx.playEvent(event);

        const minFrameMs=quality==='low'?27:quality==='medium'?17:0;
        if(!minFrameMs||now-lastDraw>=minFrameMs){
          drawDai(c,m,w,h,avatar);
          lastDraw=now;
        }
      }
      last=now;frame=requestAnimationFrame(tick);
    };
    const local=(e:PointerEvent)=>{
      const r=node.getBoundingClientRect(),s=stageScale(w,h);
      return {x:(e.clientX-r.left-w/2)/s-m.offset.x,y:(e.clientY-r.top-h/2-7)/s-m.offset.y};
    };
    const down=(e:PointerEvent)=>{
      const p=local(e);
      if((p.x/112)**2+(p.y/103)**2>=1)return;
      m.dragging=true;dragTotal=0;px=e.clientX;py=e.clientY;node.setPointerCapture(e.pointerId);
    };
    const move=(e:PointerEvent)=>{
      m.mouseInside=true;m.pointer=local(e);
      if(m.dragging) {
        const s=stageScale(w,h),dx=(e.clientX-px)/s,dy=(e.clientY-py)/s;
        px=e.clientX;py=e.clientY;dragTotal+=Math.abs(dx)+Math.abs(dy);
        m.offsetTarget.x=clamp(m.offsetTarget.x+dx*.7,-35,35);
        m.offsetTarget.y=clamp(m.offsetTarget.y+dy*.7,-18,18);
      }
    };
    const up=(e:PointerEvent)=>{
      if(!m.dragging)return;m.dragging=false;
      if(node.hasPointerCapture(e.pointerId))node.releasePointerCapture(e.pointerId);
      if(dragTotal<10&&['idle','voicewait'].includes(m.requestedGesture)) m.poke();
    };
    const cancel=()=>{m.dragging=false;m.mouseInside=false;};
    const leave=()=>{m.mouseInside=false;};
    const events: [string,EventListener][]=[['pointerdown',down as EventListener],['pointermove',move as EventListener],['pointerup',up as EventListener],['pointercancel',cancel],['pointerleave',leave]];
    events.forEach(([name,fn])=>node.addEventListener(name,fn));
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();events.forEach(([name,fn])=>node.removeEventListener(name,fn));m.dragging=false;};
  },[quality,avatar]);
  return <canvas ref={canvas} className='dai-canvas' role='img' aria-label={'ضي — '+avatar+' — '+state} data-avatar={avatar} data-state={'dai_'+(state==='idle'?'idle_soft':state)}>ضي</canvas>;
}
