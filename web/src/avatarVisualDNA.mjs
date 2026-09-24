export const AVATAR_VISUAL_DNA=Object.freeze({
  classic:{eye:'oval',mouth:'arc',hand:'open',handMark:'palmArc',signature:'classicBare'},
  minimal:{eye:'dot',mouth:'dash',hand:'mitten',handMark:'none',signature:'baseline'},
  cute:{eye:'round',mouth:'w',hand:'rounded',handMark:'heart',signature:'heartBurst'},
  cyber:{eye:'hex',mouth:'digital',hand:'angular',handMark:'circuit',signature:'visorScan'},
  soft:{eye:'cloud',mouth:'softArc',hand:'rounded',handMark:'spark',signature:'cloudHalo'},
  pro:{eye:'slim',mouth:'calm',hand:'formal',handMark:'cuff',signature:'goldFrame'},
  hologram:{eye:'holo',mouth:'segment',hand:'wire',handMark:'rings',signature:'echo'},
  sakura:{eye:'petal',mouth:'blossom',hand:'petal',handMark:'petal',signature:'petalCrown'},
  ocean:{eye:'droplet',mouth:'wave',hand:'wave',handMark:'bubble',signature:'bubbleWave'},
  solar:{eye:'sun',mouth:'bright',hand:'ray',handMark:'sun',signature:'sunHalo'},
  midnight:{eye:'crescent',mouth:'sleepy',hand:'crescent',handMark:'star',signature:'moon'},
  mint:{eye:'leaf',mouth:'leafArc',hand:'leaf',handMark:'leaf',signature:'sprout'},
  aurora:{eye:'ribbon',mouth:'ribbon',hand:'ribbon',handMark:'ribbon',signature:'auroraRibbon'},
  ember:{eye:'flame',mouth:'smirk',hand:'flame',handMark:'ember',signature:'flameCrown'},
  rose:{eye:'gem',mouth:'diamond',hand:'jewel',handMark:'gem',signature:'roseGem'},
  ice:{eye:'crystal',mouth:'crystalArc',hand:'crystal',handMark:'frost',signature:'iceCrown'},
  lime:{eye:'bolt',mouth:'zigzag',hand:'angular',handMark:'bolt',signature:'lightning'},
  violet:{eye:'orbit',mouth:'orbitArc',hand:'ringed',handMark:'orbit',signature:'violetOrbit'},
  pearl:{eye:'pearl',mouth:'tiny',hand:'rounded',handMark:'pearl',signature:'pearlChain'},
  crimson:{eye:'sharp',mouth:'pulse',hand:'angular',handMark:'pulse',signature:'heartbeat'},
  galaxy:{eye:'star',mouth:'cosmic',hand:'orbit',handMark:'star',signature:'planetRing'},
  desert:{eye:'dune',mouth:'duneWave',hand:'sand',handMark:'sun',signature:'duneSun'},
  lavender:{eye:'butterfly',mouth:'lavenderArc',hand:'petal',handMark:'flower',signature:'butterfly'},
  matrix:{eye:'square',mouth:'code',hand:'digital',handMark:'code',signature:'codeRain'}
});

export function getAvatarVisualDNA(id='classic'){
  return AVATAR_VISUAL_DNA[id]||AVATAR_VISUAL_DNA.classic;
}

export function validateAvatarVisualDNA(ids=[]){
  const errors=[];
  const seen=new Set();
  for(const id of ids){
    const dna=AVATAR_VISUAL_DNA[id];
    if(!dna){errors.push(`${id}: missing visual DNA`);continue;}
    for(const key of ['eye','mouth','hand','handMark','signature']){
      if(!dna[key])errors.push(`${id}: missing ${key}`);
    }
    const fingerprint=[dna.eye,dna.mouth,dna.hand,dna.handMark,dna.signature].join('|');
    if(seen.has(fingerprint))errors.push(`${id}: duplicate visual DNA fingerprint`);
    seen.add(fingerprint);
  }
  return errors;
}
