import { Activity, BookOpenCheck, ChevronDown, GraduationCap, LayoutDashboard, LogOut, Menu, School, Settings2, ShieldCheck, Users, X, ClipboardCheck, UserCog } from "lucide-react";

const links = [
  { id: "central", label: "কেন্দ্রীয় মনিটরিং", icon: Activity, roles: ["central"] },
  { id: "school", label: "স্কুল ড্যাশবোর্ড", icon: LayoutDashboard, roles: ["admin"] },
  { id: "teacherApplications", label: "শিক্ষক আবেদন", icon: Users, roles: ["admin"] },
  { id: "assignments", label: "শ্রেণি বরাদ্দ", icon: UserCog, roles: ["admin"] },
  { id: "verification", label: "দৈনিক হাজিরা যাচাই", icon: ClipboardCheck, roles: ["admin"] },
  { id: "schoolApplications", label: "স্কুল আবেদন", icon: School, roles: ["central"] },
  { id: "attendance", label: "হাজিরা নেওয়া", icon: BookOpenCheck, roles: ["teacher"] },
  { id: "students", label: "শিক্ষার্থী ভর্তি ও নিবন্ধন", icon: Users, roles: ["admin"] },
  { id: "reports", label: "রিপোর্ট ও অডিট", icon: ShieldCheck, roles: ["central", "admin"] },
];

export default function Sidebar({ role, page, setPage, open, setOpen }) {
  const visible = links.filter((item) => item.roles.includes(role));
  return (
    <>
      {open && <button aria-label="মেনু বন্ধ করো" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-slate-200 border-t-4 border-t-flag-red bg-white transition-transform lg:static lg:z-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white"><GraduationCap size={23} /><span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-flag-red" /></div>
            <div><div className="font-bold text-slate-900">Smart School BD</div><div className="text-[11px] text-slate-500">ডিজিটাল হাজিরা ব্যবস্থা</div></div>
          </div>
          <button onClick={() => setOpen(false)} className="icon-button lg:hidden" aria-label="বন্ধ করো"><X size={18} /></button>
        </div>
        <div className="px-4 pt-5">
          <div className="rounded-xl bg-brand-50 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-700"><span className="h-2 w-2 rounded-full bg-brand-600" /> স্কুল WORKSPACE</div>
            <div className="mt-1 text-xs leading-5 text-slate-600">অনুমোদিত অ্যাকাউন্টের কার্যক্ষেত্র</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">প্রধান মেনু</p>
          {visible.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => { setPage(item.id); setOpen(false); }} className={`nav-item ${page === item.id ? "nav-item-active" : ""}`}><Icon size={19} /><span>{item.label}</span></button>;
          })}
          <div className="px-3 pt-7 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">সিস্টেম</div>
          <button onClick={() => setPage("settings")} className={`nav-item ${page === "settings" ? "nav-item-active" : ""}`}><Settings2 size={19} /><span>সেটিংস (প্রিভিউ)</span></button>
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{role === "central" ? "ক" : role === "teacher" ? "শি" : "প্র"}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-slate-800">{role === "central" ? "কেন্দ্রীয় কর্মকর্তা" : role === "teacher" ? "শিক্ষক" : "প্রধান শিক্ষক"}</div><div className="text-xs text-slate-500">সুরক্ষিত অ্যাকাউন্ট</div></div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
          
        </div>
      </aside>
    </>
  );
}