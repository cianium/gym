export const dynamic = 'force-dynamic';
type Overview = { mode: 'demo'; athletes: number; coaches: number; activePlans: number; appointments: number };
async function load(): Promise<Overview | null> {
  try {
    const response = await fetch((process.env.FTA_API_URL ?? 'http://127.0.0.1:4000') + '/api/v1/demo/overview', { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.mode !== 'demo' || !['athletes','coaches','activePlans','appointments'].every(k => Number.isSafeInteger(data[k]) && data[k] >= 0)) return null;
    return data as Overview;
  } catch { return null; }
}
export default async function Page() {
  const data = await load();
  return <main style={{maxWidth:1000,margin:'auto',padding:'48px 24px'}}>
    <header style={{borderBottom:'1px solid #39443d',paddingBottom:24}}>
      <strong dir="ltr" style={{fontSize:36,letterSpacing:6,color:'#c5f36b'}}>FTA</strong>
      <p dir="ltr" style={{textAlign:'right'}}>Fitness Training &amp; Administration</p>
    </header>
    <p style={{color:'#c5f36b'}}>نسخه نمایشی • اطلاعات ساختگی</p>
    <h1>مرکز مدیریت تناسب اندام</h1>
    <p>نمای اولیه داشبورد نسل جدید FTA. هیچ عملیات مالی یا اطلاعات واقعی در این محیط وجود ندارد.</p>
    {data ? <section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:16}}>
      {[['ورزشکاران',data.athletes],['مربیان',data.coaches],['برنامه فعال',data.activePlans],['جلسات',data.appointments]].map(([label,value])=><article key={label} style={{padding:20,border:'1px solid #39443d',borderRadius:16,background:'#1c251f'}}><p>{label}</p><strong style={{fontSize:30,color:'#c5f36b'}}>{value}</strong></article>)}
    </section> : <p role="status">سرویس نمایشی در دسترس نیست.</p>}
    <footer style={{marginTop:48,color:'#b9c4bc'}}>FTA · Train. Manage. Grow.</footer>
  </main>;
}
