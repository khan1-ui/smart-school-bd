import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { api } from "../lib/api";

export default function SchoolApplicationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { const { data } = await api.get("/schools/pending"); setItems(data.data.schools || []); }
    catch (err) { setError(err.userMessage || "স্কুল আবেদন লোড করা যায়নি"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, decision) => {
    let reason = "";
    if (decision === "reject") {
      reason = window.prompt("স্কুল আবেদন প্রত্যাখ্যানের কারণ লিখুন:") || "";
      if (!reason.trim()) return;
    }
    setBusyId(id);
    try { await api.patch(`/schools/${id}/review`, { decision, reason }); await load(); }
    catch (err) { setError(err.userMessage || "স্কুল আবেদন আপডেট করা যায়নি"); }
    finally { setBusyId(""); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">নতুন স্কুল নিবন্ধনের আবেদন</h2><p className="mt-1 text-sm text-slate-500">কেন্দ্রীয় কর্মকর্তা স্কুল ও প্রধান শিক্ষকের তথ্য যাচাই করে অনুমোদন করবেন।</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-slate-500">লোড হচ্ছে...</p> : items.length===0 ? <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">কোনো অপেক্ষমাণ স্কুল আবেদন নেই।</p> :
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">স্কুল</th><th className="p-3">স্কুল কোড</th><th className="p-3">এলাকা</th><th className="p-3">প্রধান শিক্ষক</th><th className="p-3">কাজ</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item=><tr key={item._id}><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.schoolCode}</td><td className="p-3">{[item.division,item.district,item.upazila].filter(Boolean).join(" · ")}</td><td className="p-3">{item.principalName}<div className="text-xs text-slate-500">{item.principalDesignation} · {item.principalIndexNumber || "ইনডেক্স নেই"}</div></td><td className="p-3"><div className="flex gap-2"><button disabled={busyId===item._id} onClick={()=>review(item._id,"approve")} className="secondary-button text-emerald-700"><Check size={14}/> অনুমোদন</button><button disabled={busyId===item._id} onClick={()=>review(item._id,"reject")} className="secondary-button text-rose-700"><X size={14}/> প্রত্যাখ্যান</button></div></td></tr>)}</tbody></table></div>}
  </section>;
}
