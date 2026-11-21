import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

const today = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Dhaka"}).format(new Date());
export default function PrincipalVerificationPage(){
  const [date,setDate]=useState(today());
  const [sessions,setSessions]=useState([]);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [confirmations,setConfirmations]=useState({});
  const load=async()=>{
    setLoading(true);setError("");
    try{const r=await api.get("/attendance/sessions",{params:{date}});setSessions(r.data.data.sessions||[]);}
    catch(e){setError(e.userMessage||"দৈনিক হাজিরা লোড করা যায়নি");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[date]);
  const validate=async(id)=>{
    setBusy(id);setError("");setNotice("");
    try{const r=await api.get(`/attendance/sessions/${id}/validation`);setNotice(`মোট ${r.data.data.totalStudents} জন · রেকর্ড ${r.data.data.recordedStudents} জন · বাকি ${r.data.data.missingCount} জন`);await load();}
    catch(e){setError(e.response?.data?.message||e.userMessage||"যাচাই করা যায়নি");}
    finally{setBusy("");}
  };
  const submit=async(id)=>{
    if(!window.confirm("যাচাই করা হাজিরা কেন্দ্রীয় সিস্টেমে চূড়ান্তভাবে সাবমিট করবে?"))return;
    setBusy(id);setError("");setNotice("");
    try{await api.post(`/attendance/sessions/${id}/submit`,{confirmed:true});setConfirmations(old=>({...old,[id]:false}));setNotice("দৈনিক হাজিরা কেন্দ্রীয় সিস্টেমে সাবমিট হয়েছে।");await load();}
    catch(e){setError(e.response?.data?.message||e.userMessage||"সাবমিট করা যায়নি");}
    finally{setBusy("");}
  };
  const statusLabel=(s)=>({in_progress:"যাচাই অপেক্ষমাণ",submitted:"কেন্দ্রে সাবমিট",finalized:"চূড়ান্ত",returned:"সংশোধনের জন্য ফেরত"})[s]||s;
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">দৈনিক হাজিরা যাচাই ও সাবমিশন</h2><p className="mt-1 text-sm text-slate-500">প্রতিটি শ্রেণির সব শিক্ষার্থীর রেকর্ড যাচাই করে কেন্দ্রীয় সিস্টেমে পাঠাও।</p></div><label className="text-xs font-semibold">তারিখ<input type="date" className="field mt-1" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice&&<p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-2"><ShieldCheck className="text-brand-700"/><h3 className="font-bold">শ্রেণিভিত্তিক হাজিরা সেশন</h3></div><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
      {loading?<p className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে...</p>:!sessions.length?<p className="p-8 text-center text-sm text-slate-500">এই তারিখে কোনো হাজিরা সেশন পাওয়া যায়নি।</p>:<div className="divide-y divide-slate-100">{sessions.map(s=><div key={s._id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"><div><div className="font-semibold">{s.className} · {s.section||"সাধারণ"} · {s.academicYear}</div><div className="mt-1 text-xs text-slate-500">অবস্থা: {statusLabel(s.status)} · তৈরি: {s.createdBy?.name||"—"} · জমা: {s.submittedBy?.name||"—"}</div>{s.validation && <div className="mt-1 text-xs text-slate-600">মোট {s.validation.totalStudents} · রেকর্ড {s.validation.recordedStudents} · বাকি {s.validation.missingCount}</div>}</div><div className="flex flex-wrap gap-2">{s.status==="in_progress"&&<><button disabled={busy===s._id} className="secondary-button" onClick={()=>validate(s._id)}><CheckCircle2 size={14}/> যাচাই</button><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={!!confirmations[s._id]} onChange={e=>setConfirmations(old=>({...old,[s._id]:e.target.checked}))}/> আমি হাজিরা যাচাই করেছি</label><button disabled={busy===s._id || !confirmations[s._id]} className="primary-button" onClick={()=>submit(s._id)}><Send size={14}/>{busy===s._id?"প্রক্রিয়াধীন...":"কেন্দ্রে সাবমিট"}</button></>}{s.status!=="in_progress"&&<span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{statusLabel(s.status)}</span>}</div></div>)}</div>}
    </section>
    <p className="text-xs leading-5 text-amber-700">সাবমিট করার আগে প্রতিটি শিক্ষার্থীর উপস্থিতি/অনুপস্থিতি যাচাই করতে হবে। অসম্পূর্ণ সেশন Backend থেকে প্রত্যাখ্যাত হবে।</p>
  </div>;
}
