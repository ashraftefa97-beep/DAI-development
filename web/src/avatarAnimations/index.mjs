import classic from './libraries/classic.mjs';
import { selectAvatarVariant, validateAvatarLibrary, shouldAutoCycleAvatarSlot } from './runtime.mjs';

export const AVATAR_ANIMATION_LIBRARIES=Object.freeze({classic});

export function getAvatarAnimationLibrary(){
  return AVATAR_ANIMATION_LIBRARIES.classic;
}

export function chooseAvatarAnimation(_id,requestedGesture,options={}){
  const library=AVATAR_ANIMATION_LIBRARIES.classic;
  const variant=selectAvatarVariant(library,requestedGesture,options);
  return variant?{
    ...variant,
    cooldownMs:library.cooldownMs,
    reducedIntensity:library.reducedMotion?.intensity??.22,
    personality:library.personality
  }:null;
}

export { validateAvatarLibrary, shouldAutoCycleAvatarSlot };
