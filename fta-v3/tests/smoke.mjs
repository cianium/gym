import assert from 'node:assert/strict';
const base=process.env.FTA_API_URL ?? 'http://127.0.0.1:4000';
async function get(path){const r=await fetch(base+'/api/v1/'+path,{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200,path);return r.json();}
const h=await get('health');assert.equal(h.mode,'demo');assert.equal(h.status,'ok');
const [o,m,c,p,a,s,athlete]=await Promise.all(['overview','members','coaches','plans','appointments','products','athlete'].map(x=>get('demo/'+x)));
assert.equal(o.athletes,m.length);assert.equal(o.coaches,c.length);assert.equal(o.activePlans,p.filter(x=>x.status==='active').length);assert.equal(o.appointments,a.filter(x=>x.status==='scheduled').length);
assert.equal(m.length,3);assert.equal(c.length,2);assert.equal(s.length,2);assert.equal(athlete.name,m.find(x=>x.id==='m1').name);assert.equal(athlete.plans.length,1);
assert.ok(m.every(x=>Object.keys(x).sort().join(',')==='coach,id,name,status'));assert.ok(!JSON.stringify(athlete).includes('m2'));
for(const path of ['demo/members','checkout','athlete/login','payments/callback/mock','admin/backup/export']){
 const r=await fetch(base+'/api/v1/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,404,path);
}
console.log('FTA API demo smoke passed');
