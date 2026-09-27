// Original DAI performance curves. No external character assets or motion data.
// Eye-led accents complement the Astra hand/prop paths without replacing them.
const groups = {
  greeting: 'wave double_wave welcome_back hello_shy goodbye salute high_five peace bow',
  delight: 'happy found celebrate success victory cheer clap proud excited giggle laugh',
  curiosity: 'curious question confused wow surprise_soft startled alert peek window_peek',
  thought: 'idea brainstorm lightbulb_pop thinking_deep focus code_focus read write type_fast thought_orbit',
  discovery: 'search scan detect scout look_around',
  rhythm: 'dance music_groove music_nod sway party pose_star camera_pose spin bounce hop_left hop_right',
  rest: 'sleep dream yawn meditate breathe relax recharge cozy_sway stretch side_stretch',
  attention: 'listen nod_yes shake_no wait_patient working loading'
};
export const CLASSIC_PERFORMANCE_FAMILIES = Object.freeze(Object.fromEntries(
  Object.entries(groups).flatMap(([family,names])=>names.split(' ').map(name=>[name,family]))
));
const pulse=(t,start,width)=>{
  const u=(t-start)/width;
  return u>0&&u<1?Math.sin(Math.PI*u)**2:0;
};
export function applyClassicPerformance(p,m){
  if(m.avatarStyle!=='classic'||m.reduced||m.dragging||m.voiceDriven||m.voice>.01)return p;
  const g=m.requestedGesture;
  // Playback alone owns the lips. Text and voice waiting never perform a gesture.
  if(['talk','reply','typing','voicewait','idle'].includes(g))return p;
  const family=CLASSIC_PERFORMANCE_FAMILIES[g];
  if(!family)return p;
  const t=Math.max(0,m.gestureTime);
  const lead=pulse(t,0,.65), accent=pulse(t,.24,1.1), settle=pulse(t,1.12,1.0);
  // Finite accents: holding a state doesn't repeat a greeting or celebration.
  switch(family){
    case 'greeting':
      p.gaze_x+=2.6*lead;p.tilt-=2*accent;p.smile+=.12*accent;
      p.bob-=1.8*accent;p.brow+=.09*settle;break;
    case 'delight':
      p.brow+=.15*lead;p.bob+=1.2*lead-3.4*accent;
      p.sx+=.012*lead-.008*accent;p.sy-=.01*lead-.012*accent;
      p.cheek+=.15*accent;p.smile+=.12*settle;break;
    case 'curiosity':
      p.gaze_x-=3.2*lead;p.gaze_y-=1.1*lead;p.tilt+=2.8*accent;
      p.left+=.08*accent;p.right-=.06*accent;p.brow+=.12*settle;break;
    case 'thought':
      p.gaze_y-=2.2*lead;p.gaze_x+=1.8*accent;p.tilt-=1.6*accent;
      p.brow+=.12*accent;p.smile+=.08*settle;break;
    case 'discovery':
      p.gaze_x+=3.8*lead-2.4*accent;p.tilt+=1.5*accent;
      p.brow+=.12*settle;break;
    case 'rhythm': {
      const envelope=pulse(t,0,3.2);
      p.tilt+=Math.sin(t*4.8)*2*envelope;
      p.bob-=Math.sin(t*4.8)**2*2.2*envelope;p.cheek+=.09*envelope;break;
    }
    case 'rest':
      p.gaze_y+=1.2*lead;p.tilt-=1.4*accent;
      p.left-=.07*accent;p.right-=.07*accent;p.bob+=1.4*settle;break;
    case 'attention':
      p.gaze_y-=.8*lead;p.brow+=.1*lead;p.tilt+=1.1*accent;
      p.bob+=.9*settle;break;
  }
  return p;
}
