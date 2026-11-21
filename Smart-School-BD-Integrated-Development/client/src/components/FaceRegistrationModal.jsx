import { useState } from "react";
import { X, ShieldCheck, ScanFace } from "lucide-react";
import { api } from "../lib/api";
import FaceCamera from "./FaceCamera";

const distance = (a, b) => Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));

export default function FaceRegistrationModal({ student, onClose, onComplete }) {
  const [captures, setCaptures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const capture = async (descriptor) => {
    if (captures.length >= 3) throw new Error("তিনটি Face Capture সম্পন্ন হয়েছে। এখন সংরক্ষণ করো।");
    setError(""); setNotice("");
    if (captures.length && distance(captures[0], descriptor) > 0.58) {
      setCaptures([]);
      throw new Error("তিনটি Capture-এ মুখের মিল পাওয়া যায়নি। একই আলো ও অবস্থানে আবার শুরু করো।");
    }
    const next = [...captures, descriptor];
    setCaptures(next);
    setNotice(`${next.length}/3 Face Capture সম্পন্ন`);
  };

  const save = async () => {
    if (captures.length !== 3) return;
    setBusy(true); setError("");
    try {
      const validation = await api.post("/face/enroll/validate", { studentId: student._id });
      if (!validation.data?.data?.enrollmentAllowed) throw new Error("Face Registration-এর অনুমতি পাওয়া যায়নি");
      const averaged = captures[0].map((_, i) => captures.reduce((sum, item) => sum + item[i], 0) / captures.length);
      await api.post("/face/enroll", { studentId: student._id, descriptor: averaged });
      setNotice("Face Registration সফল হয়েছে");
      onComplete?.();
    } catch (e) { setError(e.response?.data?.message || e.userMessage || e.message || "Face Registration ব্যর্থ হয়েছে"); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6">
    <div className="my-auto w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2 text-brand-700"><ScanFace size={20}/><span className="text-sm font-bold">Face Registration</span></div><h2 className="mt-1 text-lg font-bold">{student.name}</h2><p className="text-xs text-slate-500">{student.admissionNumber} · {student.className} / {student.section || "—"}</p></div>
        <button onClick={onClose} className="icon-button" aria-label="বন্ধ করুন"><X size={18}/></button>
      </div>
      <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldCheck size={15} className="mr-1 inline"/> Face Registration-এর আগে অভিভাবকের প্রকৃত লিখিত সম্মতি যাচাই করতে হবে। Descriptor-ও সংবেদনশীল বায়োমেট্রিক তথ্য।</div>
      <FaceCamera onCapture={capture} buttonLabel={`Capture ${captures.length + 1}/3`} />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm text-slate-600">Capture: <strong>{captures.length}/3</strong></span>
        <button disabled={captures.length !== 3 || busy} onClick={save} className="primary-button"><ShieldCheck size={16}/>{busy ? "সংরক্ষণ হচ্ছে..." : "Face Registration সংরক্ষণ"}</button>
      </div>
      {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    </div>
  </div>;
}
