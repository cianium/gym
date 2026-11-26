import {test, expect} from '@playwright/test';
const base='http://127.0.0.1:4173/gym/';
const viewports=[{width:320,height:700},{width:390,height:844},{width:768,height:1024},{width:1440,height:900}];
for(const viewport of viewports){
 test('FTA original pages '+viewport.width,async({page},info)=>{
  test.setTimeout(120000);
  await page.setViewportSize(viewport);
  const errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failed.push(r.status()+' '+r.url());});
  const snap=async name=>{await page.screenshot({path:info.outputPath(name+'.png'),animations:'disabled'});};
  const width=async label=>{
   const layout=await page.evaluate(()=>{
    const w=innerWidth, doc=document.documentElement;
    const outside=[...document.querySelectorAll('body *')].map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,150):'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scroll:e.scrollWidth,client:e.clientWidth}}).filter(e=>e.width>0&&(e.left< -2||e.right>w+2)).sort((a,b)=>b.width-a.width).slice(0,12);
    return {viewport:w,scroll:doc.scrollWidth,outside};
   });
   if(layout.scroll>layout.viewport+2) console.log('LAYOUT_DIAGNOSTIC '+label+' '+JSON.stringify(layout));
   expect.soft(layout.scroll,label+' document overflow').toBeLessThanOrEqual(layout.viewport+2);
  };
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
   await expect(page.locator('#root')).not.toBeEmpty();
   await expect(page.locator('#root').getByText(marker).first()).toBeVisible({timeout:20000});
   await snap(label);await width(label);
  }
  for(const [file,selector,label] of [
   ['athlete.html','#dashboard','08-athlete'],
   ['athlete-register.html','#request','09-register'],
   ['coach-athletes.html','#content','10-coach'],
   ['coach-schedule.html','#dashboard','11-schedule']
  ]){
   await page.goto(base+file);await expect(page.locator(selector)).toBeVisible({timeout:15000});await snap(label);await width(label);
  }
  // Exercise the cross-portal conversation and verify persistence.
  await page.goto(base+'athlete.html');
  const sample='QA synthetic message '+viewport.width;
  await page.locator('#messageBody').fill(sample);
  await page.locator('#messageForm button').click();
  await expect(page.locator('#privateMessages')).toContainText(sample);
  await page.reload();await expect(page.locator('#privateMessages')).toContainText(sample);
  await page.goto(base+'coach-schedule.html');
  await expect(page.locator('#messages')).toContainText(sample);
  await page.locator('#athleteId').selectOption('102');
  await expect(page.locator('#messages')).not.toContainText(sample);
  await page.locator('#athleteId').selectOption('101');
  await expect(page.locator('#messages')).toContainText(sample);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
 });
}
test('standalone demo registration and login ownership',async({page})=>{
 await page.goto(base+'athlete-register.html');
 await page.locator('#request button').click();
 await expect(page.locator('#register')).toBeVisible();
 await page.locator('#register input[name=name]').fill('QA synthetic athlete');
 await page.locator('#register input[name=code]').fill('123456');
 await page.locator('#register button').click();
 await expect(page).toHaveURL(/athlete\.html$/);
 await expect(page.locator('#welcome')).toContainText('QA synthetic athlete');
 const identifier=await page.locator('#demoIdentity').textContent();
 await page.locator('#logout').click();
 await expect(page.locator('#login')).toBeVisible();
 await page.locator('#login input[name=identifier]').fill(identifier.trim());
 await page.locator('#login button').click();
 await expect(page.locator('#welcome')).toContainText('QA synthetic athlete');
 await expect(page.locator('#plans')).toContainText('هنوز برنامه');
});
