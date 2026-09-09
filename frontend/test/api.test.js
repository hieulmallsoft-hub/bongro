import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('student updates target the API with encoded ID and JSON payload', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/students/HS001');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { name: 'Minh' });
    return new Response(JSON.stringify({ id: 'HS001' }), { status: 200 });
  };
  assert.deepEqual(await api.saveStudent('HS001', { name: 'Minh' }), { id: 'HS001' });
});

test('check-in sends only the student ID; server owns the attendance time', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/attendance/check-in');
    assert.deepEqual(JSON.parse(options.body), { studentId: 'HS001' });
    return new Response('{}', { status: 201 });
  };
  await api.check('HS001', false);
});

test('API validation and connection errors reach the UI as errors', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: ['Ngày không hợp lệ', 'Tên không hợp lệ'] }), { status: 400 });
  await assert.rejects(api.state(), /Ngày không hợp lệ · Tên không hợp lệ/);
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(api.state(), /Không kết nối được máy chủ/);
});
