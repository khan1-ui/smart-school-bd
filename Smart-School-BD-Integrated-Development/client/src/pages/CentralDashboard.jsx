import { useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCw, Search, MapPin, School, Layers3, ClipboardList } from "lucide-react";
import { api } from "../lib/api";
import StatCard from "../components/StatCard";

function FilterSelect({ label, value, options, onChange, disabled = false }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span><select className="field w-full" value={value} disabled={disabled} onChange={(event)=>onChange(event.target.value)}><option value="">সব {label}</option>{options.map((option)=><option key={option} value={option}>{option}</option>)}</select></label>;
}

export default function CentralDashboard() {
  const [schools,setSchools]=useState([]);
  const [pendingCount,setPendingCount]=useState(0);
  const [monitoring,setMonitoring]=useState(null);
  const [query,setQuery]=useState("");
  const [division,setDivision]=useState("");
  const [district,setDistrict]=useState("");
  const [upazila,setUpazila]=useState("");
  const [schoolCode,setSchoolCode]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=async()=>{
    setLoading(true);setError("");
    try{
      const [optionsResult,pendingResult,monitoringResult]=await Promise.all([
        api.get("/schools/central/options"),
        api.get("/schools/pending"),
        api.get("/central/overview"),
      ]);
      const centralRows = monitoringResult.data.data.schools || [];
      setSchools(centralRows.map((s) => ({ ...s, _id: s.id })));
      setMonitoring(monitoringResult.data.data.summary || null);
      setPendingCount((pendingResult.data.data.schools||[]).length);
    }catch(err){setError(err.userMessage||"কেন্দ্রীয় স্কুল তালিকা লোড করা যায়নি");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const divisions=useMemo(()=>[...new Set(schools.map(s=>s.division).filter(Boolean))].sort(),[schools]);
  const districts=useMemo(()=>[...new Set(schools.filter(s=>!division||s.division===division).map(s=>s.district).filter(Boolean))].sort(),[schools,division]);
  const upazilas=useMemo(()=>[...new Set(schools.filter(s=>(!division||s.division===division)&&(!district||s.district===district)).map(s=>s.upazila).filter(Boolean))].sort(),[schools,division,district]);
  const availableSchools=useMemo(()=>schools.filter(s=>(!division||s.division===division)&&(!district||s.district===district)&&(!upazila||s.upazila===upazila)),[schools,division,district,upazila]);
  const filtered=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase();
    return availableSchools.filter(s=>(!q||`${s.name} ${s.schoolCode} ${s.division} ${s.district} ${s.upazila}`.toLocaleLowerCase().includes(q))&&(!schoolCode||s.schoolCode===schoolCode));
  },[availableSchools,query,schoolCode]);

  const cards=[
    {label:"সক্রিয় স্কুল",value:monitoring?.schoolCount ?? "—",icon:"school",helper:"কেন্দ্রীয় সক্রিয় স্কুল"},
    {label:"সক্রিয় শিক্ষার্থী",value:monitoring?.activeStudents ?? "—",icon:"play",helper:"সক্রিয় শিক্ষার্থী রেকর্ড"},
    {label:"আজকের সাবমিশন",value:monitoring?.submittedSessions ?? "—",icon:"check",helper:`মোট সেশন ${monitoring?.sessionCount ?? "—"}`},
    {label:"অপেক্ষমাণ আবেদন",value:pendingCount,icon:"alert",helper:"কেন্দ্রীয় অনুমোদন প্রয়োজন"},
  ];

  const reset=()=>{setQuery("");setDivision("");setDistrict("");setUpazila("");setSchoolCode("");};

  return <div className="space-y-6">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
      <div className="flex items-start gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0"/><div><strong>কেন্দ্রীয় রেকর্ড:</strong> স্কুল নিবন্ধনের সময় জমা দেওয়া বিভাগ, জেলা ও উপজেলা থেকে ফিল্টার স্বয়ংক্রিয়ভাবে তৈরি হয়। এই তালিকায় শুধু অনুমোদিত স্কুল রয়েছে।</div></div>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {cards.map(item=><StatCard key={item.label} item={item}/>)}
    </section>

    <section className="flag-card min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/20 pb-5 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="font-bold text-white">নিবন্ধিত স্কুল মনিটরিং</h2><p className="mt-1 text-sm text-brand-100">কেন্দ্রীয় অনুমোদিত স্কুলের তালিকা ও এলাকাভিত্তিক অনুসন্ধান</p></div>
        <button type="button" className="secondary-button shrink-0" onClick={reset}><RefreshCw size={15}/> ফিল্টার রিসেট</button>
      </div>
      <div className="mt-4 space-y-4 rounded-xl border border-white/20 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-900"><MapPin size={17}/> এলাকাভিত্তিক ফিল্টার<span className="ml-auto text-xs font-normal text-slate-500">বিভাগ → জেলা → উপজেলা → স্কুল</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FilterSelect label="বিভাগ" value={division} options={divisions} onChange={v=>{setDivision(v);setDistrict("");setUpazila("");setSchoolCode("");}}/>
          <FilterSelect label="জেলা" value={district} options={districts} disabled={!division} onChange={v=>{setDistrict(v);setUpazila("");setSchoolCode("");}}/>
          <FilterSelect label="উপজেলা" value={upazila} options={upazilas} disabled={!district} onChange={v=>{setUpazila(v);setSchoolCode("");}}/>
          <FilterSelect label="নির্দিষ্ট স্কুল" value={schoolCode} options={availableSchools.map(s=>s.schoolCode)} onChange={setSchoolCode}/>
        </div>
      </div>
      <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 md:grid-cols-2">
        <label className="relative block min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input className="field w-full pl-9" placeholder="স্কুলের নাম / EIIN / কোড খুঁজুন" value={query} onChange={e=>setQuery(e.target.value)}/></label>
        <div className="flex items-center justify-between gap-2"><span className="text-sm text-slate-600">মোট ফলাফল: <strong>{filtered.length}</strong></span><button className="secondary-button" onClick={load}><RefreshCw size={15}/> তথ্য রিফ্রেশ</button></div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-emerald-50 text-xs text-slate-600"><tr><th className="px-5 py-3">স্কুল</th><th className="px-4 py-3">বিভাগ</th><th className="px-4 py-3">জেলা</th><th className="px-4 py-3">উপজেলা</th><th className="px-4 py-3">ধরন</th><th className="px-4 py-3">হাজিরা সেশন</th><th className="px-4 py-3">সাবমিশন</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading?<tr><td colSpan="7" className="p-8 text-center text-slate-500">তথ্য লোড হচ্ছে...</td></tr>:
              filtered.length===0?<tr><td colSpan="7" className="p-8 text-center text-slate-500">নির্বাচিত ফিল্টারে কোনো অনুমোদিত স্কুল পাওয়া যায়নি।</td></tr>:
              filtered.map(s=><tr key={s._id} className="hover:bg-emerald-50/60"><td className="px-5 py-4"><div className="font-semibold text-slate-800">{s.name}</div><div className="mt-1 text-xs text-slate-500">{s.schoolCode}</div></td><td className="px-4 py-4">{s.division||"—"}</td><td className="px-4 py-4">{s.district||"—"}</td><td className="px-4 py-4">{s.upazila||"—"}</td><td className="px-4 py-4">{s.institutionType==="government"?"সরকারি":"বেসরকারি"}</td><td className="px-4 py-4">{s.sessionCount ?? 0}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.status==="submitted"?"bg-emerald-50 text-emerald-700":s.status==="in_progress"?"bg-amber-50 text-amber-700":"bg-slate-100 text-slate-600"}`}>{s.status==="submitted"?"সাবমিট":s.status==="in_progress"?"চলমান":"শুরু হয়নি"}</span><div className="mt-1 text-[11px] text-slate-500">{s.submittedCount ?? 0} সাবমিটেড</div></td></tr>)
            }
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs leading-5 text-brand-100">তথ্য কেন্দ্রীয় Monitoring API থেকে আসছে। আজকের সারাংশ Asia/Dhaka তারিখ অনুযায়ী গণনা করা হয়।</p>
    </section>
  </div>;
}
