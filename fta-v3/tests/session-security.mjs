import assert from 'node:assert/strict';
const base='http://127.0.0.1:4000/api/v1/';
const pw='Synthetic-New-Pass-456!';
let checks=0;
async function req(path,status,token,body){
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const text=await r.text();assert.equal(r.status,status,path+' '+text.slice(0,180));checks++;return JSON.parse(text);
}
async function login(email){return (await req('athlete/login',200,null,{identifier:email,password:pw})).accessToken;}
const one=await login('athlete1@example.test'),two=await login('athlete1@example.test'),other=await login('athlete2@example.test');
await req('auth/sessions',401);
const list=(await req('auth/sessions',200,one)).sessions;
assert.equal(list.filter(s=>s.current).length,1);assert.ok(list.length>=2);
assert.ok(list.every(s=>Object.keys(s).sort().join(',')==='createdAt,current,expiresAt,id'));
assert.ok(list.every(s=>s.id!==one&&s.id!==two));
await req('auth/password',422,one,{currentPassword:'Wrong-Synthetic-Pass!',newPassword:'Another-Synthetic-Pass!'});
await req('auth/me',200,one);
const result=await req('auth/sessions/revoke-others',200,one,{});
assert.ok(result.revoked>=1);
await req('auth/me',401,two);
await req('auth/me',200,other);
assert.equal((await req('auth/sessions',200,one)).sessions.length,1);
await req('auth/logout',200,one,{});await req('auth/logout',200,other,{});
console.log('FTA session security: '+checks+' HTTP checks + domain assertions passed');
