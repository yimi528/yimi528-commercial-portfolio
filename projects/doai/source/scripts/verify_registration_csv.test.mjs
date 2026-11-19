import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationCSV, registrationMaterials, registrationContact, registrationApplicant } from '../src/lib/registrationApi.ts';
import { encodeEntrySummary, readEntrySummary, registrationTrack } from '../src/lib/contestEntry.ts';

const registration = {
  makerId: 'M-1', projectName: '=SUM(1,2)', teamName: 'A,"B"\nC', track: 'industry', status: 'needs_info',
  projectSummary: encodeEntrySummary('b-prop-fs', '真实摘要'), submittedAt: '2026-10-26',
  videoUrl: 'https://old.example/video', docUrl: 'https://docs.example/project',
  submission: { videoUrl: 'https://video.example/latest', demoUrl: 'https://demo.example/latest', githubUrl: 'https://github.com/owner/latest' },
};
test('review and CSV materials use persisted work links with legacy fallback', () => {
  assert.deepEqual(registrationMaterials(registration), {
    ...registration.submission, docUrl: registration.docUrl,
  });
  assert.equal(registrationMaterials({ ...registration, submission: undefined }).videoUrl, registration.videoUrl);
  const csv = registrationCSV([registration]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('FDE-01'));
  for (const link of Object.values(registration.submission)) assert.ok(csv.includes(link));
  assert.ok(!csv.includes(registration.videoUrl));
  assert.ok(csv.includes('"GitHub 仓库"'));
});
test('CSV quotes multiline values and keeps participant formulas as literal text', () => {
  const csv = registrationCSV([registration, { ...registration, projectName: '  +1' }]);
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes('"A,""B""\nC"'));
  assert.ok(csv.includes('"\'  +1"'));
});

test('latest project document and private email/bio survive export, while optional materials can be cleared', () => {
  const current = { ...registration, ownerUserId: 'owner', applicant: { userId: 'owner', name: 'Owner', city: '上海', skills: [], email: 'owner@example.com', bio: 'AI developer\nProduct maker' }, submission: { videoUrl: 'https://video.example/demo', demoUrl: '', githubUrl: '', docUrl: 'https://team.feishu.cn/docx/project' } };
  assert.equal(registrationMaterials(current).docUrl, current.submission.docUrl);
  const csv = registrationCSV([current]);
  for (const text of [current.applicant.email, current.applicant.bio, current.submission.docUrl, '申报邮箱', '个人简介']) assert.ok(csv.includes(text));
  assert.equal(registrationMaterials({ ...current, submission: { ...current.submission, docUrl: '' } }).docUrl, '');
  assert.equal(registrationApplicant({ ...current, applicant: { ...current.applicant, email: 'invalid' } }), null);
});

test('private contact and CSV use the actual leader and captured account phone over a client member number', () => {
  const current = { ...registration, ownerUserId: 'owner', members: [{ name: 'Peer', phone: '17777777777', isLeader: false }, { name: 'Leader', phone: '19999999999', isLeader: true }], accountContact: { userId: 'owner', phone: '13800000000', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } };
  assert.deepEqual(registrationContact(current), { name: 'Leader', phone: '13800000000', source: 'account' });
  const csv = registrationCSV([current]);
  assert.ok(csv.includes('"联系手机号"')); assert.ok(csv.includes('"13800000000","账号绑定"'));
  assert.ok(!csv.includes('19999999999')); assert.ok(!csv.includes('17777777777'));
  assert.deepEqual(registrationContact({ ...current, accountContact: undefined }), { name: 'Leader', phone: '19999999999', source: 'entry' });
  assert.ok(registrationCSV([{ ...current, accountContact: undefined }]).includes('申报填写（历史记录）'));
});

test('an absent account phone stays absent and malformed account contact cannot fall back to a forged member phone', () => {
  const current = { ...registration, ownerUserId: 'owner', members: [{ name: 'Leader', phone: '19999999999', isLeader: true }], accountContact: { userId: 'owner', phone: '', source: 'account', capturedAt: '2026-10-27T00:00:00Z' } };
  assert.deepEqual(registrationContact(current), { name: 'Leader', phone: '', source: 'account' });
  for (const accountContact of [null, { ...current.accountContact, userId: 'other' }, { ...current.accountContact, capturedAt: 'invalid' }, { ...current.accountContact, phone: '138****0000' }]) {
    assert.deepEqual(registrationContact({ ...current, accountContact }), { name: 'Leader', phone: '', source: 'unconfirmed' });
    assert.ok(!registrationCSV([{ ...current, accountContact }]).includes('19999999999'));
  }
});

test('applicant snapshot exports the submitted city and skills without inventing legacy or mismatched data', () => {
  const current = { ...registration, ownerUserId: 'owner', applicant: { userId: 'owner', name: 'Owner', city: '成都', skills: ['React', 'SQL'] } };
  assert.deepEqual(registrationApplicant(current), current.applicant);
  const csv = registrationCSV([current]); assert.ok(csv.includes('"申报城市","申报技能"')); assert.ok(csv.includes('"成都","React、SQL"'));
  for (const applicant of [undefined, null, { ...current.applicant, userId: 'other' }, { ...current.applicant, skills: [null] }, { ...current.applicant, skills: ['React', 'React'] }]) {
    assert.equal(registrationApplicant({ ...current, applicant }), null);
    assert.ok(!registrationCSV([{ ...current, applicant }]).includes('"成都","React、SQL"'));
  }
});


test('overseas country and university round-trip, distinguish the track and export as safe text', () => {
  const overseas = { countryOrRegion: ' 香港 ', university: '香港大学 "HKU"' };
  const summary = encodeEntrySummary('ai-app', '真实项目摘要', overseas);
  const saved = { ...registration, track: 'creator', projectSummary: summary };
  assert.deepEqual(readEntrySummary(summary), { entry: 'AI App · AI 应用赛道', summary: '真实项目摘要', overseas: { ...overseas, countryOrRegion: '香港' } });
  assert.equal(registrationTrack(saved), 'overseas');
  assert.equal(registrationTrack({ ...saved, projectSummary: encodeEntrySummary('ai-app', '普通报名') }), 'creator');
  const csv = registrationCSV([saved]);
  for (const value of ['"overseas"', '"海外国家／地区"', '"所属高校"', '"香港"', '"香港大学 ""HKU"""']) assert.ok(csv.includes(value), value);
  const malicious = { ...saved, projectSummary: encodeEntrySummary('ai-infra', '摘要', { countryOrRegion: 'UK', university: '=FORMULA()' }) };
  assert.ok(registrationCSV([malicious]).includes("'="));
  for (const invalid of [{ countryOrRegion: '', university: 'Oxford' }, { countryOrRegion: 'UK', university: ' ' }, { countryOrRegion: 'x'.repeat(101), university: 'Oxford' }, { countryOrRegion: 'UK', university: 'x'.repeat(201) }, { countryOrRegion: 'UK\nUS', university: 'Oxford' }]) assert.throws(() => encodeEntrySummary('ai-app', '摘要', invalid), /海外/);
  assert.throws(() => encodeEntrySummary('b-prop-fs', '摘要', overseas), /海外/);
  const malformed = '【申报方向：AI App】\n【海外报名：{invalid}】\nOriginal summary';
  assert.equal(readEntrySummary(malformed).overseas, undefined);
  assert.ok(readEntrySummary(malformed).summary.includes('{invalid}'));
});
