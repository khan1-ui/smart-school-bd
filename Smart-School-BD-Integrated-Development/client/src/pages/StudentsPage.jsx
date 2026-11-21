import { useEffect, useState } from "react";
import { Plus, RefreshCw, FileCheck2, Users } from "lucide-react";
import { api } from "../lib/api";
import FaceRegistrationModal from "../components/FaceRegistrationModal";

const initial = {
  admissionNumber: "", name: "", gender: "male", dateOfBirth: "",
  className: "", section: "", rollNumber: "", academicYear: String(new Date().getFullYear()),
  guardianRelation: "father", guardianName: "", guardianPhone: "", address: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initial);
  const [consentStudent, setConsentStudent] = useState(null);
  const [consent, setConsent] = useState({ guardianName: "", relationshipToStudent: "father", evidenceReference: "", consentMethod: "paper_form" });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [faceStudent, setFaceStudent] = useState(null);
  const [faceStatuses, setFaceStatuses] = useState({});

  const load = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/students?limit=100");
      const rows = data.data.students || [];
      setStudents(rows);
      if (rows.length) {
        try {
          const ids = rows.map((student) => student._id).join(",");
          const faceResult = await api.get(`/face/status?studentIds=${encodeURIComponent(ids)}`);
          setFaceStatuses(Object.fromEntries((faceResult.data.data.statuses || []).map((item) => [item.studentId, item])));
        } catch { setFaceStatuses({}); }
      }
    } catch (err) { setError(err.userMessage || "শিক্ষার্থীর তথ্য লোড করা যায়নি"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = (key) => (e) => setForm((old) => ({ ...old, [key]: e.target.value }));

  const createStudent = async (e) => {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, rollNumber: Number(form.rollNumber), dateOfBirth: form.dateOfBirth || null };
      const { data } = await api.post("/students", payload);
      setNotice(`শিক্ষার্থী ${data.data.student.name} সফলভাবে নিবন্ধিত হয়েছে। Face Registration-এর আগে অভিভাবকের সম্মতি রেকর্ড করতে হবে।`);
      setForm(initial); setShowForm(false); await load();
    } catch (err) { setError(err.response?.data?.message || err.userMessage || "শিক্ষার্থী নিবন্ধন করা যায়নি"); }
    finally { setBusy(false); }
  };

  const promoteStudent = async (student) => {
    const className = window.prompt("নতুন শ্রেণি লিখুন:", student.className);
    if (className === null || !className.trim()) return;
    const rollText = window.prompt("নতুন রোল নম্বর লিখুন:", String(student.rollNumber));
    if (rollText === null || !/^\d+$/.test(rollText) || Number(rollText) < 1) return;
    const academicYear = window.prompt("নতুন শিক্ষাবর্ষ লিখুন (যেমন 2027):", String(new Date().getFullYear() + 1));
    if (academicYear === null || !/^\d{4}(-\d{4})?$/.test(academicYear)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.patch(`/students/${student._id}`, {
        className: className.trim(),
        rollNumber: Number(rollText),
        academicYear,
      });
      setNotice(`${student.name}-এর শ্রেণি/রোল/শিক্ষাবর্ষ আপডেট হয়েছে। Student ID অপরিবর্তিত রাখা হয়েছে।`);
      await load();
    } catch (err) { setError(err.response?.data?.message || err.userMessage || "শিক্ষার্থীর তথ্য আপডেট করা যায়নি"); }
    finally { setBusy(false); }
  };

  const createConsent = async (e) => {
    e.preventDefault(); if (!consentStudent) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/face/consent", {
        studentId: consentStudent._id,
        consentGivenBy: "guardian",
        guardianName: consent.guardianName,
        relationshipToStudent: consent.relationshipToStudent,
        consentMethod: consent.consentMethod,
        evidenceReference: consent.evidenceReference,
      });
      setNotice("অভিভাবকের সম্মতির রেকর্ড সংরক্ষিত হয়েছে। মূল স্বাক্ষরিত সম্মতিপত্র স্কুলে নিরাপদে সংরক্ষণ করতে হবে।");
      setConsentStudent(null);
      setConsent({ guardianName: "", relationshipToStudent: "father", evidenceReference: "", consentMethod: "paper_form" });
    } catch (err) { setError(err.response?.data?.message || err.userMessage || "সম্মতি রেকর্ড করা যায়নি"); }
    finally { setBusy(false); }
  };

  const openFaceRegistration = async (student) => {
    setBusy(true); setError("");
    try {
      await api.post("/face/enroll/validate", { studentId: student._id });
      setFaceStudent(student);
    } catch (err) {
      setError(err.response?.data?.message || err.userMessage || "Face Registration-এর আগে অভিভাবকের সম্মতি যাচাই করতে হবে");
    } finally { setBusy(false); }
  };

  const revokeFaceConsent = async (student) => {
    if (!window.confirm(`${student.name}-এর Face Consent প্রত্যাহার করে সংরক্ষিত Face Descriptor মুছে ফেলবে?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.patch(`/face/consent/${student._id}/revoke`);
      setNotice("সম্মতি প্রত্যাহার করা হয়েছে এবং Face Descriptor মুছে ফেলা হয়েছে।");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.userMessage || "সম্মতি প্রত্যাহার করা যায়নি"); }
    finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center">
      <div><h2 className="font-bold text-slate-900">শিক্ষার্থী নিবন্ধন ও ব্যবস্থাপনা</h2><p className="mt-1 text-sm text-slate-500">নতুন ভর্তি ও বিদ্যমান শিক্ষার্থীর তথ্য একই স্থায়ী Student ID-র অধীনে পরিচালনা করুন।</p></div>
      <div className="flex gap-2"><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button><button className="primary-button" onClick={()=>setShowForm(v=>!v)}><Plus size={16}/> নতুন শিক্ষার্থী</button></div>
    </div>

    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{notice}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">{error}</div>}

    {showForm && <form onSubmit={createStudent} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="mb-4 font-bold text-slate-900">শিক্ষার্থী ভর্তি / নিবন্ধন</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["admissionNumber","ভর্তি নম্বর"],["name","শিক্ষার্থীর নাম"],["className","শ্রেণি"],["section","শাখা"],["rollNumber","রোল"],["academicYear","শিক্ষাবর্ষ"],["guardianName","অভিভাবকের নাম"],["guardianPhone","অভিভাবকের মোবাইল"],["address","ঠিকানা"]
        ].map(([key,label])=><label key={key} className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label} *</span><input required className="field" value={form[key]} onChange={update(key)} /></label>)}
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">লিঙ্গ</span><select className="field" value={form.gender} onChange={update("gender")}><option value="male">ছেলে</option><option value="female">মেয়ে</option><option value="other">অন্যান্য</option></select></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">জন্মতারিখ</span><input type="date" className="field" value={form.dateOfBirth} onChange={update("dateOfBirth")}/></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">অভিভাবকের সম্পর্ক</span><select className="field" value={form.guardianRelation} onChange={update("guardianRelation")}><option value="father">পিতা</option><option value="mother">মাতা</option><option value="other">অন্যান্য</option></select></label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} className="primary-button"><Plus size={15}/> {busy?"সংরক্ষণ হচ্ছে...":"শিক্ষার্থী সংরক্ষণ"}</button><button type="button" className="secondary-button" onClick={()=>setShowForm(false)}>বাতিল</button></div>
    </form>}

    {consentStudent && <form onSubmit={createConsent} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-soft">
      <h3 className="font-bold text-slate-900">Face Recognition সম্মতি — {consentStudent.name}</h3>
      <p className="mt-1 text-sm leading-6 text-amber-700">শুধু প্রকৃত অভিভাবকের স্বাক্ষরিত সম্মতি পাওয়ার পর এই তথ্য দিন। কেবল রেফারেন্স নম্বর লিখলেই সম্মতি তৈরি হয় না; মূল নথি স্কুলে যাচাই ও সংরক্ষণ করতে হবে।</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5"><span className="text-sm font-semibold">অভিভাবকের নাম *</span><input required className="field" value={consent.guardianName} onChange={e=>setConsent(o=>({...o,guardianName:e.target.value}))}/></label>
        <label className="block space-y-1.5"><span className="text-sm font-semibold">সম্পর্ক *</span><select className="field" value={consent.relationshipToStudent} onChange={e=>setConsent(o=>({...o,relationshipToStudent:e.target.value}))}><option value="father">পিতা</option><option value="mother">মাতা</option><option value="guardian">আইনগত অভিভাবক</option></select></label>
        <label className="block space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">স্বাক্ষরিত সম্মতিপত্রের রেফারেন্স *</span><input required className="field" value={consent.evidenceReference} onChange={e=>setConsent(o=>({...o,evidenceReference:e.target.value}))} placeholder="যেমন: CONSENT-2026-001"/></label>
      </div>
      <div className="mt-4 flex gap-2"><button disabled={busy} className="primary-button"><FileCheck2 size={15}/> সম্মতি রেকর্ড করুন</button><button type="button" className="secondary-button" onClick={()=>setConsentStudent(null)}>বাতিল</button></div>
    </form>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-slate-100 p-5"><Users size={19} className="text-brand-700"/><h3 className="font-bold text-slate-900">নিবন্ধিত শিক্ষার্থী</h3><span className="ml-auto text-xs text-slate-500">{students.length} জন</span></div>
      {loading ? <p className="p-8 text-center text-sm text-slate-500">লোড হচ্ছে...</p> : students.length===0 ? <p className="p-8 text-center text-sm text-slate-500">এখনো কোনো শিক্ষার্থী নিবন্ধিত হয়নি।</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">নাম</th><th className="p-3">ভর্তি নম্বর</th><th className="p-3">শ্রেণি / রোল</th><th className="p-3">শিক্ষাবর্ষ</th><th className="p-3">অভিভাবক</th><th className="p-3">Face Status</th><th className="p-3">কাজ</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map(student=><tr key={student._id}><td className="p-3 font-semibold">{student.name}</td><td className="p-3">{student.admissionNumber}</td><td className="p-3">{student.className} / {student.rollNumber}</td><td className="p-3">{student.academicYear}</td><td className="p-3">{student.guardianName}<div className="text-xs text-slate-500">{student.guardianPhone}</div></td><td className="p-3"><div className="flex flex-col gap-1"><span className={`text-xs font-semibold ${faceStatuses[student._id]?.enrollmentStatus === "active" ? "text-emerald-700" : "text-amber-700"}`}>{faceStatuses[student._id]?.enrollmentStatus === "active" ? "Face Registered" : "Not Registered"}</span><span className="text-[11px] text-slate-500">Consent: {faceStatuses[student._id]?.consentStatus === "granted" ? "Granted" : faceStatuses[student._id]?.consentStatus === "revoked" ? "Revoked" : "Not recorded"}</span><button disabled={faceStatuses[student._id]?.consentStatus === "granted"} className="secondary-button w-fit" onClick={()=>{setConsentStudent(student);setConsent({guardianName:student.guardianName||"",relationshipToStudent:student.guardianRelation||"father",evidenceReference:"",consentMethod:"paper_form"});}}>{faceStatuses[student._id]?.consentStatus === "revoked" ? "নতুন সম্মতি" : "সম্মতি রেকর্ড"}</button></div></td><td className="p-3"><div className="flex flex-wrap gap-2"><button disabled={busy || faceStatuses[student._id]?.enrollmentStatus === "active"} className="secondary-button" onClick={()=>openFaceRegistration(student)}>Face Registration</button>{faceStatuses[student._id]?.consentStatus === "granted" && <button disabled={busy} className="secondary-button text-rose-700" onClick={()=>revokeFaceConsent(student)}>Consent প্রত্যাহার</button>}<button disabled={busy} className="secondary-button" onClick={()=>promoteStudent(student)}>শ্রেণি উন্নীত</button></div></td></tr>)}</tbody></table></div>}
    </section>
    {faceStudent && <FaceRegistrationModal student={faceStudent} onClose={()=>setFaceStudent(null)} onComplete={async()=>{setFaceStudent(null);setNotice("শিক্ষার্থীর Face Registration সম্পন্ন হয়েছে।");await load();}} />}
  </div>;
}
