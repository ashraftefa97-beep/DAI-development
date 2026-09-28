import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROFILE_AVATARS } from '../src/profileAvatars.ts';

test('account profile gallery ships sixteen original local image avatars', () => {
  assert.equal(PROFILE_AVATARS.length, 16);
  assert.equal(new Set(PROFILE_AVATARS.map(({ id }) => id)).size, 16);
  for (const avatar of PROFILE_AVATARS) {
    assert.match(avatar.image, /^data:image\/svg\+xml,/);
    assert.ok(avatar.name && avatar.style);
  }
  assert.ok(PROFILE_AVATARS.some(({ style }) => style === 'Cyber'));
  assert.ok(PROFILE_AVATARS.some(({ style }) => style === 'Cute'));
  assert.ok(PROFILE_AVATARS.some(({ style }) => style === 'Gamer'));
  assert.ok(PROFILE_AVATARS.some(({ style }) => style === 'Anime-inspired'));
});

test('account gallery does not switch or persist a DAI character style', () => {
  const app = readFileSync(new URL('../src/GithubApp.tsx', import.meta.url), 'utf8');
  assert.match(app, /localStorage\.setItem\(profileAvatarStorageKey\(\),avatar\.id\)/);
  assert.match(app, /avatarStyleRef\.current='classic'/);
  assert.match(app, /document\.documentElement\.dataset\.daiAvatar='classic'/);
});
