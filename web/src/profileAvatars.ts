export type ProfileAvatar = {
  id: string;
  name: string;
  style: string;
  image: string;
};

type PortraitPalette = {
  id: string;
  name: string;
  style: string;
  background: [string, string];
  skin: string;
  hair: string;
  shirt: string;
  accent: string;
  hairShape: 'short' | 'long' | 'curly' | 'bob' | 'hood' | 'headband';
  accessory?: 'glasses' | 'earrings' | 'visor' | 'scarf';
};

const portraits: PortraitPalette[] = [
  { id: 'soft-minimal', name: 'ندى', style: 'Minimal', background: ['#f6cbdc', '#f4e8c7'], skin: '#c98066', hair: '#312637', shirt: '#faf6f1', accent: '#d67b9d', hairShape: 'bob' },
  { id: 'studio-minimal', name: 'سليم', style: 'Minimal', background: ['#bde6dc', '#e4edce'], skin: '#9d644c', hair: '#24373b', shirt: '#e9f3eb', accent: '#4f9e91', hairShape: 'short', accessory: 'glasses' },
  { id: 'cyber-pulse', name: 'نيون', style: 'Cyber', background: ['#231754', '#137e88'], skin: '#ad7567', hair: '#202039', shirt: '#28224d', accent: '#54f0de', hairShape: 'short', accessory: 'visor' },
  { id: 'cyber-orbit', name: 'مدار', style: 'Cyber', background: ['#401f68', '#182a54'], skin: '#6f5365', hair: '#151927', shirt: '#392858', accent: '#ef65cf', hairShape: 'headband' },
  { id: 'cute-peach', name: 'خوخ', style: 'Cute', background: ['#ffd5c5', '#f6b9ce'], skin: '#e0a27c', hair: '#784558', shirt: '#f8e5ee', accent: '#f18f9f', hairShape: 'curly', accessory: 'earrings' },
  { id: 'cute-cloud', name: 'غيمة', style: 'Cute', background: ['#cfe8ff', '#e8d9ff'], skin: '#b77962', hair: '#45334e', shirt: '#eff1fa', accent: '#9d85dc', hairShape: 'long' },
  { id: 'gamer-ember', name: 'ليث', style: 'Gamer', background: ['#283348', '#5a332f'], skin: '#c48a68', hair: '#29222b', shirt: '#252d3f', accent: '#ff9a52', hairShape: 'hood' },
  { id: 'gamer-frost', name: 'جليد', style: 'Gamer', background: ['#193d58', '#477b9a'], skin: '#e0b492', hair: '#523b37', shirt: '#dceaf3', accent: '#86e6ef', hairShape: 'short', accessory: 'glasses' },
  { id: 'manga-sakura', name: 'ساكورا', style: 'Anime-inspired', background: ['#f4b8d3', '#fae1b5'], skin: '#f0c0a2', hair: '#59334e', shirt: '#fff0f6', accent: '#d7609e', hairShape: 'headband' },
  { id: 'manga-sora', name: 'سورا', style: 'Anime-inspired', background: ['#a8d8ec', '#d2c6f2'], skin: '#dda98d', hair: '#2b344d', shirt: '#edf4ff', accent: '#6788d7', hairShape: 'short' },
  { id: 'earth-olive', name: 'زيتون', style: 'Natural', background: ['#bfd0aa', '#e6cf9b'], skin: '#805644', hair: '#2c2928', shirt: '#435946', accent: '#c49550', hairShape: 'curly' },
  { id: 'earth-sand', name: 'رمل', style: 'Natural', background: ['#eacb9b', '#f4e5c1'], skin: '#d3a080', hair: '#674532', shirt: '#f6f0e2', accent: '#bd8655', hairShape: 'headband', accessory: 'scarf' },
  { id: 'rose-night', name: 'ليل', style: 'Portrait', background: ['#3c3567', '#996181'], skin: '#a96f60', hair: '#261e34', shirt: '#463855', accent: '#e8a5bc', hairShape: 'long', accessory: 'earrings' },
  { id: 'blue-hour', name: 'فجر', style: 'Portrait', background: ['#6b8ca6', '#bac7dc'], skin: '#d7a788', hair: '#493b3d', shirt: '#dfe7ec', accent: '#f1bd84', hairShape: 'bob' },
  { id: 'mono-slate', name: 'رمادي', style: 'Monochrome', background: ['#414955', '#a1aab4'], skin: '#b4826c', hair: '#292d36', shirt: '#d5d9de', accent: '#edf0f2', hairShape: 'short' },
  { id: 'mono-lilac', name: 'بنفسج', style: 'Monochrome', background: ['#716986', '#c5b6cf'], skin: '#d2a18b', hair: '#40394f', shirt: '#ece5ef', accent: '#f5d4eb', hairShape: 'curly', accessory: 'glasses' },
];

