import Workspace from './workspace';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.FTA_WORKSPACE_MODE!=='isolated-staging')return <main className="p-8">محیط عملیاتی در این پیش‌نمایش فعال نیست.</main>;return <Workspace/>;}
