export const AVATAR_VISUAL_DNA=Object.freeze({
  classic:{eye:'oval',mouth:'arc',hand:'open',handMark:'palmArc',signature:'classicBare'}
});

export function getAvatarVisualDNA(){
  return AVATAR_VISUAL_DNA.classic;
}

export function validateAvatarVisualDNA(ids=[]){
  return ids.every(id=>id==='classic')?[]:['only Classic visual DNA is supported'];
}
