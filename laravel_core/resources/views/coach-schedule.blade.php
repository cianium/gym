<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>جلسات مشاوره و پیام‌ها | ARASH Fitness</title>
<meta name="robots" content="noindex,nofollow">
<style>
:root{color-scheme:dark;--bg:#0b1323;--panel:#162238;--border:#35445e;--text:#e8effb;--accent:#6ee7b7}
*{box-sizing:border-box}body{margin:0;color:var(--text);background:radial-gradient(circle at 95% -10%,#194539,transparent 45%),var(--bg);font:15px Tahoma,Arial,sans-serif;line-height:1.8}
main{max-width:1120px;margin:35px auto;padding:0 18px 50px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
h1{margin:12px 0 4px;font-size:27px}p{color:#cbd5e1}a{color:var(--accent)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px}
section{background:var(--panel);border:1px solid var(--border);padding:21px;border-radius:18px;margin:16px 0}
label{display:block;margin:9px 0}input,select,textarea{font:inherit;width:100%;display:block;background:#0c1729;color:var(--text);border:1px solid #60708c;border-radius:10px;padding:10px;margin-top:4px}
textarea{min-height:75px}button{font:inherit;background:var(--accent);color:#063b2c;border:0;border-radius:9px;padding:10px 14px;cursor:pointer;font-weight:700;margin:4px 4px 4px 0}
button.alt{background:#40536d;color:#fff}button.danger{background:#fecaca;color:#7f1d1d}button:disabled{opacity:.5;cursor:not-allowed}
.item{background:#0c1729;border:1px solid var(--border);border-radius:11px;padding:12px;margin:9px 0;word-break:break-word}
.muted{font-size:13px;color:#b0bed2}.pill{font-size:12px;background:#244a44;padding:3px 8px;border-radius:14px}#status{min-height:22px;color:#fcd34d}
[hidden]{display:none!important}h2{font-size:18px;margin:0 0 12px}.messages{max-height:380px;overflow:auto}.bubble{padding:10px;border-radius:10px;margin:7px 0;background:#23354d}.bubble.coach{border-right:3px solid var(--accent)}
</style>
</head>
<body><main>
<header><div><h1>مدیریت جلسات مشاوره</h1><p>زمان‌های آزاد، درخواست‌های ورزشکاران و پیام‌های خصوصی</p></div><nav><a href="/admin">پنل اصلی</a> · <a href="/coach/athletes">برنامه‌های تمرینی</a></nav></header>
<p id="status" role="status" aria-live="polite">بررسی دسترسی مدیر...</p>
<section id="needAuth" hidden><h2>ورود مدیریت لازم است</h2><p>برای دیدن اطلاعات خصوصی ابتدا وارد پنل شوید.</p><a href="/admin">ورود به پنل</a></section>
<div id="dashboard" hidden>
<div class="grid">
<section><h2>افزودن زمان مشاوره</h2><p class="muted">زمان بر اساس ساعت دستگاه شما وارد می‌شود. جلسات باید ۱۵ تا ۱۸۰ دقیقه باشند.</p>
<form id="newSlot"><label>شروع جلسه<input type="datetime-local" name="start" required></label><label>پایان جلسه<input type="datetime-local" name="end" required></label><button>ثبت زمان آزاد</button></form>
<h2>زمان‌های تعریف‌شده</h2><div id="slots"></div></section>
<section><h2>درخواست‌های مشاوره</h2><div id="bookings"></div></section>
</div>
<section><h2>درخواست‌های مشاوره از سایت</h2><p class="muted">این درخواست‌ها پیش از ثبت‌نام ورزشکار دریافت شده‌اند و با رزرو قطعی تفاوت دارند.</p><div id="leads"></div></section><section><h2>گفت‌وگوی خصوصی مربی و ورزشکار</h2><label>انتخاب ورزشکار<select id="athleteId" aria-label="ورزشکار برای پیام‌رسانی"></select></label>
<button type="button" class="alt" id="loadMessages">نمایش پیام‌ها</button><div id="messages" class="messages" aria-live="polite"></div>
<form id="sendMessage"><label>پیام<textarea id="messageText" maxlength="2000" required placeholder="پاسخ خود را برای ورزشکار بنویسید..."></textarea></label><button>ارسال پیام خصوصی</button></form></section>
<section><h2>وضعیت اعلان‌های پیامکی</h2><p class="muted">موارد «نامشخص» باید از پنل سرویس‌دهنده بررسی شوند؛ ارسال دوباره خودکار انجام نمی‌شود.</p><div id="smsJobs"></div></section>
<button type="button" class="alt" id="reload">تازه‌سازی اطلاعات</button>
</div>
</main>
<script>
'use strict';let csrf='';const $=id=>document.getElementById(id);const el=(tag,txt)=>{const n=document.createElement(tag);n.textContent=String(txt??'');return n};
const state=(txt)=>{$('status').textContent=txt};
const date=t=>t?new Date(t).toLocaleString('fa-IR',{dateStyle:'medium',timeStyle:'short'}):'—';
async function api(path,method='GET',body){const r=await fetch('/api/v1/'+path,{method,credentials:'same-origin',headers:{Accept:'application/json','Content-Type':'application/json',...(csrf?{'X-CSRF-Token':csrf}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||d.message||'خطای سرور: '+r.status);return d}
function button(label,fn,type='alt'){const b=el('button',label);b.type='button';b.className=type;b.onclick=async()=>{b.disabled=true;try{await fn();state('عملیات انجام شد')}catch(e){state(e.message)}finally{b.disabled=false}};return b}
async function loadSlots(){const r=await api('admin/consultation-slots');const host=$('slots');host.replaceChildren();for(const s of r.slots){const box=el('div');box.className='item';box.append(el('div',date(s.starts_at)+' تا '+date(s.ends_at)));box.append(el('small',s.is_active?(s.active_booking?'رزروشده':'آزاد'):'غیرفعال'));if(s.is_active&&!s.active_booking)box.append(button('غیرفعال‌کردن',async()=>{await api('admin/consultation-slots/'+s.id+'/disable','POST');await loadSlots()}));host.append(box)}if(!r.slots.length)host.append(el('p','هنوز زمانی ثبت نشده است'))}
async function loadBookings(){const r=await api('admin/consultation-bookings');const host=$('bookings');host.replaceChildren();for(const b of r.bookings){const box=el('div');box.className='item';box.append(el('strong',(b.athlete?.name||'ورزشکار')+' · '+date(b.slot?.starts_at)));box.append(el('div','وضعیت: '+b.status));box.append(el('p','شماره تماس: '+(b.athlete?.phone||'—')));if(b.athlete_note)box.append(el('p','درخواست ورزشکار: '+b.athlete_note));if(b.status==='requested')box.append(button('تأیید',async()=>{await changeStatus(b.id,'confirmed')}));if(b.status==='confirmed')box.append(button('انجام شد',async()=>{await changeStatus(b.id,'completed')}));if(['requested','confirmed'].includes(b.status))box.append(button('لغو جلسه',async()=>{if(!confirm('این رزرو لغو شود؟'))return;await changeStatus(b.id,'cancelled')},'danger'));host.append(box)}if(!r.bookings.length)host.append(el('p','هنوز درخواستی ثبت نشده است'))}
async function changeStatus(id,status){await api('admin/consultation-bookings/'+id+'/status','POST',{status});await Promise.all([loadBookings(),loadSlots()])}
async function loadLeads(){const r=await api('admin/consultation-leads');const host=$('leads');host.replaceChildren();for(const lead of r.leads){const box=el('div');box.className='item';box.append(el('strong',lead.sender_name+' · '+lead.sender_phone));box.append(el('div',lead.goal_topic+' · وضعیت '+lead.status));if(lead.message)box.append(el('p',lead.message));if(lead.coach_notes)box.append(el('p','یادداشت مربی: '+lead.coach_notes));if(lead.status==='new')box.append(button('پیگیری شد',async()=>{await api('admin/consultation-leads/'+encodeURIComponent(lead.id)+'/status','POST',{status:'contacted'});await loadLeads()}));if(lead.status!=='closed')box.append(button('بستن درخواست',async()=>{await api('admin/consultation-leads/'+encodeURIComponent(lead.id)+'/status','POST',{status:'closed'});await loadLeads()}));host.append(box)}if(!r.leads.length)host.append(el('p','درخواست جدیدی ثبت نشده است'))}
async function loadSms(){const r=await api('admin/consultation-sms-status');const box=$('smsJobs');box.replaceChildren();box.append(el('p','پیامک‌های با نتیجه نامشخص: '+r.unknown_count));for(const job of r.recent){const n=el('div','رزرو '+job.booking_id+' · '+(job.recipient_kind==='athlete'?'ورزشکار':'مربی')+' · '+job.state+(job.last_error_code?' · '+job.last_error_code:''));n.className='item';box.append(n)}}
async function loadAthletes(){const r=await api('admin/athletes');const select=$('athleteId');const old=select.value;select.replaceChildren(...(r.athletes||[]).map(a=>{const o=el('option',a.name+' · '+a.phone);o.value=a.id;return o}));if(old)select.value=old;await loadMessages()}
async function loadMessages(){const id=$('athleteId').value;const host=$('messages');host.replaceChildren();if(!id)return;const r=await api('admin/athletes/'+encodeURIComponent(id)+'/messages');for(const m of r.messages){const box=el('div');box.className='bubble'+(String(m.sender_id)!==String(id)?' coach':'');box.append(el('small',(String(m.sender_id)===String(id)?'ورزشکار':'مربی')+' · '+date(m.created_at)));box.append(el('div',m.body));host.append(box)}if(!r.messages.length)host.append(el('p','هنوز پیامی ردوبدل نشده است.'));await api('admin/athletes/'+encodeURIComponent(id)+'/messages/read','POST')}
$('newSlot').onsubmit=async(e)=>{e.preventDefault();const f=e.target;try{await api('admin/consultation-slots','POST',{starts_at:new Date(f.elements.start.value).toISOString(),ends_at:new Date(f.elements.end.value).toISOString()});f.reset();await loadSlots();state('زمان جدید ثبت شد')}catch(err){state(err.message)}};
$('sendMessage').onsubmit=async(e)=>{e.preventDefault();const id=$('athleteId').value;if(!id){state('ورزشکار انتخاب نشده است');return}try{await api('admin/athletes/'+encodeURIComponent(id)+'/messages','POST',{body:$('messageText').value});$('messageText').value='';await loadMessages();state('پیام ارسال شد')}catch(err){state(err.message)}};
$('loadMessages').onclick=()=>loadMessages().catch(e=>state(e.message));$('reload').onclick=()=>Promise.all([loadSlots(),loadBookings(),loadAthletes(),loadSms(),loadLeads()]).then(()=>state('اطلاعات تازه شد')).catch(e=>state(e.message));
(async()=>{try{const s=await api('auth/session');if(!s.authenticated){$('needAuth').hidden=false;state('برای مشاهده اطلاعات ورود لازم است');return}csrf=s.csrfToken;await Promise.all([loadSlots(),loadBookings(),loadAthletes(),loadSms(),loadLeads()]);$('dashboard').hidden=false;state('آماده مدیریت جلسات')}catch(e){state(e.message);$('needAuth').hidden=false}})();
</script></body></html>
