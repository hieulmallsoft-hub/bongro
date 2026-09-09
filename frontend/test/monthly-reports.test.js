import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printDocument } from '../src/monthly-reports.js';
test('print report escapes names and comments and contains monthly attendance', () => {
  const html = printDocument({student:{id:'HS001',name:'Nguyễn An',group:'U12'},month:'2026-09',attendance:[{}]}, {coach:'HLV Minh',strengths:'<script>alert(1)</script>',improvements:'Ném rổ',goals:'Tập đều'});
  assert.ok(html.includes('Nguyễn An'));
  assert.ok(html.includes('1 buổi đã tham gia'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
