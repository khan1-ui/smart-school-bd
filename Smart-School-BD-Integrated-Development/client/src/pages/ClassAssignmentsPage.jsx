import { useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { api } from "../lib/api";

export default function ClassAssignmentsPage() {
  const [teachers,setTeachers]=useState([]);
  const [rows,setRows]=useState([]);
  const [form,setForm]=useState({teacherId:"",className:"",section:"",academicYear:String(new Date().getFullYear())});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=async()=>{
    setError("");
    try{
      const [teacherResult,assignmentResult]=await Promise.all([api.get("/auth/teachers/active"),api.get("/assignments")]);
      const active=teacherResult.data.data.teachers||[];
      setTeachers(active);setRows(assignmentResult.data.data.assignments||[]);
      setForm(old=>({...old,teacherId:old.teacherId||active[0]?._id||""}));
    }catch(e){setError(e.userMessage||"তথ্য লোড করা যায়নি");}
  };
  useEffect(()=>{load();},[]);
  const create=async(e)=>{
    e.preventDefault();setBusy(true);setError("");setNotice("");
    try{
      await api.post("/assignments",form);
      setNotice("শিক্ষককে শ্রেণি ও শাখা বরাদ্দ করা হয়েছে।");
      setForm(old=>({...old,className:"",section:""}));await load();
    }catch(e){setError(e.response?.data?.message||e.userMessage||"বরাদ্দ করা যায়নি");}
    finally{setBusy(false);}
  };
  const revoke=async(id)=>{
    if(!window.confirm("এই শ্রেণি বরাদ্দ বাতিল করবে?"))return;
    setBusy(true);setError("");
    try{await api.delete(`/assignments/${id}`);await load();}
    catch(e){setError(e.userMessage||"বরাদ্দ বাতিল করা যায়নি");}
    finally{setBusy(false);}
  };
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2"><Users className="text-brand-700"/><h2 className="font-bold text-slate-900">শিক্ষক শ্রেণি ও শাখা বরাদ্দ</h2></div>
      <p className="mt-1 text-sm text-slate-500">শুধু অনুমোদিত শিক্ষক এবং সক্রিয় শিক্ষার্থী থাকা শ্রেণি বরাদ্দ করা যাবে।</p>
      {error&&<p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice&&<p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="sm:col-span-2 xl:col-span-1"><span className="mb-1 block text-xs font-semibold">শিক্ষক</span><select required className="field" value={form.teacherId} onChange={e=>setForm({...form,teacherId:e.target.value})}><option value="">শিক্ষক নির্বাচন</option>{teachers.map(x=><option key={x._id} value={x._id}>{x.name} · {x.designation||"শিক্ষক"}</option>)}</select></label>
        <label><span className="mb-1 block text-xs font-semibold">শ্রেণি</span><input required className="field" value={form.className} onChange={e=>setForm({...form,className:e.target.value})} placeholder="যেমন: ষষ্ঠ"/></label>
        <label><span className="mb-1 block text-xs font-semibold">শাখা</span><input className="field" value={form.section} onChange={e=>setForm({...form,section:e.target.value})} placeholder="যেমন: A"/></label>
        <label><span className="mb-1 block text-xs font-semibold">শিক্ষাবর্ষ</span><input required pattern="\d{4}(-\d{4})?" className="field" value={form.academicYear} onChange={e=>setForm({...form,academicYear:e.target.value})}/></label>
        <div className="flex items-end"><button disabled={busy||!teachers.length} className="primary-button w-full"><Plus size={15}/>{busy?"সংরক্ষণ...":"বরাদ্দ করুন"}</button></div>
      </form>
      {!teachers.length&&<p className="mt-3 text-sm text-amber-700">কোনো সক্রিয় শিক্ষক নেই। আগে শিক্ষক আবেদন অনুমোদন করতে হবে।</p>}
    </section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-slate-100 p-5"><h3 className="font-bold">বর্তমান বরাদ্দ</h3><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
      {!rows.length?<p className="p-8 text-center text-sm text-slate-500">এখনো কোনো শ্রেণি বরাদ্দ করা হয়নি।</p>:<div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">শিক্ষক</th><th className="p-3">শ্রেণি</th><th className="p-3">শাখা</th><th className="p-3">শিক্ষাবর্ষ</th><th className="p-3">কাজ</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(a=><tr key={a._id}><td className="p-3 font-semibold">{a.teacherId?.name||"—"}</td><td className="p-3">{a.className}</td><td className="p-3">{a.section||"সাধারণ"}</td><td className="p-3">{a.academicYear}</td><td className="p-3"><button disabled={busy} className="secondary-button text-rose-700" onClick={()=>revoke(a._id)}><Trash2 size={14}/> বাতিল</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
