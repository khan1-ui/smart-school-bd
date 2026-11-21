const styles = {
  "চলমান": "bg-blue-50 text-blue-700 ring-blue-200",
  "চূড়ান্ত": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "জমা হয়েছে": "bg-violet-50 text-violet-700 ring-violet-200",
  "শুরু হয়নি": "bg-slate-100 text-slate-700 ring-slate-200",
  "তথ্য পুরোনো": "bg-amber-50 text-amber-800 ring-amber-200",
  "পেন্ডিং": "bg-amber-50 text-amber-800 ring-amber-200",
  "পাঠানো হয়নি": "bg-slate-100 text-slate-700 ring-slate-200",
  "ব্যর্থ": "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function Badge({ children }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[children] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {children}
    </span>
  );
}