import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoute } from '../src/lib/routes.ts';
import { applicationMessage, recruitmentTags } from '../src/lib/communityApi.ts';

test('legacy notification links normalize to the same internal route in root and subpath deployments', () => {
  for (const base of ['', '/doai', '/doai/']) {
    assert.equal(normalizeRoute('/detail/recruit/post-id', base), 'detail/recruit/post-id');
    assert.equal(normalizeRoute('detail/recruit/post-id', base), 'detail/recruit/post-id');
  }
  assert.equal(normalizeRoute('/doai/detail/recruit/post-id', '/doai'), 'detail/recruit/post-id');
  assert.equal(normalizeRoute('/dashboard?tab=entries#top'), 'dashboard');
  assert.equal(normalizeRoute('/doaism/path', '/doai'), 'doaism/path');
  assert.equal(normalizeRoute('/doai/', '/doai'), 'home');
});
test('route normalization does not accept external URLs, traversal or malformed encoding', () => {
  for (const path of ['https://example.com/path', '//example.com/path', '/detail/../admin', '/detail/%2e%2e/admin', '/detail/%ZZ', String.raw`\\example.com/path`, '/detail/%5c%5cexample.com', '/detail/%2e%2e%2fadmin', '/detail/%00']) assert.equal(normalizeRoute(path), 'home');
});
test('application names and skills are preserved in the persisted introduction with bounded lengths', () => {
  assert.equal(applicationMessage({ name: '  阿青 ', skills: ' TypeScript ', message: '  我做过实时应用。 ' }), '称呼: 阿青\n相关技能: TypeScript\n我做过实时应用。');
  assert.equal(applicationMessage({ name: '', skills: '', message: ' A real introduction ' }, true), 'A real introduction');
  assert.throws(() => applicationMessage({ name: '', skills: '', message: '  ' }));
  assert.throws(() => applicationMessage({ name: '', skills: '', message: 'a'.repeat(501) }));
});
test('publishing tags trim and deduplicate while matching server limits', () => {
  assert.deepEqual(recruitmentTags(' React、 TypeScript,React； Rust '), ['React', 'TypeScript', 'Rust']);
  assert.throws(() => recruitmentTags(Array.from({ length: 21 }, (_, i) => `tag-${i}`).join(',')));
  assert.throws(() => recruitmentTags('a'.repeat(65)));
});
