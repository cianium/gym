import type { Metadata } from 'next';
import type { ReactNode } from 'react';
export const metadata: Metadata = { title: 'FTA Platform | Demo', description: 'Fitness Training & Administration', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="fa" dir="rtl"><body style={{margin:0,background:'#101512',color:'#f5f7f5',fontFamily:'system-ui,sans-serif'}}>{children}</body></html>;
}
