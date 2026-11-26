/* ARASH 2.3.2 — verified purchase gate for the retained compiled storefront.
 * Server authorization is authoritative. This UI is strictly a convenience.
 * Avoid persisting credentials, OTPs, or CSRF tokens in localStorage.
 */
(() => {
  'use strict';
  const api = async (path, method = 'GET', data = null, csrf = '') => {
    const response = await fetch(`/api/v1/athlete/${path}`, {
      method, credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        ...(data !== null ? {'Content-Type': 'application/json'} : {}),
        ...(csrf ? {'X-CSRF-Token': csrf} : {})
      },
      ...(data !== null ? {body: JSON.stringify(data)} : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || result.message || 'ارتباط با سرور ناموفق بود.');
      error.code = result.code || '';
      error.status = response.status;
      throw error;
    }
    return result;
  };
  const getMe = async () => {
    try { return await api('me'); }
    catch (error) {
      if (error.status === 401) return null;
      throw error;
    }
  };
  const normalizePhone = input => {
    const persian = '۰۱۲۳۴۵۶۷۸۹', arabic = '٠١٢٣٤٥٦٧٨٩';
    const digits = String(input || '').replace(/[۰-۹٠-٩]/g, c => {
      const pi = persian.indexOf(c);
      return String(pi >= 0 ? pi : arabic.indexOf(c));
    }).replace(/\D/g, '');
    if (digits.startsWith('0098')) return '0' + digits.slice(4);
    if (digits.startsWith('98')) return '0' + digits.slice(2);
    return digits;
  };

  const modal = ({ title, content, setup }) => new Promise((resolve, reject) => {
    const previous = document.activeElement;
    const cover = document.createElement('div');
    cover.className = 'arash-verify-backdrop';
    cover.innerHTML = `<div class="arash-verify-dialog" role="dialog" aria-modal="true" aria-labelledby="arash-verify-title">
      <div class="arash-verify-heading"><h2 id="arash-verify-title"></h2><button type="button" class="arash-verify-close" aria-label="بستن">×</button></div>
      <p class="arash-verify-intro"></p><div class="arash-verify-content"></div>
      <p class="arash-verify-error" role="alert" aria-live="assertive"></p>
      <button type="button" class="arash-verify-cancel">انصراف و بازگشت به سبد خرید</button></div>`;
    cover.querySelector('h2').textContent = title;
    cover.querySelector('.arash-verify-intro').textContent = content;
    const host = cover.querySelector('.arash-verify-content');
    const errorBox = cover.querySelector('.arash-verify-error');
    let done = false;
    const finish = (value, error = null) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', keydown, true);
      cover.remove();
      document.body.classList.remove('arash-verify-open');
      previous?.focus?.();
      if (error) reject(error); else resolve(value);
    };
    const cancel = () => finish(null, new Error('فرایند احراز هویت خرید لغو شد.'));
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); cancel(); }
      if (event.key === 'Tab') {
        const targets = [...cover.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href]')]
          .filter(el => el.getClientRects().length);
        if (!targets.length) return;
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    cover.querySelector('.arash-verify-close').addEventListener('click', cancel);
    cover.querySelector('.arash-verify-cancel').addEventListener('click', cancel);
    document.body.appendChild(cover);
    document.body.classList.add('arash-verify-open');
    document.addEventListener('keydown', keydown, true);
    cover.querySelector('.arash-verify-close').focus();
    const showError = message => { errorBox.textContent = message || ''; };
    try { setup({host, showError, finish}); } catch (e) { finish(null, e); }
  });

  const loginOrRegister = initialPhone => modal({
    title: 'ورود یا ثبت‌نام برای خرید امن',
    content: 'پرداخت فقط با حساب ورزشکار و شماره موبایل تأییدشده انجام می‌شود.',
    setup({host, showError, finish}) {
      host.innerHTML = `<div class="arash-verify-tabs"><button type="button" data-tab="login" aria-pressed="true">ورود</button><button type="button" data-tab="register" aria-pressed="false">ثبت‌نام جدید</button></div>
      <form id="arash-login-form"><label>موبایل یا ایمیل<input name="identifier" autocomplete="username" required></label>
        <label>رمز عبور<input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit" class="arash-verify-primary">ورود و ادامه خرید</button></form>
      <form id="arash-register-form" hidden>
        <label>شماره موبایل<input name="phone" autocomplete="tel" inputmode="tel" required></label>
        <button type="button" id="arash-request-otp">ارسال کد پیامکی</button>
        <label>نام و نام خانوادگی<input name="name" autocomplete="name" required maxlength="120"></label>
        <label>کد شش‌رقمی<input name="code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required></label>
        <label>رمز عبور جدید<input name="password" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label>
        <label>تکرار رمز عبور<input name="password_confirmation" type="password" minlength="10" maxlength="128" autocomplete="new-password" required></label>
        <button type="submit" class="arash-verify-primary">ایجاد حساب و ادامه خرید</button>
      </form>`;
      const login = host.querySelector('#arash-login-form');
      const register = host.querySelector('#arash-register-form');
      login.elements.identifier.value = initialPhone || '';
      register.elements.phone.value = initialPhone || '';
      host.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
        const isRegister = button.dataset.tab === 'register';
        login.hidden = isRegister; register.hidden = !isRegister;
        host.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
        showError('');
      }));
      const send = async (event, action) => {
        const button = event.currentTarget.querySelector('button[type="submit"]') || event.currentTarget;
        button.disabled = true; showError('');
        try { await action(); } catch (err) { showError(err.message); }
        finally { button.disabled = false; }
      };
      login.addEventListener('submit', event => {
        event.preventDefault();
        send(event, async () => {
          await api('login', 'POST', Object.fromEntries(new FormData(login)));
          finish(true);
        });
      });
      host.querySelector('#arash-request-otp').addEventListener('click', event => {
        send(event, async () => {
          const phone = normalizePhone(register.elements.phone.value);
          if (!/^09[0-9]{9}$/.test(phone)) throw Error('شماره موبایل معتبر وارد کنید.');
          await api('otp/request', 'POST', {phone});
          showError('کد ارسال شد؛ اگر شماره قبلاً ثبت شده است، از بخش ورود استفاده کنید.');
        });
      });
      register.addEventListener('submit', event => {
        event.preventDefault();
        send(event, async () => {
          const data = Object.fromEntries(new FormData(register));
          data.phone = normalizePhone(data.phone);
          await api('register', 'POST', data);
          finish(true);
        });
      });
    }
  });

  const verifyPhone = me => modal({
    title: 'تأیید موبایل حساب ورزشکار',
    content: `برای تکمیل خرید، شماره ${me.athlete.phone} باید با کد پیامکی تأیید شود.`,
    setup({host, showError, finish}) {
      host.innerHTML = `<button type="button" id="arash-send-verify">ارسال کد تأیید به شماره حساب</button>
        <form id="arash-verify-form"><label>کد شش‌رقمی<input name="code" autocomplete="one-time-code" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required></label>
        <button type="submit" class="arash-verify-primary">تأیید و ادامه خرید</button></form>`;
      const otp = host.querySelector('#arash-send-verify');
      otp.onclick = async () => {
        otp.disabled = true; showError('');
        try {
          await api('phone/otp/request', 'POST', {}, me.csrfToken);
          showError('کد درخواست شد؛ پیامک را بررسی کنید.');
        } catch (err) { showError(err.message); }
        finally { otp.disabled = false; }
      };
      host.querySelector('#arash-verify-form').onsubmit = async event => {
        event.preventDefault();
        const button = event.currentTarget.querySelector('button');
        button.disabled = true; showError('');
        try {
          await api('phone/verify', 'POST', {code: event.currentTarget.elements.code.value}, me.csrfToken);
          finish(true);
        } catch (err) { showError(err.message); }
        finally { button.disabled = false; }
      };
    }
  });

  let active = null;
  const verify = async customerPhone => {
    let me = await getMe();
    if (!me) {
      await loginOrRegister(customerPhone);
      me = await getMe();
    }
    if (!me?.athlete || !me.csrfToken) throw Error('ورود معتبر نشد. لطفاً دوباره تلاش کنید.');
    if (!me.athlete.phone_verified) {
      await verifyPhone(me);
      me = await getMe();
    }
    if (!me?.athlete?.phone_verified || !me.csrfToken) throw Error('شماره موبایل حساب هنوز تأیید نشده است.');
    if (normalizePhone(me.athlete.phone) !== normalizePhone(customerPhone)) {
      throw Error(`شماره موبایل سفارش باید با شماره تأییدشده حساب (${me.athlete.phone}) یکسان باشد. لطفاً شماره فرم خرید را اصلاح کنید.`);
    }
    return {csrfToken: me.csrfToken};
  };
  window.FitnessCheckoutAuth = Object.freeze({
    requireVerified(phone) {
      if (!active) active = verify(phone).finally(() => {active = null;});
      return active;
    }
  });
})();
