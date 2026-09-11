import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printDocument } from '../src/monthly-reports.js';
test('print report escapes names and comments and contains monthly attendance', () => {
  const html = printDocument({student:{id:'HS001',name:'Nguyễn An',group:'U12'},month:'2026-09',attendance:[{}],attendanceSummary:{present:1,late:1,excused:2,absent:1}}, {coach:'HLV Minh',strengths:'<script>alert(1)</script>',improvements:'Ném rổ',goals:'Tập đều'});
  assert.ok(html.includes('Nguyễn An'));
  assert.ok(html.includes('Có mặt 1, đi muộn 1, nghỉ phép 2, nghỉ không phép 1'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});
