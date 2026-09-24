import classic from './libraries/classic.mjs';
import minimal from './libraries/minimal.mjs';
import cute from './libraries/cute.mjs';
import cyber from './libraries/cyber.mjs';
import soft from './libraries/soft.mjs';
import pro from './libraries/pro.mjs';
import hologram from './libraries/hologram.mjs';
import sakura from './libraries/sakura.mjs';
import ocean from './libraries/ocean.mjs';
import solar from './libraries/solar.mjs';
import midnight from './libraries/midnight.mjs';
import mint from './libraries/mint.mjs';
import aurora from './libraries/aurora.mjs';
import ember from './libraries/ember.mjs';
import rose from './libraries/rose.mjs';
import ice from './libraries/ice.mjs';
import lime from './libraries/lime.mjs';
import violet from './libraries/violet.mjs';
import pearl from './libraries/pearl.mjs';
import crimson from './libraries/crimson.mjs';
import galaxy from './libraries/galaxy.mjs';
import desert from './libraries/desert.mjs';
import lavender from './libraries/lavender.mjs';
import matrix from './libraries/matrix.mjs';
import { selectAvatarVariant, validateAvatarLibrary, shouldAutoCycleAvatarSlot } from './runtime.mjs';

export const AVATAR_ANIMATION_LIBRARIES=Object.freeze({
  classic,
  minimal,
  cute,
  cyber,
  soft,
  pro,
  hologram,
  sakura,
  ocean,
  solar,
  midnight,
  mint,
  aurora,
  ember,
  rose,
  ice,
  lime,
  violet,
  pearl,
  crimson,
  galaxy,
  desert,
  lavender,
  matrix
});

export function getAvatarAnimationLibrary(id='classic'){
  return AVATAR_ANIMATION_LIBRARIES[id]||AVATAR_ANIMATION_LIBRARIES.classic;
}

export function chooseAvatarAnimation(id,requestedGesture,options={}){
  const library=getAvatarAnimationLibrary(id);
  const variant=selectAvatarVariant(library,requestedGesture,options);
  return variant?{
    ...variant,
    cooldownMs:library.cooldownMs,
    reducedIntensity:library.reducedMotion?.intensity??.22,
    personality:library.personality
  }:null;
}

export { validateAvatarLibrary, shouldAutoCycleAvatarSlot };
