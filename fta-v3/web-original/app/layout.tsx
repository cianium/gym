import type {Metadata} from "next";
import type {ReactNode} from "react";
import "../src/index.css";
export const metadata:Metadata={title:"FTA | Original source preview",robots:{index:false,follow:false}};
export default function Layout({children}:{children:ReactNode}){return <html lang="fa" dir="rtl" className="dark"><body className="bg-[#101010] text-[#F5F2EC] antialiased"><aside role="note" style={{padding:"8px 16px",fontSize:12,background:"#292318",color:"#F5F2EC"}}>FTA · پیش‌نمایش سورس؛ فقط اطلاعات ساختگی وارد کنید. پرداخت و پیامک واقعی غیرفعال است.</aside>{process.env.FTA_WORKSPACE_MODE==='isolated-staging'&&<nav aria-label="محیط آزمایشی" className="px-4 py-2 border-b border-white/10 text-sm flex gap-4"><a className="text-[#C8A66A]" href="/">رابط مشتری</a><a className="text-[#C8A66A]" href="/workspace">ورود به فضای عملیاتی ورزشکار و مربی</a></nav>}{children}</body></html>}
