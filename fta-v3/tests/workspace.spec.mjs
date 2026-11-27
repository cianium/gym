import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:3000';
const pass='Synthetic-New-Pass-456!';
test('secure workspace BFF and real PostgreSQL portals',async({browser})=>{
 test.setTimeout(120000);
 const coach=await browser.newContext({viewport:{width:390,height:844}}),athlete=await browser.newContext({viewport:{width:320,height:720}});
 const c=await coach.newPage(),a=await athlete.newPage();
 const errors=[];for(const p of [c,a])p.on('pageerror',e=>errors.push(e.message));
 async function login(p,role,id){
  await p.goto(base+'/workspace');
  await p.getByLabel('نوع حساب').selectOption(role);
  await p.getByLabel('شناسه').fill(id);await p.getByLabel('رمز عبور').fill(pass);
  const pending=p.waitForResponse(r=>r.url().endsWith('/login')&&r.request().method()==='POST');
  await p.getByRole('button',{name:'ورود',exact:true}).click();
  const r=await pending;expect(r.status()).toBe(200);expect(await r.json()).not.toHaveProperty('accessToken');
  await expect(p.getByRole('button',{name:'خروج',exact:true})).toBeVisible();
 }
 await login(c,'admin','owner@example.test');
 const cookies=await coach.cookies();const cookie=cookies.find(x=>x.name==='fta_workspace_session');expect(cookie?.httpOnly).toBeTruthy();expect(cookie?.sameSite).toBe('Strict');
 expect(await c.evaluate(()=>document.cookie)).not.toContain('fta_workspace_session');
 const forbidden=await coach.request.post(base+'/api/workspace/auth/logout',{headers:{Origin:'https://example.test'},data:{}});expect(forbidden.status()).toBe(403);
 const unknown=await coach.request.get(base+'/api/workspace/checkout');expect(unknown.status()).toBe(404);
 await login(a,'athlete','athlete1@example.test');
 await expect(a.getByText('Strength',{exact:true})).toBeVisible();
 await a.getByRole('button',{name:'پیام‌ها',exact:true}).click();await a.getByLabel('متن پیام').fill('Browser QA private message');await a.getByRole('button',{name:'ارسال پیام',exact:true}).click();await expect(a.getByText('Browser QA private message',{exact:true})).toBeVisible();
 await c.getByRole('button',{name:'پیام‌ها',exact:true}).click();await c.getByRole('button',{name:'بازخوانی'}).click();await c.getByLabel('انتخاب ورزشکار').selectOption({label:'Athlete 1'});await expect(c.getByText('Browser QA private message',{exact:true})).toBeVisible();
 await c.getByLabel('متن پیام').fill('Browser QA coach reply');await c.getByRole('button',{name:'ارسال پیام',exact:true}).click();await expect(c.getByText('Browser QA coach reply',{exact:true})).toBeVisible();
 await a.getByRole('button',{name:'بازخوانی'}).click();await expect(a.getByText('Browser QA coach reply',{exact:true})).toBeVisible();
 await c.getByLabel('انتخاب ورزشکار').selectOption({label:'Athlete 2'});await expect(c.getByText('Synthetic B private message',{exact:true})).toBeVisible();await expect(c.getByText('Browser QA private message',{exact:true})).toHaveCount(0);
 for(const p of [c,a])expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();
 await a.reload();await expect(a.getByRole('button',{name:'خروج',exact:true})).toBeVisible();
 await a.getByRole('button',{name:'خروج',exact:true}).click();await expect(a.getByLabel('شناسه')).toBeVisible();expect((await athlete.request.get(base+'/api/workspace/athlete/plans')).status()).toBe(401);
 expect(errors).toEqual([]);await coach.close();await athlete.close();
});
