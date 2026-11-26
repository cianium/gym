import {demoGet} from '../demo-data';
export const dynamic='force-dynamic';
type Member={id:string;name:string;status:string;coach:{name:string}};
type Coach={id:string;name:string;specialty:string};
type Plan={id:string;title:string;status:string;member:{name:string}};
type Appointment=Plan & {startsAt:string};
type Product={id:string;title:string;kind:string;priceToman:number};
export default async function Admin(){
 const [members,coaches,plans,appointments,products]=await Promise.all([demoGet<Member[]>('members'),demoGet<Coach[]>('coaches'),demoGet<Plan[]>('plans'),demoGet<Appointment[]>('appointments'),demoGet<Product[]>('products')]);
 return <main className="shell"><p className="eyebrow">FTA CONTROL CENTER · DEMO</p><h1>پنل مدیریت</h1><p>اطلاعات نمونه؛ این صفحه محیط عملیاتی یا پنل دارای احراز هویت نیست.</p>
 <nav className="sections"><a href="#members">ورزشکاران</a><a href="#coaches">مربیان</a><a href="#plans">برنامه‌ها</a><a href="#appointments">جلسات</a><a href="#store">فروشگاه</a></nav>
 <section id="members"><h2>ورزشکاران</h2>{members ? <div className="cards">{members.map(m=><article key={m.id}><h3>{m.name}</h3><p>{m.coach.name}</p><span>{m.status==='active'?'فعال':'غیرفعال'}</span></article>)}</div>:<p role="status">اطلاعات در دسترس نیست.</p>}</section>
 <section id="coaches"><h2>مربیان</h2>{coaches ? <div className="cards">{coaches.map(c=><article key={c.id}><h3>{c.name}</h3><p>{c.specialty}</p></article>)}</div>:<p role="status">اطلاعات در دسترس نیست.</p>}</section>
 <section id="plans"><h2>برنامه‌های تمرینی</h2>{plans ? <div className="cards">{plans.map(p=><article key={p.id}><h3>{p.title}</h3><p>{p.member.name}</p></article>)}</div>:<p role="status">اطلاعات در دسترس نیست.</p>}</section>
 <section id="appointments"><h2>جلسات مشاوره</h2>{appointments ? <div className="cards">{appointments.map(a=><article key={a.id}><h3>{a.title}</h3><p>{a.member.name}</p><time dateTime={a.startsAt}>{new Intl.DateTimeFormat('fa-IR',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(a.startsAt))}</time></article>)}</div>:<p role="status">اطلاعات در دسترس نیست.</p>}</section>
 <section id="store"><h2>فروشگاه</h2>{products ? <div className="cards">{products.map(p=><article key={p.id}><h3>{p.title}</h3><p>{p.priceToman.toLocaleString('fa-IR')} تومان</p></article>)}</div>:<p role="status">اطلاعات در دسترس نیست.</p>}</section></main>;
}
