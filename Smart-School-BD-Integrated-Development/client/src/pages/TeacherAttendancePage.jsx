import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, RefreshCw, Users, CalendarCheck } from "lucide-react";
import { api } from "../lib/api";
import FaceCamera from "../components/FaceCamera";

const dhakaDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

export default function TeacherAttendancePage() {
  const [assignments, setAssignments] = useState([]);
  const [selected, setSelected] = useState("");
  const [students, setStudents] = useState([]);
  const [marked, setMarked] = useState({});
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [candidate, setCandidate] = useState(null);
  const date = dhakaDate();

  const current = useMemo(() => assignments.find((a) => a._id === selected), [assignments, selected]);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const result = await api.get("/assignments");
      const rows = result.data.data.assignments || [];
      setAssignments(rows);
      if (!selected && rows.length) setSelected(rows[0]._id);
    } catch (e) { setError(e.userMessage || "বরাদ্দকৃত শ্রেণি লোড করা যায়নি"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const startClass = async () => {
    if (!current) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const studentResult = await api.get(`/students?limit=200&className=${encodeURIComponent(current.className)}&status=active`);
      const rows = (studentResult.data.data.students || []).filter((s) =>
        s.section === current.section && s.academicYear === current.academicYear
      );
      if (!rows.length) throw new Error("এই শ্রেণি ও শাখায় সক্রিয় শিক্ষার্থী পাওয়া যায়নি");
      let foundSession = null;
      try {
        const sessionResult = await api.get(`/attendance/sessions?date=${date}`);
        foundSession = (sessionResult.data.data.sessions || []).find((s) =>
          s.className === current.className && s.section === current.section && s.academicYear === current.academicYear
        );
      } catch { /* no prior session */ }
      if (!foundSession) {
        const created = await api.post("/attendance/sessions", {
          className: current.className, section: current.section,
          academicYear: current.academicYear, date,
        });
        foundSession = created.data.data.session;
      }
      const report = await api.get("/attendance/report", { params: {
        className: current.className, section: current.section,
        academicYear: current.academicYear, date,
      }});
      const statuses = {};
      (report.data.data.students || []).forEach((s) => {
        if (s.attendanceStatus !== "not_marked") statuses[s._id] = s.attendanceStatus;
      });
      setStudents(rows); setMarked(statuses); setSession(foundSession);
      setCameraOpen(true);
      setNotice(`আজকের হাজিরা সেশন প্রস্তুত। ${rows.length} জন শিক্ষার্থী তালিকাভুক্ত।`);
    } catch (e) { setError(e.response?.data?.message || e.userMessage || e.message || "হাজিরা সেশন শুরু করা যায়নি"); }
    finally { setBusy(false); }
  };

  const identifyFace = async (descriptor) => {
    if (!current || !session) return;
    setBusy(true); setError(""); setNotice(""); setCandidate(null);
    try {
      const result = await api.post("/face/identify", { descriptor });
      const student = result.data.data.student;
      if (student.className !== current.className ||
          String(student.section || "").trim().toUpperCase() !== String(current.section || "").trim().toUpperCase() ||
          student.academicYear !== current.academicYear) {
        throw new Error("শনাক্ত শিক্ষার্থী নির্বাচিত শ্রেণি/শাখার নয়");
      }
      setCandidate({ student, descriptor, distance: result.data.data.distance });
      setNotice("সম্ভাব্য শিক্ষার্থী শনাক্ত হয়েছে। হাজিরা দেওয়ার আগে পরিচয় নিশ্চিত করো।");
    } catch (e) {
      setError(e.response?.data?.message || e.userMessage || e.message || "Face শনাক্ত করা যায়নি");
    } finally { setBusy(false); }
  };

  const confirmFaceAttendance = async () => {
    if (!candidate || !current) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api.post("/attendance/face", {
        descriptor: candidate.descriptor, className: current.className,
        section: current.section, academicYear: current.academicYear,
      });
      const student = result.data.data.student;
      setMarked((old) => ({ ...old, [student.id]: "present" }));
      setCandidate(null);
      setNotice(`${student.name} — শিক্ষক পরিচয় নিশ্চিত করে উপস্থিতি রেকর্ড করেছেন`);
    } catch (e) {
      setError(e.response?.data?.message || e.userMessage || "হাজিরা রেকর্ড করা যায়নি");
    } finally { setBusy(false); }
  };

  const markManual = async (student, status) => {
    if (!session) return;
    const reason = window.prompt(status === "absent" ? "অনুপস্থিতির কারণ/যাচাই নোট লিখুন:" : "Face scan সম্ভব না হলে ম্যানুয়ালি উপস্থিতির কারণ লিখুন:");
    if (!reason || reason.trim().length < 5) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.post("/attendance", { studentId: student._id, date, status, remark: reason.trim() });
      setMarked((old) => ({ ...old, [student._id]: status }));
      setNotice(`${student.name}-এর ${status === "absent" ? "অনুপস্থিতি" : "ম্যানুয়াল উপস্থিতি"} রেকর্ড করা হয়েছে`);
    } catch (e) { setError(e.response?.data?.message || e.userMessage || "ম্যানুয়াল হাজিরা রেকর্ড করা যায়নি"); }
    finally { setBusy(false); }
  };

  const summary = useMemo(() => ({
    present: Object.values(marked).filter((v) => v === "present" || v === "late").length,
    absent: Object.values(marked).filter((v) => v === "absent").length,
    remaining: Math.max(0, students.length - Object.keys(marked).length),
  }), [marked, students]);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">শ্রেণিভিত্তিক Face Attendance</h2><p className="mt-1 text-sm text-slate-500">প্রধান শিক্ষক কর্তৃক বরাদ্দকৃত শ্রেণি ও শাখার হাজিরা নাও।</p></div><button className="secondary-button" onClick={load}><RefreshCw size={15}/> রিফ্রেশ</button></div>
      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">বরাদ্দকৃত শ্রেণি / শাখা</span><select className="field" value={selected} onChange={(e)=>{setSelected(e.target.value);setSession(null);setStudents([]);setMarked({});setCameraOpen(false);}} disabled={loading || !assignments.length}><option value="">শ্রেণি নির্বাচন করুন</option>{assignments.map((a)=><option key={a._id} value={a._id}>{a.className} · {a.section || "সাধারণ"} · {a.academicYear}</option>)}</select></label>
        <div className="flex items-end"><button className="primary-button" disabled={!current || busy} onClick={startClass}><CalendarCheck size={16}/>{busy ? "প্রস্তুত হচ্ছে..." : "আজকের হাজিরা শুরু"}</button></div>
      </div>
      {!loading && !assignments.length && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">তোমাকে এখনো কোনো শ্রেণি বা শাখা বরাদ্দ করা হয়নি। প্রধান শিক্ষকের সঙ্গে যোগাযোগ করো।</p>}
    </section>

    {session && <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900">{current?.className} · {current?.section || "সাধারণ"}</h3><p className="text-xs text-slate-500">তারিখ: {date} · শিক্ষাবর্ষ: {current?.academicYear}</p></div><div className="flex gap-2 text-xs"><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">উপস্থিত {summary.present}</span><span className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">অনুপস্থিত {summary.absent}</span><span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">বাকি {summary.remaining}</span></div></div>
      {cameraOpen && session.status === "in_progress" && <FaceCamera onCapture={identifyFace} buttonLabel="Face শনাক্ত করো" />}
      {candidate && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="font-bold text-emerald-900">সম্ভাব্য শিক্ষার্থী: {candidate.student.name}</div><p className="mt-1 text-xs text-emerald-800">ভর্তি নম্বর: {candidate.student.admissionNumber} · রোল: {candidate.student.rollNumber} · মিলের দূরত্ব: {candidate.distance}</p><p className="mt-2 text-xs text-amber-800">ক্যামেরার ফলাফল একা যথেষ্ট নয়। সামনে থাকা শিক্ষার্থীর পরিচয় নিজে নিশ্চিত করো।</p><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} className="primary-button" onClick={confirmFaceAttendance}><CheckCircle2 size={15}/> পরিচয় নিশ্চিত ও হাজিরা রেকর্ড</button><button disabled={busy} className="secondary-button" onClick={()=>setCandidate(null)}>মিলটি বাতিল</button></div></div>}
      <div className="flex items-center gap-2"><Users size={18} className="text-brand-700"/><h3 className="font-bold text-slate-900">শিক্ষার্থীর তালিকা</h3><span className="ml-auto text-xs text-slate-500">{students.length} জন</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">রোল</th><th className="p-3">শিক্ষার্থী</th><th className="p-3">ভর্তি নম্বর</th><th className="p-3">অবস্থা</th><th className="p-3">কাজ</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((s)=><tr key={s._id}><td className="p-3">{s.rollNumber}</td><td className="p-3 font-semibold">{s.name}</td><td className="p-3">{s.admissionNumber}</td><td className="p-3">{marked[s._id] === "present" ? <span className="text-emerald-700">উপস্থিত</span> : marked[s._id] === "absent" ? <span className="text-rose-700">অনুপস্থিত</span> : <span className="text-amber-700">অপেক্ষমাণ</span>}</td><td className="p-3">{!marked[s._id] && session.status === "in_progress" && <div className="flex flex-wrap gap-2"><button disabled={busy} className="secondary-button" onClick={()=>markManual(s,"absent")}>অনুপস্থিত</button><button disabled={busy} className="secondary-button" onClick={()=>markManual(s,"present")}>ম্যানুয়ালি উপস্থিত</button></div>}</td></tr>)}</tbody></table></div>
      <p className="text-xs leading-5 text-amber-700">Face Match ভুল হতে পারে। প্রতিটি শনাক্তকরণের পর শিক্ষককে শিক্ষার্থীর পরিচয় নিশ্চিত করতে হবে। বর্তমান সংস্করণে server-verified Liveness/PAD সম্পন্ন নয়; ছবি/ভিডিও spoofing প্রতিরোধের স্বতন্ত্র পরীক্ষা ছাড়া Production-এ ব্যবহার করা যাবে না।</p>
    </section>}
  </div>;
}
