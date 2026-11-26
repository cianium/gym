import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = {title:{default:'FTA Platform | Demo',template:'%s | FTA'},description:'Fitness Training & Administration',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:ReactNode}) {
 return <html lang="fa" dir="rtl"><body><header className="topbar"><Link href="/" className="brand" dir="ltr" aria-label="FTA صفحه اصلی">FTA</Link><nav className="sections" aria-label="ناوبری اصلی"><Link href="/">داشبورد</Link><Link href="/admin">مدیریت</Link><Link href="/athlete">ورزشکار</Link></nav></header>{children}<footer className="shell"><span dir="ltr">FTA · Train. Manage. Grow.</span><p>نسخه نمایشی — اطلاعات کاملاً ساختگی</p></footer></body></html>;
}
