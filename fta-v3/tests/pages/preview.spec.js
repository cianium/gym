import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:4173/gym/';
for(const viewport of [{width:320,height:700},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}]){
 test('original FTA RC2 '+viewport.width+'px',async({page},info)=>{
  test.setTimeout(120000);
  await page.setViewportSize(viewport);
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failed.push(r.status()+' '+r.url());});
  const root=page.locator('#root');
  const screenshot=async(label)=>{await page.screenshot({path:info.outputPath(label+'.png'),animations:'disabled'});};
  const overflow=async()=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
  for(const [hash,marker,label] of [
   ['',/مربی نمونه FTA/,'01-home'],
   ['#/shop',/پروتکل ۱۲ هفته/,'02-shop'],
   ['#/product/prod-physical-straps',/ست بند لیفت چرم طبیعی/,'03-product'],
   ['#/explore',/اصلاح زاویه لگن/,'04-explore'],
   ['#/account',/مشتری نمونه FTA/,'05-account'],
   ['#/cart',/سبد خرید/,'06-cart'],
   ['#/admin',/مدیریت|پنل|Admin/,'07-admin']
  ]){
   await page.goto(base+'index.html'+hash);
   await expect(root).not.toBeEmpty();
   await expect(root.getByText(marker).first()).toBeVisible({timeout:15000});
   await overflow();await screenshot(label);
  }
  for(const [file,selector,label] of [
   ['athlete.html','#dashboard','08-athlete'],
   ['athlete-register.html','#request','09-register'],
   ['coach-athletes.html','#content','10-coach'],
   ['coach-schedule.html','#dashboard','11-schedule']
  ]){
   await page.goto(base+file);await expect(page.locator(selector)).toBeVisible({timeout:15000});await overflow();await screenshot(label);
  }
  await page.goto(base+'athlete.html');
  const message='QA synthetic sample';
  await page.locator('#messageBody').fill(message);
  await page.locator('#messageForm button').click();
  await expect(page.locator('#privateMessages')).toContainText(message);
  await page.reload();await expect(page.locator('#privateMessages')).toContainText(message);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
 });
}
