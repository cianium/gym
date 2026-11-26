/* FTA isolated synthetic demo. Never forwards API traffic. Not production auth. */
(()=>{ 'use strict';
 const KEY='fta-restoration-preview-v2', csrf='FTA-DEMO-CSRF';
 const data=structuredClone(window.FTA_FIXTURES);
 const now=()=>new Date().toISOString(), day=n=>new Date(Date.now()+n*86400000).toISOString();
 const seed={admin:true,logged:true,athleteId:101,athletes:[{id:101,name:'ورزشکار نمونه FTA',email:'athlete@example.test',phone:'00000000000',phone_verified:true},{id:102,name:'ورزشکار نمونه ۲',email:'athlete2@example.test',phone:'00000000001',phone_verified:true}],plans:[{id:501,athlete_id:101,title:'برنامه قدرت و هایپرتروفی',description:'برنامه نمونه سه جلسه‌ای',status:'published',starts_on:day(-7).slice(0,10),ends_on:day(21).slice(0,10),sessions:[{day:'شنبه — بالاتنه',exercises:[{name:'پرس سینه',sets:4,reps:'۸ تا ۱۰'},{name:'قایقی',sets:3,reps:'۱۲'}]},{day:'دوشنبه — پایین‌تنه',exercises:[{name:'اسکوات',sets:4,reps:'۸'},{name:'پرس پا',sets:3,reps:'۱۲'}]}]}],progress:[{id:601,athlete_id:101,training_plan_id:501,performed_on:day(-2).slice(0,10),session_day:'شنبه — بالاتنه',effort:7,notes:'گزارش نمونه'}],slots:[{id:701,starts_at:day(1),ends_at:new Date(Date.now()+86400000+2700000).toISOString(),is_active:true},{id:702,starts_at:day(3),ends_at:new Date(Date.now()+3*86400000+2700000).toISOString(),is_active:true}],bookings:[],messages:[{id:801,athlete_id:101,sender_id:0,body:'این یک پیام نمونه از مربی است.',created_at:now()}],orders:[],leads:[],draft:{},next:1000};
 function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Array.isArray(v.athletes)&&Array.isArray(v.plans)&&Array.isArray(v.slots)&&Array.isArray(v.messages)&&Array.isArray(v.bookings)&&Array.isArray(v.progress)&&Array.isArray(v.orders)&&Array.isArray(v.leads))return v;}catch{}return structuredClone(seed)}
 let s=read();const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}};
 const json=(v,status=200)=>Promise.resolve(new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8'}}));
 const error=(message,status=422)=>json({error:message,demo:true},status), ok=(v={})=>{return save()?json({ok:true,...v}):error('ذخیره مرورگر در دسترس نیست.',507)};
 const text=(v,n=200)=>String(v??'').trim().slice(0,n), next=()=>++s.next, current=()=>s.athletes.find(a=>a.id===s.athleteId), mine=x=>x.athlete_id===s.athleteId;
 const occupied=id=>s.bookings.some(b=>b.slot_id===id&&['requested','confirmed'].includes(b.status));
 const slots=()=>s.slots.map(a=>({...a,active_booking:occupied(a.id)}));
 const validDate=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 const old=window.fetch.bind(window);
 window.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href), method=(init?.method||input?.method||'GET').toUpperCase();
  if(url.origin!==location.origin)return error('ارتباط خارجی در دمو غیرفعال است.',403);
  if(!url.pathname.startsWith('/api/'))return error('ارتباط شبکه در دمو غیرفعال است.',403);
  const p=url.pathname.replace(/^\/api\/v1\//,'');let b={};try{b=JSON.parse(init?.body||'{}')||{}}catch{if(init?.body&&typeof init.body==='string')return error('JSON نامعتبر است.');}if(!b||typeof b!=='object'||Array.isArray(b))return error('درخواست نامعتبر است.');s=read();let a=current();let m;
  if(p==='bootstrap'&&method==='GET')return json({...data,...s.draft,gateways:[],orders:[],auditLogs:[],installed:true});
  if(p==='install/status'&&method==='GET')return json({installed:true,version:data.version,demo:true});
  if(p==='auth/session'&&method==='GET')return json({authenticated:s.admin,username:s.admin?'demo':null,csrfToken:s.admin?csrf:null,mustChangePassword:false});
  if(p==='auth/admin/login'&&method==='POST'){s.admin=true;return ok({authenticated:true,username:'demo',csrfToken:csrf,mustChangePassword:false})}
  if(p==='auth/admin/logout'&&method==='POST'){s.admin=false;return ok()}
  if(p==='athlete/login'&&method==='POST'){s.logged=true;s.athleteId=101;return ok({authenticated:true,athlete:current(),csrfToken:csrf})}
  if(p==='athlete/otp/request'&&method==='POST')return json({ok:true,demo_code:'123456',message:'کد نمایشی 123456'});
  if(p==='athlete/register'&&method==='POST'){if(String(b.code)!=='123456')return error('کد نمایشی 123456 است.');if(!text(b.name)||s.athletes.length>=100)return error('نام نمونه معتبر وارد کنید.');const id=next();a={id,name:text(b.name,120),email:'athlete'+id+'@example.test',phone:'00000000000',phone_verified:true};s.athletes.push(a);s.athleteId=id;s.logged=true;return ok({authenticated:true,athlete:a,csrfToken:csrf})}
  if(p.startsWith('athlete/')&&(!s.logged||!a))return error('ورود نمایشی لازم است.',401);
  if(p.startsWith('admin/')&&!s.admin)return error('ورود نمایشی مدیریت لازم است.',401);
  if(p==='athlete/me'&&method==='GET')return json({athlete:a,csrfToken:csrf});
  if(p==='athlete/logout'&&method==='POST'){s.logged=false;return ok()}
  if(p==='athlete/phone/otp/request'&&method==='POST')return json({ok:true,demo_code:'123456'});
  if(p==='athlete/phone/verify'&&method==='POST'){if(String(b.code)!=='123456')return error('کد نمایشی 123456 است.');a.phone_verified=true;return ok()}
  if(p==='athlete/plans'&&method==='GET')return json({plans:s.plans.filter(x=>mine(x)&&x.status==='published')});
  if(p==='athlete/progress'&&method==='GET')return json({progress:s.progress.filter(mine)});
  if(p==='athlete/progress'&&method==='POST'){const plan=s.plans.find(x=>x.id===Number(b.training_plan_id)&&mine(x)&&x.status==='published');if(!plan||!plan.sessions.some(x=>x.day===b.session_day)||!validDate(b.performed_on)||b.effort!=null&&(!Number.isInteger(Number(b.effort))||Number(b.effort)<1||Number(b.effort)>10))return error('گزارش تمرین نامعتبر است.');const item={id:next(),athlete_id:a.id,training_plan_id:plan.id,session_day:b.session_day,performed_on:b.performed_on,effort:b.effort==null?null:Number(b.effort),notes:text(b.notes,2000)};s.progress.unshift(item);return ok({progress:item})}
  if(p==='athlete/orders'&&method==='GET')return json({orders:s.orders.filter(mine)});
  if(p==='athlete/consultations/slots'&&method==='GET')return json({slots:slots().filter(x=>x.is_active&&!x.active_booking&&Date.parse(x.starts_at)>Date.now())});
  if(p==='athlete/consultations/bookings'&&method==='GET')return json({bookings:s.bookings.filter(mine)});
  if(p==='athlete/consultations/bookings'&&method==='POST'){const slot=s.slots.find(x=>x.id===Number(b.slot_id));if(!slot||!slot.is_active||occupied(slot.id)||Date.parse(slot.starts_at)<=Date.now())return error('زمان در دسترس نیست.',409);const booking={id:next(),athlete_id:a.id,athlete:a,slot_id:slot.id,slot,starts_at:slot.starts_at,status:'requested',athlete_note:text(b.note,500)};s.bookings.unshift(booking);return ok({booking})}
  if((m=p.match(/^athlete\/consultations\/bookings\/(\d+)\/cancel$/))&&method==='POST'){const bk=s.bookings.find(x=>x.id===Number(m[1])&&mine(x));if(!bk||!['requested','confirmed'].includes(bk.status))return error('رزرو قابل لغو نیست.',409);bk.status='cancelled';return ok()}
  if(p==='athlete/messages'&&method==='GET')return json({messages:s.messages.filter(mine)});
  if(p==='athlete/messages'&&method==='POST'){if(!text(b.body))return error('پیام خالی است.');s.messages.push({id:next(),athlete_id:a.id,sender_id:a.id,body:text(b.body,2000),created_at:now()});return ok()}
  if(p==='athlete/messages/read'&&method==='POST')return json({ok:true});
  if(p==='admin/athletes'&&method==='GET')return json({athletes:s.athletes});
  if(p==='admin/athletes'&&method==='POST'){if(!text(b.name)||s.athletes.length>=100)return error('نام نمونه معتبر وارد کنید.');const id=next(), athlete={id,name:text(b.name,120),email:'athlete'+id+'@example.test',phone:'00000000000',phone_verified:true};s.athletes.push(athlete);return ok({athlete})}
  if(p==='admin/training-plans'&&method==='GET')return json({plans:{data:s.plans}});
  if((p==='admin/training-plans'&&method==='POST')||((m=p.match(/^admin\/training-plans\/(\d+)$/))&&method==='PUT')){const athlete_id=Number(b.athlete_id);if(!s.athletes.some(x=>x.id===athlete_id)||!text(b.title)||!Array.isArray(b.sessions)||!b.sessions.length||b.sessions.some(x=>!text(x.day)||!Array.isArray(x.exercises)||!x.exercises.length||x.exercises.some(e=>!text(e.name))))return error('برنامه نامعتبر است.');const plan={id:method==='PUT'?Number(m[1]):next(),athlete_id,title:text(b.title),description:text(b.description,2000),status:b.status==='published'?'published':'draft',starts_on:b.starts_on||null,ends_on:b.ends_on||null,sessions:b.sessions.slice(0,30).map(x=>({day:text(x.day),exercises:x.exercises.slice(0,50).map(e=>({name:text(e.name),sets:e.sets,reps:text(e.reps,80)}))}))};if(method==='PUT'){const i=s.plans.findIndex(x=>x.id===plan.id);if(i<0)return error('برنامه یافت نشد.',404);s.plans[i]=plan}else s.plans.unshift(plan);return ok({plan})}
  if((m=p.match(/^admin\/athletes\/(\d+)\/progress$/))&&method==='GET')return json({progress:s.progress.filter(x=>x.athlete_id===Number(m[1]))});
  if(p==='admin/consultation-slots'&&method==='GET')return json({slots:slots()});
  if(p==='admin/consultation-slots'&&method==='POST'){if(!validDate(b.starts_at)||!validDate(b.ends_at)||Date.parse(b.starts_at)<=Date.now()||Date.parse(b.ends_at)<=Date.parse(b.starts_at)||s.slots.some(x=>x.is_active&&Date.parse(x.starts_at)<Date.parse(b.ends_at)&&Date.parse(x.ends_at)>Date.parse(b.starts_at)))return error('زمان نامعتبر یا هم‌پوشان است.');s.slots.push({id:next(),starts_at:b.starts_at,ends_at:b.ends_at,is_active:true});return ok()}
  if((m=p.match(/^admin\/consultation-slots\/(\d+)\/disable$/))&&method==='POST'){const slot=s.slots.find(x=>x.id===Number(m[1]));if(!slot||occupied(slot.id))return error('زمان قابل غیرفعال‌کردن نیست.',409);slot.is_active=false;return ok()}
  if(p==='admin/consultation-bookings'&&method==='GET')return json({bookings:s.bookings});
  if((m=p.match(/^admin\/consultation-bookings\/(\d+)\/status$/))&&method==='POST'){const bk=s.bookings.find(x=>x.id===Number(m[1]));const allowed={requested:['confirmed','cancelled'],confirmed:['completed','cancelled']};if(!bk||!allowed[bk.status]?.includes(b.status))return error('تغییر وضعیت مجاز نیست.',409);bk.status=b.status;return ok()}
  if(p==='admin/consultation-leads'&&method==='GET')return json({leads:s.leads});
  if((m=p.match(/^admin\/consultation-leads\/(\d+)\/status$/))&&method==='POST'){const lead=s.leads.find(x=>x.id===Number(m[1]));if(!lead||!['contacted','closed'].includes(b.status))return error('وضعیت نامعتبر است.');lead.status=b.status;return ok()}
  if(p==='admin/consultation-sms-status'&&method==='GET')return json({unknown_count:0,recent:[]});
  if((m=p.match(/^admin\/athletes\/(\d+)\/messages(\/read)?$/))){const id=Number(m[1]);if(!s.athletes.some(x=>x.id===id))return error('ورزشکار یافت نشد.',404);if(method==='GET'&&!m[2])return json({messages:s.messages.filter(x=>x.athlete_id===id)});if(method==='POST'&&m[2])return json({ok:true});if(method==='POST'&&!m[2]&&text(b.body)){s.messages.push({id:next(),athlete_id:id,sender_id:0,body:text(b.body,2000),created_at:now()});return ok()}}
  if(p==='consultations'&&method==='POST'){s.leads.unshift({id:next(),sender_name:'مشتری نمونه',sender_phone:'00000000000',goal_topic:text(b.goalTopic||b.goal_topic),message:text(b.message,500),status:'new',coach_notes:''});return ok()}
  if(p==='admin/state-sync'&&method==='PUT'){
   // No fake success for unsupported settings. Product/post requests are upserts, not replacement lists.
   const allowed=['themeColors','sectionConfigs','siteModules','products','posts','deletedProductIds','deletedPostIds','brandConfig','coach'];
   if(Object.keys(b).some(k=>!allowed.includes(k)))return error('این تنظیم در دمو ذخیره نمی‌شود.',501);
   const nextDraft=structuredClone(s.draft||{});
   const plain=v=>v&&typeof v==='object'&&!Array.isArray(v);
   const clean=(v,depth=0)=>{if(depth>12)throw Error('ساختار بیش از حد پیچیده است.');if(typeof v==='string'){if(/^(?:https?:|javascript:|data:|blob:|\/\/)/i.test(v.trim()))return '';return v.slice(0,6000)}if(v===null||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;if(Array.isArray(v)){if(v.length>200)throw Error('تعداد موارد بیش از حد است.');return v.map(x=>clean(x,depth+1))}if(plain(v))return Object.fromEntries(Object.entries(v).filter(([k])=>!['__proto__','constructor','prototype'].includes(k)&&!/password|secret|token|merchant|api.?key|phone|email|address|serial|handle/i.test(k)).map(([k,x])=>[k,clean(x,depth+1)]));throw Error('داده نامعتبر است.')};
   try{
    if(JSON.stringify(b).length>200000)throw Error('حجم تغییرات بیش از حد است.');
    for(const k of ['themeColors','siteModules','brandConfig','coach'])if(b[k]!==undefined){if(!plain(b[k]))throw Error('تنظیم نامعتبر است.');nextDraft[k]={...data[k],...(nextDraft[k]||{}),...clean(b[k])};}
    if(b.sectionConfigs!==undefined){if(!Array.isArray(b.sectionConfigs)||b.sectionConfigs.some(x=>!plain(x)||!text(x.id,100)))throw Error('بخش نامعتبر است.');nextDraft.sectionConfigs=clean(b.sectionConfigs);}
    for(const [key,del] of [['products','deletedProductIds'],['posts','deletedPostIds']]){
     let rows=structuredClone(nextDraft[key]||data[key]);
     if(b[key]!==undefined){if(!Array.isArray(b[key])||b[key].some(x=>!plain(x)||!text(x.id,100)||!text(x.title)))throw Error('عنوان یا شناسه نامعتبر است.');for(const item of clean(b[key])){if(key==='products'&&(!Number.isFinite(item.price)||item.price<0))throw Error('قیمت نامعتبر است.');const i=rows.findIndex(x=>x.id===item.id);if(i<0)rows.unshift(item);else rows[i]={...rows[i],...item};}}
     if(b[del]!==undefined){if(!Array.isArray(b[del]))throw Error('فهرست حذف نامعتبر است.');rows=rows.filter(x=>!b[del].includes(x.id));}
     if(rows.length>100)throw Error('ظرفیت دمو ۱۰۰ مورد است.');if(b[key]!==undefined||b[del]!==undefined)nextDraft[key]=rows;
    }
   }catch(e){return error(e.message);}
   s.draft=nextDraft;return ok();
  }
  if((m=p.match(/^admin\/products\/([^/]+)$/))&&method==='DELETE'){const rows=s.draft.products||data.products,id=decodeURIComponent(m[1]);if(!rows.some(x=>x.id===id))return error('محصول یافت نشد.',404);s.draft.products=rows.filter(x=>x.id!==id);return ok({action:'deleted'})}
  if(p==='admin/reset'&&method==='POST'){s=structuredClone(seed);return ok()}
  if((m=p.match(/^posts\/([^/]+)\/(like|save|comments)$/))&&method==='POST'){
   const rows=structuredClone(s.draft.posts||data.posts),post=rows.find(x=>x.id===decodeURIComponent(m[1]));if(!post)return error('محتوا یافت نشد.',404);
   if(m[2]==='like'){if(!['like','unlike'].includes(b.action))return error('عملیات نامعتبر است.');const desired=b.action==='like';if(!!post.isLiked!==desired)post.likesCount=Math.max(0,(Number(post.likesCount)||0)+(desired?1:-1));post.isLiked=desired;s.draft.posts=rows;return ok({isLiked:desired,likesCount:post.likesCount})}
   if(m[2]==='save'){if(typeof b.saved!=='boolean')return error('عملیات نامعتبر است.');post.isSaved=b.saved;s.draft.posts=rows;return ok({isSaved:b.saved})}
   if(!text(b.text,1000))return error('دیدگاه خالی است.');const comment={id:'demo-comment-'+next(),authorName:'مشتری نمونه',authorRole:'دیدگاه آزمایشی',text:text(b.text,1000),createdAt:'اکنون',status:'pending'};s.pendingComments=[...(s.pendingComments||[]),{postId:post.id,...comment}].slice(-100);return ok({moderationRequired:true,message:'دیدگاه نمونه در انتظار بررسی است.'});
  }
  return error('این عملیات در پیش‌نمایش غیرفعال است.',501);
 };
})();
