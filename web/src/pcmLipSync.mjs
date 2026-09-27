// One animation loop per AudioContext. Late UI frames sample the current audio
// position instead of replaying a backlog of expired mouth events.
const clocks=new WeakMap();
export function queuePcmLipSync(ctx,frames,startAt,step,duration,isActive,emit){
  let clock=clocks.get(ctx);
  if(!clock){clock={entries:[],raf:null};clocks.set(ctx,clock);}
  clock.entries.push({frames,startAt,step,end:startAt+duration,isActive,emit});
  if(clock.raf!==null)return;
  const tick=()=>{
    clock.raf=null;
    const now=ctx.currentTime;
    clock.entries=clock.entries.filter(entry=>entry.isActive()&&now<entry.end);
    const current=ctx.state==='running'
      ?clock.entries.find(entry=>now>=entry.startAt&&now<entry.end):null;
    if(current){
      const index=Math.min(current.frames.length-1,Math.floor((now-current.startAt)/current.step));
      const frame=current.frames[index];
      current.emit(frame.level,true,frame);
    }else emit(0,false);
    if(clock.entries.length)clock.raf=requestAnimationFrame(tick);
  };
  clock.raf=requestAnimationFrame(tick);
}
