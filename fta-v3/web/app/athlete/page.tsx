import {demoGet} from '../demo-data';
export const dynamic='force-dynamic';
type Athlete={name:string;status:string;coach:{name:string};plans:{title:string;status:string}[];appointments:{title:string;startsAt:string;status:string}[]};
export default async function AthletePage(){
 const a=await demoGet<Athlete>('athlete');
 return <main className="shell"><p className="eyebrow">FTA ATHLETE PORTAL · DEMO</p><h1>پنل ورزشکار</h1><p>نمای ثابت یک ورزشکار ساختگی؛ ورود واقعی و عملیات حساس غیرفعال است.</p>
 {a?<><section><h2>{a.name}</h2><article><p>مربی: {a.coach.name}</p><p>وضعیت: {a.status==='active'?'فعال':'غیرفعال'}</p></article></section><section><h2>برنامه‌های من</h2><div className="cards">{a.plans.map(p=><article key={p.title}><h3>{p.title}</h3><p>برنامه فعال</p></article>)}</div></section><section><h2>جلسات من</h2><div className="cards">{a.appointments.map(p=><article key={p.title}><h3>{p.title}</h3><time dateTime={p.startsAt}>{new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(p.startsAt))}</time></article>)}</div></section></>:<p role="status">اطلاعات در دسترس نیست.</p>}</main>;
}