function portraitSvg(p: PortraitPalette, index: number) {
  const id = `profile-${index}`;
  const hair = {
    short: `<path d="M39 83c-8-37 11-58 41-58 33 0 50 23 43 59-5-9-11-16-17-20-16 12-40 16-67 12z" fill="${p.hair}"/>`,
    long: `<path d="M35 82c-7-35 12-58 45-58 36 0 51 27 43 70l-6 53H44l-8-46z" fill="${p.hair}"/><path d="M43 86c11-8 14-21 14-34 18 11 39 10 58 1 7 14 10 26 8 39-12-10-18-19-20-28-18 17-36 24-60 22z" fill="${p.hair}"/>`,
    curly: `<path d="M38 82c-7-32 9-58 44-58 33 0 49 22 44 57l-8 16-10-13-5-17-15 9-10-13-15 13-12-8-7 18z" fill="${p.hair}"/><circle cx="47" cy="40" r="13" fill="${p.hair}"/><circle cx="66" cy="28" r="13" fill="${p.hair}"/><circle cx="88" cy="26" r="14" fill="${p.hair}"/><circle cx="109" cy="35" r="13" fill="${p.hair}"/>`,
    bob: `<path d="M37 81c-6-36 13-57 45-57 34 0 49 23 43 58l-5 24c-9-9-13-19-14-32-18 15-40 21-66 17l-1 20-8-3z" fill="${p.hair}"/>`,
    hood: `<path d="M28 140c4-60 12-104 54-112 42 8 51 51 56 112l-25 4-8-30H58l-8 30z" fill="${p.hair}"/><path d="M43 79c0-28 15-43 39-43s39 15 39 43v41H43z" fill="${p.shirt}"/>`,
    headband: `<path d="M39 82c-8-37 11-57 43-57 35 0 49 24 42 62l-9-15c-17 12-42 15-70 9z" fill="${p.hair}"/><path d="M41 56c22 11 51 9 78-4l4 9c-27 15-57 17-84 5z" fill="${p.accent}"/>`,
  }[p.hairShape];
  const accessory = p.accessory === 'glasses'
    ? `<g fill="none" stroke="${p.accent}" stroke-width="4"><circle cx="65" cy="83" r="11"/><circle cx="103" cy="83" r="11"/><path d="M76 83h16M53 80l-7-3m72 3 7-3"/></g>`
    : p.accessory === 'visor'
      ? `<path d="M46 70q38-20 78 0l-5 17H51z" fill="${p.accent}" opacity=".86"/><path d="M56 78h57" stroke="#efffff" stroke-width="3" opacity=".8"/>`
      : p.accessory === 'earrings'
        ? `<circle cx="43" cy="95" r="4" fill="${p.accent}"/><circle cx="125" cy="95" r="4" fill="${p.accent}"/>`
        : p.accessory === 'scarf'
          ? `<path d="M44 107q38 19 78 0l7 42H38z" fill="${p.accent}"/><path d="M55 117q27 15 56 1" stroke="#fff1d8" stroke-width="4" opacity=".8"/>`
          : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="${id}-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.background[0]}"/><stop offset="1" stop-color="${p.background[1]}"/></linearGradient><radialGradient id="${id}-light"><stop stop-color="#fff" stop-opacity=".58"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="160" height="160" rx="34" fill="url(#${id}-bg)"/><circle cx="34" cy="28" r="75" fill="url(#${id}-light)"/><circle cx="131" cy="125" r="33" fill="${p.accent}" opacity=".16"/><path d="M25 160c4-31 24-46 55-46s52 15 55 46" fill="${p.shirt}"/><path d="M62 108h36v19c-9 11-27 11-36 0z" fill="${p.skin}"/><path d="M64 113h32l1 9q-16 12-34 0z" fill="${p.accent}" opacity=".7"/><ellipse cx="80" cy="77" rx="39" ry="45" fill="${p.skin}"/>${hair}<path d="M63 84q5-4 10 0m16 0q5-4 10 0" fill="none" stroke="#392934" stroke-width="3" stroke-linecap="round"/><ellipse cx="68" cy="88" rx="3" ry="4" fill="#30252b"/><ellipse cx="96" cy="88" rx="3" ry="4" fill="#30252b"/><path d="M75 104q6 4 12 0" fill="none" stroke="#9a4f54" stroke-width="3" stroke-linecap="round"/><path d="M56 94q7 5 14 1m21 0q7 4 14-1" fill="#f395a1" opacity=".5"/>${accessory}<rect x="5" y="5" width="150" height="150" rx="30" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="2"/></svg>`;
}

export const PROFILE_AVATARS: ProfileAvatar[] = portraits.map((portrait, index) => ({
  ...portrait,
  image: `data:image/svg+xml,${encodeURIComponent(portraitSvg(portrait, index))}`,
}));

export function getProfileAvatar(id: string | null | undefined): ProfileAvatar | undefined {
  return PROFILE_AVATARS.find((avatar) => avatar.id === id);
}
