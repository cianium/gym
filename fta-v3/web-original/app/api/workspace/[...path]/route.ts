import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const cookie='fta_workspace_session';
const id='[a-f0-9-]{36}';
const rules:Record<string,RegExp[]>={GET:[/^auth\/(me|sessions)$/,/^athlete\/(me|plans|progress|messages|consultations\/(slots|bookings))$/,/^admin\/(athletes|training-plans|consultation-slots|consultation-bookings)$/,new RegExp('^admin/athletes/'+id+'/(progress|messages)$')],POST:[/^auth\/(admin\/login|password|logout|sessions\/revoke-others)$/,/^athlete\/(login|progress|messages(?:\/read)?|consultations\/bookings)$/,new RegExp('^athlete/consultations/bookings/'+id+'/cancel$'),/^admin\/(athletes|training-plans|consultation-slots)$/,new RegExp('^admin/consultation-slots/'+id+'/disable$'),new RegExp('^admin/consultation-bookings/'+id+'/status$'),new RegExp('^admin/athletes/'+id+'/messages(?:/read)?$')],PUT:[new RegExp('^admin/training-plans/'+id+'$')]};
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
type Context={params:Promise<{path:string[]}>};
async function proxy(req:NextRequest,ctx:Context){
 const origin=process.env.FTA_WORKSPACE_ORIGIN,upstream=process.env.FTA_WORKSPACE_API_URL;
 if(process.env.FTA_WORKSPACE_MODE!=='isolated-staging'||!origin||!upstream)return response({error:'Workspace unavailable'},503);
 let source:URL,target:URL;try{source=new URL(origin);target=new URL(upstream);}catch{return response({error:'Workspace unavailable'},503);}
 if(!['127.0.0.1','localhost'].includes(target.hostname)||target.protocol!=='http:'||target.port!=='4000'||target.pathname!=='/'||target.username||target.password||target.search||target.hash||source.origin!==origin||(!['127.0.0.1','localhost'].includes(source.hostname)&&source.protocol!=='https:'))return response({error:'Workspace unavailable'},503);
 const path=(await ctx.params).path.join('/'),method=req.method;
 if(!rules[method]?.some(r=>r.test(path)))return response({error:'Route not supported'},404);
 if(req.nextUrl.search)return response({error:'Query not supported'},400);
 if(method!=='GET'&&(req.headers.get('origin')!==origin||req.headers.get('sec-fetch-site')==='cross-site'))return response({error:'Origin rejected'},403);
 const isLogin=path==='auth/admin/login'||path==='athlete/login';
 const session=req.cookies.get(cookie)?.value;
 if(isLogin&&session)return response({error:'Log out before changing account'},409);
 if(!isLogin&&(!session||!/^[a-f0-9]{64}$/.test(session))){const out=response({error:'Authentication required'},401);if(session)out.cookies.set(cookie,'',{httpOnly:true,secure:source.protocol==='https:',sameSite:'strict',path:'/',maxAge:0});return out;}
 let body:string|undefined;
 if(method!=='GET'){
  if(!req.headers.get('content-type')?.startsWith('application/json'))return response({error:'JSON required'},415);
  const reader=req.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
  if(reader){try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>131072){await reader.cancel();return response({error:'Request too large'},413);}chunks.push(value);}}catch{return response({error:'Invalid body'},400);}}
  try{body=Buffer.concat(chunks).toString('utf8');JSON.parse(body);}catch{return response({error:'Invalid JSON'},400);}
 }
 try{
  const r=await fetch(target.origin+'/api/v1/'+path,{method,headers:{Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'}),...(!isLogin?{Authorization:'Bearer '+session}:{})},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  const data=await r.json();
  const opts={httpOnly:true,secure:source.protocol==='https:',sameSite:'strict' as const,path:'/',maxAge:8*3600};
  if(isLogin&&r.ok){const {accessToken,...safe}=data;if(typeof accessToken!=='string'||!/^[a-f0-9]{64}$/.test(accessToken))return response({error:'Invalid session response'},502);const out=response(safe,r.status);out.cookies.set(cookie,accessToken,opts);return out;}
  const out=response(data,r.status);
  if(r.status===401||((path==='auth/logout'||path==='auth/password')&&r.ok))out.cookies.set(cookie,'',{...opts,maxAge:0});
  return out;
 }catch{return response({error:'Workspace service unavailable'},502);}
}
export {proxy as GET,proxy as POST,proxy as PUT};
