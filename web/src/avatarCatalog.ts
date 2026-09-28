export const DAI_AVATAR_IDS = ['classic'] as const;

export type DaiAvatarStyle = typeof DAI_AVATAR_IDS[number];

export type DaiAvatarOption = {
  id:DaiAvatarStyle;
  label:string;
  desc:string;
  previewMark?:string;
  previewGlyph?:string;
};

export const DAI_AVATAR_OPTIONS: readonly DaiAvatarOption[] = [
  {id:'classic',label:'DAI Classic · الوجه الأساسي',desc:'وجه ضي الأصلي الأساسي بملامحه الكلاسيكية'}
];

export function isDaiAvatarStyle(value:unknown): value is DaiAvatarStyle {
  return value === 'classic';
}
