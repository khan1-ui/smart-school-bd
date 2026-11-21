import { useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { api } from "../lib/api";

export default function TeacherApplicationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/auth/teachers/pending");
      setItems(data.data.teachers || []);
    } catch (err) { setError(err.userMessage || "আবেদন লোড করা যায়নি"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (id, decision) => {
    let reason = "";
    if (decision === "reject") {
      reason = window.prompt("আবেদন প্রত্যাখ্যানের কারণ লিখুন:") || "";
      if (!reason.trim()) return;
    }
    setBusyId(id);
    try {
      await api.patch(`/auth/teachers/${id}/review`, { decision, reason });
      await load();
    } catch (err) { setError(err.userMessage || "আবেদন আপডেট করা যায়নি"); }
    finally { setBusyId(""); }
  };

  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">শিক্ষক নিবন্ধনের আবেদন</h2><p className="mt-1 text-sm text-slate-500">প্রধান শিক্ষক আবেদন যাচাই করে অনুমোদন করবেন · সর্বোচ্চ ১০টি শিক্ষক অ্যাকাউন্ট</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p className="py-8 text-center text-sm text-slate-500">লোড হচ্ছে...</p> : items.length===0 ? <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">কোনো অপেক্ষমাণ শিক্ষক আবেদন নেই।</p> :
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">নাম</th><th className="p-3">পদবী</th><th className="p-3">ইনডেক্স / কোড</th><th className="p-3">ইমেইল</th><th className="p-3">কাজ</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map(item=><tr key={item._id}><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.designation}</td><td className="p-3">{item.indexNumber || item.teacherCode || "—"}</td><td className="p-3">{item.email}</td><td className="p-3"><div className="flex gap-2"><button disabled={busyId===item._id} onClick={()=>review(item._id,"approve")} className="secondary-button text-emerald-700"><Check size={14}/> অনুমোদন</button><button disabled={busyId===item._id} onClick={()=>review(item._id,"reject")} className="secondary-button text-rose-700"><X size={14}/> প্রত্যাখ্যান</button></div></td></tr>)}</tbody></table></div>}
  </section>;
}
