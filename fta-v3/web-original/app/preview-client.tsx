"use client";
import dynamic from "next/dynamic";
const Original=dynamic(()=>import("../src/App"),{ssr:false,loading:()=> <p role="status" className="p-6">در حال بارگذاری رابط اصلی…</p>});
export default function Preview(){return <Original/>;}
