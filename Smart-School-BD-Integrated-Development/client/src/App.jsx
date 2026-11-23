import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { CalendarDays, Menu, ShieldCheck, Wifi, LogOut } from "lucide-react";
import Sidebar from "./components/Sidebar";
import CentralDashboard from "./pages/CentralDashboard";
import SchoolDashboard from "./pages/SchoolDashboard";
import PlaceholderPage from "./pages/PlaceholderPage";
import AuthPage from "./pages/AuthPage";
import TeacherApplicationsPage from "./pages/TeacherApplicationsPage";
import SchoolApplicationsPage from "./pages/SchoolApplicationsPage";
import StudentsPage from "./pages/StudentsPage";
import TeacherAttendancePage from "./pages/TeacherAttendancePage";
import ClassAssignmentsPage from "./pages/ClassAssignmentsPage";
import PrincipalVerificationPage from "./pages/PrincipalVerificationPage";
import AuditPage from "./pages/AuditPage";

const pageTitles = {
  central: ["কেন্দ্রীয় মনিটরিং", "স্কুলভিত্তিক হাজিরা ও ব্যতিক্রম পর্যবেক্ষণ"],
  school: ["স্কুল ড্যাশবোর্ড", "দৈনিক হাজিরা ও শিক্ষক অনুমোদন"],
  attendance: ["হাজিরা নেওয়া", "মোবাইল-উপযোগী শ্রেণিভিত্তিক হাজিরা"],
  students: ["শিক্ষার্থী", "শিক্ষার্থী ভর্তি, নিবন্ধন ও অভিভাবক সম্মতি"],
  reports: ["রিপোর্ট ও অডিট", "অনুমোদন, সংশোধন ও কার্যক্রমের ইতিহাস"],
  settings: ["সেটিংস", "সিস্টেম কনফিগারেশন"],
  teacherApplications: ["শিক্ষক আবেদন", "শিক্ষক নিবন্ধন যাচাই ও অনুমোদন"],
  assignments: ["শ্রেণি বরাদ্দ", "শিক্ষককে শ্রেণি ও শাখা বরাদ্দ করুন"],
  verification: ["দৈনিক হাজিরা যাচাই", "প্রতিদিনের হাজিরা যাচাই ও কেন্দ্রীয় সাবমিশন"],
  schoolApplications: ["স্কুল আবেদন", "নতুন স্কুল নিবন্ধন যাচাই ও অনুমোদন"],
};

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const token = sessionStorage.getItem("ssbd_access_token");
      if (!token) { if (active) setAuthReady(true); return; }
      try {
        const { data } = await api.get("/auth/me");
        if (active) {
          setUser(data.data.user);
          sessionStorage.setItem("ssbd_user", JSON.stringify(data.data.user));
          const savedPage = sessionStorage.getItem("ssbd_current_page");
          if (savedPage) setPage(savedPage);
        }
      } catch (error) {
        sessionStorage.removeItem("ssbd_access_token");
    sessionStorage.removeItem("ssbd_user");
    sessionStorage.removeItem("ssbd_current_page");
        sessionStorage.removeItem("ssbd_user");
        sessionStorage.removeItem("ssbd_current_page");
        if (active) setUser(null);
      } finally { if (active) setAuthReady(true); }
    };
    restoreSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setPage("central");
    };
    window.addEventListener("ssbd:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("ssbd:auth-expired", handleAuthExpired);
  }, []);

  const [page, setPage] = useState("central");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = user?.role === "central_office" ? "central" : user?.role === "teacher" ? "teacher" : "admin";
  const title = pageTitles[page] || pageTitles.central;

  const login = (nextUser) => {
    setUser(nextUser);
    sessionStorage.setItem("ssbd_user", JSON.stringify(nextUser));
    const nextPage = nextUser.role === "central_office" ? "central" : nextUser.role === "teacher" ? "attendance" : "school";
    setPage(nextPage);
    sessionStorage.setItem("ssbd_current_page", nextPage);
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* Local logout must still complete. */ }
    sessionStorage.removeItem("ssbd_access_token");
    sessionStorage.removeItem("ssbd_user");
    sessionStorage.removeItem("ssbd_current_page");
    setUser(null);
    setPage("central");
  };

  if (!authReady) return <div className="min-h-screen grid place-items-center bg-[#f4f8f5] text-sm text-slate-600">সেশন যাচাই করা হচ্ছে...</div>;
  if (!user) return <AuthPage onLogin={login} />;

  return <div className="min-h-screen border-t-4 border-flag-red bg-[#f4f8f5] text-[#17352a]">
    <div className="flex min-h-screen">
      <Sidebar role={role} page={page} setPage={(nextPage) => { setPage(nextPage); sessionStorage.setItem("ssbd_current_page", nextPage); }} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-slate-200 border-t-2 border-t-brand-700 bg-white/95 px-4 backdrop-blur sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="মেনু খুলুন"><Menu size={20} /></button>
            <div className="min-w-0"><div className="truncate text-base font-bold text-slate-900 sm:text-lg">{title[0]}</div><div className="hidden truncate text-xs text-slate-500 sm:block">{title[1]}</div></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 sm:gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 sm:inline">{user.role === "central_office" ? "কেন্দ্রীয় কর্মকর্তা" : user.role === "teacher" ? "সহকারী শিক্ষক" : "প্রধান শিক্ষক"}</span>
            <span className="hidden max-w-[170px] truncate sm:inline">{user.name}</span>
            <button className="secondary-button" onClick={logout}><LogOut size={15}/> লগআউট</button>
          </div>
        </header>
        <main className="mx-auto max-w-[1700px] p-4 sm:p-6 xl:p-8">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-sm text-slate-500">স্বাগতম, {user.name}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{title[0]}</h1><p className="mt-2 text-sm text-slate-500">{title[1]}</p></div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"><CalendarDays size={15}/> Asia/Dhaka</span><span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"><Wifi size={15}/> সুরক্ষিত সেশন</span></div>
          </div>
          {page === "central" && role === "central" ? <CentralDashboard /> :
           page === "schoolApplications" && role === "central" ? <SchoolApplicationsPage /> :
           page === "teacherApplications" && role === "admin" ? <TeacherApplicationsPage /> :
           page === "students" && role === "admin" ? <StudentsPage /> :
           page === "assignments" && role === "admin" ? <ClassAssignmentsPage /> :
           page === "verification" && role === "admin" ? <PrincipalVerificationPage /> :
           page === "reports" && role === "admin" ? <AuditPage /> :
           page === "reports" && role === "central" ? <AuditPage central /> :
           page === "attendance" && role === "teacher" ? <TeacherAttendancePage /> :
           page === "school" && role === "admin" ? <SchoolDashboard role={role} /> :
           <PlaceholderPage title={title[0]} />}
          <footer className="mt-10 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Smart School BD</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14}/> নিরাপত্তা ও গোপনীয়তা অগ্রাধিকার</span></footer>
        </main>
      </div>
    </div>
  </div>;
}
