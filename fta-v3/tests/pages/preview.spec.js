import { test, expect } from '@playwright/test';

for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]) {
 test('FTA Pages '+viewport.width+'px',async({page})=>{
  await page.setViewportSize(viewport);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button',{name:/پنل مدیریت باشگاه/}).click();
  await expect(page).toHaveURL(/#admin\/dashboard$/);
  for(const id of ['members','coaches','plans','training','appointments','finance','store','content','settings','dashboard']){
   await page.locator('[data-page="'+id+'"]').click();
   await expect(page.locator('h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  }
  await page.locator('[data-page="members"]').click();
  await page.locator('#showAdd').click();
  await page.locator('#mName').fill('QA sample');
  await page.locator('#mPhone').fill('DEMO-QA');
  await page.locator('#addForm button').click();
  await page.locator('#memberSearch').fill('QA sample');
  await expect(page.locator('tbody tr:visible')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('tbody')).toContainText('QA sample');
  await page.locator('#exit').click();
  await page.getByRole('button',{name:/پنل ورزشکار/}).click();
  for(const id of ['profile','program','progress','appointments','messages','membership','dashboard']){
   await page.locator('[data-page="'+id+'"]').click();
   await expect(page.locator('h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  }
  await page.locator('[data-page="profile"]').click();
  await page.locator('#athName').fill('<img src=x onerror=alert(1)>');
  await page.locator('#profileForm button').click();
  await page.locator('[data-page="membership"]').click();
  await expect(page.locator('.member h3')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('.member img')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4173/#admin/finance');
  await expect(page.locator('h1')).toHaveText('مالی و گزارش‌ها');
  await expect(page.locator('.bars')).toBeVisible();
  page.once('dialog',d=>d.accept());
  await page.locator('#resetDemo').click();
  await expect(page.locator('[data-role="admin"]')).toBeVisible();
  expect(errors).toEqual([]);
 });
}
