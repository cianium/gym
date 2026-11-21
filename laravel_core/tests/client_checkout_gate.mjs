// Node-only auth gate regression. Does not send requests or touch user data.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const folder = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(folder, '../../public_html/assets/secure-checkout.js'), 'utf8');
const test = async (phone, expected) => {
  let calls = 0;
  const ctx = {
    window: {},
    fetch: async (url, options) => {
      calls++;
      assert.equal(url, '/api/v1/athlete/me');
      assert.equal(options.credentials, 'same-origin');
      return {ok:true, json:async()=>({athlete:{phone:'09121234567', phone_verified:true},csrfToken:'safe-csrf-test'})};
    },
    console,
  };
  vm.runInNewContext(source, ctx);
  try {
    const result = await ctx.window.FitnessCheckoutAuth.requireVerified(phone);
    assert.equal(expected, true);
    assert.equal(result.csrfToken, 'safe-csrf-test');
  } catch (error) {
    if (expected) throw error;
    assert.match(error.message, /شماره موبایل سفارش/);
  }
  assert.equal(calls, 1);
};
await test('09121234567', true);
await test('+989121234567', true);
await test('۰۹۱۲۱۲۳۴۵۶۷', true);
await test('09129999999', false);
console.log('OK: 4 client checkout auth/phone-matching checks passed');
