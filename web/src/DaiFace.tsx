import { useEffect, useRef } from 'react';
import { DaiMotion, clamp } from './motion.mjs';
import { drawDai, stageScale } from './draw.mjs';

export type DaiState = 'idle' | 'typing' | 'reply' | 'listen' | 'wave' | 'search' | 'found' | 'talk' | 'happy' | 'stretch' | 'fishing' | 'heart' | 'dance' | 'idea' | 'sleep' | 'blush' | 'wow' | 'approve' | 'focus' | 'relax' | 'working' | 'response_ready' | 'peek' | 'nod_yes' | 'shake_no' | 'celebrate' | 'shy' | 'alert' | 'look_around' | 'recharge' | 'success' | 'error' | 'music_groove' | 'wake_up' | 'roam_walk' | 'bounce' | 'bow' | 'double_wave' | 'side_stretch' | 'startled' | 'scout' | 'window_peek' | 'tip_toe' | 'thought_orbit' | 'cozy_sway' | 'welcome_back' | 'curious' | 'voicewait';
export default function DaiFace({state='idle', reduced=false}: {state?:DaiState; reduced?:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const motion=useRef(new DaiMotion());
  useEffect(()=>{ motion.current.setGesture(state); },[state]);
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
    let w=600,h=420,frame=0,last=performance.now(),dragTotal=0,px=0,py=0;
    const resize=()=>{
      const rect=node.getBoundingClientRect(); w=rect.width;h=rect.height;
      const dpr=Math.min(devicePixelRatio||1,2);
      node.width=Math.round(w*dpr);node.height=Math.round(h*dpr);c.setTransform(dpr,0,0,dpr,0,0);
      drawDai(c,m,w,h);
    };
    const observer=new ResizeObserver(resize);observer.observe(node);resize();
    const tick=(now:number)=>{
      if(!document.hidden) {
        m.advance(Math.min((now-last)/1000,.1));
        drawDai(c,m,w,h);
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
      if(dragTotal<10&&m.gesture==='idle') {m.idleAction='smile';m.idleUntil=m.elapsed+1.4;m.burst(0,-25,10);}
    };
    const cancel=()=>{m.dragging=false;m.mouseInside=false;};
    const leave=()=>{m.mouseInside=false;};
    const events: [string,EventListener][]=[['pointerdown',down as EventListener],['pointermove',move as EventListener],['pointerup',up as EventListener],['pointercancel',cancel],['pointerleave',leave]];
    events.forEach(([name,fn])=>node.addEventListener(name,fn));
    frame=requestAnimationFrame(tick);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();events.forEach(([name,fn])=>node.removeEventListener(name,fn));m.dragging=false;};
  },[]);
  return <canvas ref={canvas} className='dai-canvas' role='img' aria-label={'ضي — وجه عائم — '+state} data-state={'dai_'+(state==='idle'?'idle_soft':state)}>ضي</canvas>;
}
