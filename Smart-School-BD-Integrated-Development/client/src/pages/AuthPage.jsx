import { useState } from "react";
import { GraduationCap, ShieldCheck, Building2, UserRoundPlus, LogIn, LoaderCircle } from "lucide-react";
import { api } from "../lib/api";

const initialSchool = {
  name: "", schoolCode: "", institutionType: "government", address: "",
  division: "", district: "", upazila: "", principalName: "",
  principalDesignation: "প্রধান শিক্ষক", principalIndexNumber: "",
  principalEmail: "", principalPhone: "", password: "", contactPhone: "", contactEmail: "",
};
const initialTeacher = {
  schoolCode: "", name: "", designation: "", indexNumber: "", teacherCode: "",
  email: "", phone: "", password: "",
};

function Field({ label, value, onChange, type = "text", required = true, placeholder = "" }) {
  return <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">{label}{required ? " *" : ""}</span><input className="field" type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} /></label>;
}

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [centralOffice, setCentralOffice] = useState(false);
  const [login, setLogin] = useState({ schoolCode: "", email: "", password: "" });
  const [school, setSchool] = useState(initialSchool);
  const [teacher, setTeacher] = useState(initialTeacher);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", { ...login, centralOffice });
        sessionStorage.setItem("ssbd_access_token", data.data.accessToken);
        onLogin(data.data.user);
      } else if (mode === "school") {
        const { data } = await api.post("/schools/register", school);
        setMessage(data.message);
        setSchool(initialSchool);
      } else {
        const { data } = await api.post("/auth/teacher-register", teacher);
        setMessage(data.message);
        setTeacher(initialTeacher);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.userMessage || "অনুরোধ সম্পন্ন করা যায়নি।");
    } finally { setBusy(false); }
  };

  const update = (setter, key) => (event) => setter((old) => ({ ...old, [key]: event.target.value }));
  const title = mode === "login" ? "নিরাপদ লগইন" : mode === "school" ? "স্কুল নিবন্ধনের আবেদন" : "শিক্ষক নিবন্ধনের আবেদন";

  return <div className="min-h-screen border-t-4 border-flag-red bg-[#f4f8f5] px-4 py-8">
    <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
      <div className="flex items-center gap-3 bg-brand-700 px-6 py-6 text-white">
        <div className="rounded-xl bg-white/15 p-3"><GraduationCap size={28}/></div>
        <div><h1 className="text-xl font-bold">Smart School BD</h1><p className="mt-1 text-sm text-brand-100">ডিজিটাল হাজিরা ও তদারকি ব্যবস্থা</p></div>
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <div><h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">সহকারী শিক্ষক ও প্রধান শিক্ষক স্কুল কোড ব্যবহার করবেন। কেন্দ্রীয় কর্মকর্তা কেন্দ্রীয় অ্যাকাউন্ট দিয়ে লগইন করবেন।</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {setMode("login");setMessage("");setError("");}} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode==="login"?"bg-brand-700 text-white":"bg-slate-100 text-slate-700"}`}>লগইন</button>
          <button type="button" onClick={() => {setMode("school");setMessage("");setError("");}} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode==="school"?"bg-brand-700 text-white":"bg-slate-100 text-slate-700"}`}>স্কুল নিবন্ধন</button>
          <button type="button" onClick={() => {setMode("teacher");setMessage("");setError("");}} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode==="teacher"?"bg-brand-700 text-white":"bg-slate-100 text-slate-700"}`}>শিক্ষক আবেদন</button>
        </div>

        {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">{message}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          {mode === "login" && <>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={centralOffice} onChange={(e)=>setCentralOffice(e.target.checked)}/> মন্ত্রণালয় / ডিজি অফিস অ্যাকাউন্ট</label>
            {!centralOffice && <Field label="স্কুল কোড" value={login.schoolCode} onChange={update(setLogin,"schoolCode")} placeholder="যেমন: 109871"/>}
            <Field label="ইমেইল" type="email" value={login.email} onChange={update(setLogin,"email")} placeholder="name@example.com"/>
            <Field label="পাসওয়ার্ড" type="password" value={login.password} onChange={update(setLogin,"password")}/>
          </>}

          {mode === "school" && <>
            <div className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">স্কুল ও প্রধান শিক্ষকের তথ্য একবারে জমা হবে। কেন্দ্রীয় অফিস অনুমোদন করলে প্রধান শিক্ষক লগইন করতে পারবেন।</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="প্রতিষ্ঠানের নাম" value={school.name} onChange={update(setSchool,"name")}/>
              <Field label="EIIN / স্কুল কোড" value={school.schoolCode} onChange={update(setSchool,"schoolCode")}/>
              <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-700">প্রতিষ্ঠানের ধরন *</span><select className="field" value={school.institutionType} onChange={update(setSchool,"institutionType")}><option value="government">সরকারি</option><option value="private">বেসরকারি</option></select></label>
              <Field label="ঠিকানা" value={school.address} onChange={update(setSchool,"address")}/>
              <Field label="বিভাগ" value={school.division} onChange={update(setSchool,"division")} placeholder="ময়মনসিংহ"/>
              <Field label="জেলা" value={school.district} onChange={update(setSchool,"district")} placeholder="জামালপুর"/>
              <Field label="উপজেলা" value={school.upazila} onChange={update(setSchool,"upazila")} placeholder="জামালপুর সদর"/>
              <Field label="প্রধান শিক্ষকের নাম" value={school.principalName} onChange={update(setSchool,"principalName")}/>
              <Field label="প্রধান শিক্ষকের পদবী" value={school.principalDesignation} onChange={update(setSchool,"principalDesignation")}/>
              <Field label="ইনডেক্স নম্বর" required={false} value={school.principalIndexNumber} onChange={update(setSchool,"principalIndexNumber")}/>
              <Field label="প্রধান শিক্ষকের ইমেইল" type="email" value={school.principalEmail} onChange={update(setSchool,"principalEmail")}/>
              <Field label="মোবাইল নম্বর" value={school.principalPhone} onChange={update(setSchool,"principalPhone")}/>
              <Field label="পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)" type="password" value={school.password} onChange={update(setSchool,"password")}/>
              <Field label="প্রতিষ্ঠানের ফোন" required={false} value={school.contactPhone} onChange={update(setSchool,"contactPhone")}/>
              <Field label="প্রতিষ্ঠানের ইমেইল" type="email" required={false} value={school.contactEmail} onChange={update(setSchool,"contactEmail")}/>
            </div>
          </>}

          {mode === "teacher" && <>
            <div className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800">শিক্ষক আবেদন জমা দেওয়ার পর প্রধান শিক্ষক যাচাই করে অনুমোদন করবেন। প্রতি স্কুলে সর্বোচ্চ ১০টি সক্রিয় ও অপেক্ষমাণ শিক্ষক অ্যাকাউন্টের সীমা থাকবে।</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="স্কুল কোড" value={teacher.schoolCode} onChange={update(setTeacher,"schoolCode")}/>
              <Field label="শিক্ষকের পূর্ণ নাম" value={teacher.name} onChange={update(setTeacher,"name")}/>
              <Field label="পদবী" value={teacher.designation} onChange={update(setTeacher,"designation")}/>
              <Field label="ইনডেক্স নম্বর" required={false} value={teacher.indexNumber} onChange={update(setTeacher,"indexNumber")}/>
              <Field label="শিক্ষক কোড" required={false} value={teacher.teacherCode} onChange={update(setTeacher,"teacherCode")}/>
              <Field label="ইমেইল" type="email" value={teacher.email} onChange={update(setTeacher,"email")}/>
              <Field label="মোবাইল নম্বর" value={teacher.phone} onChange={update(setTeacher,"phone")}/>
              <Field label="পাসওয়ার্ড (কমপক্ষে ১২ অক্ষর)" type="password" value={teacher.password} onChange={update(setTeacher,"password")}/>
            </div>
            <p className="text-xs text-slate-500">ইনডেক্স নম্বর অথবা শিক্ষক কোডের অন্তত একটি দিতে হবে।</p>
          </>}

          <button disabled={busy} className="primary-button w-full justify-center py-3 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? <LoaderCircle size={17} className="animate-spin"/> : mode==="login" ? <LogIn size={17}/> : <UserRoundPlus size={17}/>}
            {busy ? "অপেক্ষা করুন..." : mode==="login" ? "লগইন" : "আবেদন জমা দিন"}
          </button>
        </form>
        <div className="flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> স্কুল ও শিক্ষক অ্যাকাউন্ট অনুমোদন ছাড়া সক্রিয় হবে না। কোনো Demo Role Selector দিয়ে প্রকৃত অনুমতি নির্ধারিত হয় না।</div>
      </div>
    </div>
  </div>;
}
