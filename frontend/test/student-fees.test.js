import {test} from 'node:test';
import assert from 'node:assert/strict';
import {feeSummary,filterEnrollments,receiptDocument} from '../src/student-fees.js';
test('student tuition summary includes all periods, excludes other students and distinguishes no fee',()=>{
 const s={id:'HS001'};
 assert.equal(feeSummary(s,[],'2026-09-09').status,'Chưa có học phí');
 const rows=[{student_id:'HS001',fee:100,paid:100,due:'2026-08-01'},{student_id:'HS001',fee:200,paid:50,due:'2026-09-01'},{student_id:'HS002',fee:999,paid:0,due:'2026-01-01'}];
 const r=feeSummary(s,rows,'2026-09-09');assert.equal(r.total,300);assert.equal(r.paid,150);assert.equal(r.owed,150);assert.equal(r.status,'Đóng một phần');assert.equal(r.overdue,true);
 assert.equal(feeSummary(s,[{student_id:s.id,fee:100,paid:100,due:'2026-01-01'}],'2026-09-09').status,'Đã đóng đủ');
});
test('tuition periods can be filtered by year and month',()=>{
 const rows=[
  {starts:'2026-01-01',ends:'2026-03-31'},
  {starts:'2026-09-01',ends:'2026-09-30'},
  {starts:'2025-09-01',ends:'2025-09-30'},
 ];
 assert.equal(filterEnrollments(rows,'2026','').length,2);
 assert.deepEqual(filterEnrollments(rows,'2026','09'),[rows[1]]);
 assert.equal(filterEnrollments(rows,'2025','09').length,1);
});
test('tuition receipt contains payment data and escapes untrusted content',()=>{
 const html=receiptDocument({id:'HS001',name:'An <script>',group:'U12'},{id:9,title:'Tháng 9',amount:500000,note:'Đã nhận <b>',paid_at:'2026-09-09T03:00:00.000Z'});
 assert.ok(html.includes('HP-9'));assert.ok(html.includes('500.000 đ'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
