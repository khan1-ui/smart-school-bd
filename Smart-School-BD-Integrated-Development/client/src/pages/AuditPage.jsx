import { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";

const labels={
  teacher_class_assigned:"শিক্ষককে শ্রেণি বরাদ্দ",
  teacher_class_assignment_revoked:"শ্রেণি বরাদ্দ বাতিল",
  student_face_enrolled:"শিক্ষার্থীর Face Registration",
  student_face_consent_revoked:"Face Consent প্রত্যাহার",
  attendance_recorded:"হাজিরা রেকর্ড",
  face_attendance_recorded:"Face Attendance রেকর্ড",
  daily_attendance_submitted:"দৈনিক হাজিরা সাবমিট",
};
export default function AuditPage({central=false}){
  const [events,setEvents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=async()=>{
    setLoading(true);setError("");
    try{
      const r=await api.get(central?"/central/audit":"/audit",{params:{limit:50}});
      setEvents(r.data.data.events||[]);
    }catch(e){setError(e.userMessage||"Audit Log লোড করা যায়নি");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[central]);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><div><div className="flex items-center gap-2"><ShieldCheck className="text-brand-700"/><h2 className="font-bold">সিস্টেম Audit Log</h2></div><p className="mt-1 text-xs text-slate-500">গুরুত্বপূর্ণ কার্যক্রমের সময়, ব্যবহারকারী ও রেফারেন্স</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
    {error&&<p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading?<p className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে...</p>:!events.length?<p className="p-8 text-center text-sm text-slate-500">এখনো কোনো Audit Event নেই।</p>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">সময়</th>{central&&<th className="p-3">স্কুল</th>}<th className="p-3">কার্যক্রম</th><th className="p-3">ব্যবহারকারী</th><th className="p-3">বিস্তারিত</th></tr></thead><tbody className="divide-y divide-slate-100">{events.map(e=><tr key={e._id}><td className="p-3 whitespace-nowrap">{new Date(e.createdAt).toLocaleString("bn-BD",{timeZone:"Asia/Dhaka"})}</td>{central&&<td className="p-3">{e.schoolId?.name||"—"}<div className="text-xs text-slate-500">{e.schoolId?.schoolCode||""}</div></td>}<td className="p-3 font-semibold">{labels[e.action]||e.action}</td><td className="p-3">{e.actorId?.name||"—"}<div className="text-xs text-slate-500">{e.actorRole}</div></td><td className="p-3 text-xs text-slate-600">{Object.entries(e.metadata||{}).map(([k,v])=>`${k}: ${String(v)}`).join(" · ")||e.entityType}</td></tr>)}</tbody></table></div>}
    <p className="border-t border-slate-100 p-3 text-xs text-amber-700">এই Audit Log অ্যাপ্লিকেশন-স্তরের append-only record। এটি একা cryptographic tamper-proof নয়; production-এ পৃথক immutable storage/backup ও database access control প্রয়োজন।</p>
  </section>;
}
