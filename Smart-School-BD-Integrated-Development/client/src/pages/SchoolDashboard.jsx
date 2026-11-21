import { useEffect, useState } from "react";
import { CalendarDays, CheckCheck, Clock3, Users, RefreshCw, ClipboardCheck } from "lucide-react";
import { api } from "../lib/api";

const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(new Date());
export default function SchoolDashboard() {
  const [studentCount,setStudentCount]=useState(null);
  const [sessions,setSessions]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    try{
      const [studentsResult,sessionResult]=await Promise.all([
        api.get("/students?limit=1&status=active"),
        api.get("/attendance/sessions",{params:{date:today()}}),
      ]);
      setStudentCount(studentsResult.data.data.pagination?.total ?? 0);
      setSessions(sessionResult.data.data.sessions||[]);
    }catch(e){setError(e.userMessage||"ড্যাশবোর্ডের তথ্য লোড করা যায়নি");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);
  const submitted=sessions.filter(s=>["submitted","finalized"].includes(s.status)).length;
  const pending=sessions.filter(s=>s.status==="in_progress").length;
  const cards=[
    {label:"মোট সক্রিয় শিক্ষার্থী",value:studentCount??"—",icon:Users,hint:"স্কুলের বর্তমান রেকর্ড"},
    {label:"আজকের হাজিরা সেশন",value:sessions.length,icon:CalendarDays,hint:"আজকের শ্রেণি ও শাখা"},
    {label:"কেন্দ্রে সাবমিট",value:submitted,icon:CheckCheck,hint:"প্রধান শিক্ষক সাবমিট করেছেন"},
    {label:"যাচাই অপেক্ষমাণ",value:pending,icon:Clock3,hint:"প্রধান শিক্ষকের পর্যালোচনা প্রয়োজন"},
  ];
  return <div className="space-y-6">
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    <div className="flex justify-end"><button className="secondary-button" onClick={load}><RefreshCw size={15}/> তথ্য রিফ্রেশ</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card=>{const Icon=card.icon;return <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"><div className="flex justify-between"><span className="text-sm text-slate-500">{card.label}</span><Icon size={20} className="text-brand-600"/></div><div className="mt-4 text-3xl font-bold">{loading?"…":card.value}</div><p className="mt-2 text-xs text-slate-500">{card.hint}</p></div>;})}
    </div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-bold text-slate-900">আজকের শ্রেণিভিত্তিক হাজিরা</h2><p className="mt-1 text-sm text-slate-500">প্রতিটি সেশনের অগ্রগতি ও সাবমিশন অবস্থা</p></div><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><CalendarDays size={14} className="mr-1 inline"/>{today()}</span></div>
      {loading?<p className="p-8 text-center text-sm text-slate-500">তথ্য লোড হচ্ছে...</p>:!sessions.length?<div className="p-8 text-center"><ClipboardCheck size={28} className="mx-auto text-slate-300"/><p className="mt-2 text-sm text-slate-500">আজকের জন্য কোনো হাজিরা সেশন তৈরি হয়নি।</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-5 py-3">শ্রেণি / শাখা</th><th className="px-4 py-3">শিক্ষাবর্ষ</th><th className="px-4 py-3">শিক্ষক</th><th className="px-4 py-3">অবস্থা</th></tr></thead><tbody className="divide-y divide-slate-100">{sessions.map(s=><tr key={s._id}><td className="px-5 py-4 font-semibold">{s.className} · {s.section||"সাধারণ"}</td><td className="px-4 py-4">{s.academicYear}</td><td className="px-4 py-4">{s.createdBy?.name||"—"}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.status==="submitted"||s.status==="finalized"?"bg-emerald-50 text-emerald-700":"bg-amber-50 text-amber-700"}`}>{s.status==="submitted"?"কেন্দ্রে সাবমিট":s.status==="finalized"?"চূড়ান্ত":"যাচাই অপেক্ষমাণ"}</span></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
