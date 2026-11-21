import { Construction } from "lucide-react";

export default function PlaceholderPage({ title }) {
  return <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center"><div className="rounded-2xl bg-slate-100 p-4 text-slate-500"><Construction size={28} /></div><h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">এই অংশটি পরবর্তী development phase-এ যুক্ত হবে। Backend endpoint ও permission যাচাইয়ের পর বাস্তব data সংযুক্ত করা হবে।</p></div>;
}