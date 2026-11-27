import Link from 'next/link';
import {demoGet} from './demo-data';
export const dynamic='force-dynamic';
type Overview={mode:'demo';athletes:number;coaches:number;activePlans:number;appointments:number};
export default async function Home(){
 const d=await demoGet<Overview>('overview');
 return <main className="shell"><p className="eyebrow" dir="ltr" style={{textAlign:'right'}}>FITNESS TRAINING &amp; ADMINISTRATION</p><h1>مرکز مدیریت تناسب اندام</h1><p>پلتفرم مستقل مدیریت مربیان و ورزشکاران. نسخه نمایشی با اطلاعات نمونه.</p>
 <section aria-label="شاخص‌های نمونه">{d&&d.mode==='demo'?<div className="cards">{[['ورزشکاران',d.athletes],['مربیان',d.coaches],['برنامه‌های فعال',d.activePlans],['جلسات',d.appointments]].map(([label,value])=><article key={label}><p>{label}</p><strong style={{fontSize:32,color:'var(--accent)'}}>{Number(value).toLocaleString('fa-IR')}</strong></article>)}</div>:<p role="status">سرویس نمایشی در دسترس نیست.</p>}</section>
 <section className="cards"><article><h2>پنل مدیریت</h2><p>نمای ورزشکاران، مربیان، جلسات، برنامه‌ها و محصولات.</p><Link href="/admin">مشاهده دمو مدیریت</Link></article><article><h2>پنل ورزشکار</h2><p>برنامه تمرینی، مربی و جلسات نمونه.</p><Link href="/athlete">مشاهده دمو ورزشکار</Link></article></section></main>;
}
