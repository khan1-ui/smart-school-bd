
import {
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  School,
} from "lucide-react";

const icons = {
  school: School,
  play: PlayCircle,
  check: CheckCircle2,
  alert: AlertTriangle,
};

export default function StatCard({ item }) {
  const Icon = icons[item.icon] || School;

  return (
    <article className="min-w-0 rounded-2xl border border-brand-900 border-t-4 border-t-flag-red bg-brand-900 p-5 text-white shadow-soft transition-shadow duration-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium leading-6 text-brand-100">
          {item.label}
        </div>

        <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white/10 p-2.5 text-white">
          <Icon size={20} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-4 text-3xl font-bold tracking-tight text-white">
        {item.value}
      </div>

      <p className="mt-2 text-xs leading-5 text-brand-100">
        {item.helper}
      </p>
    </article>
  );
}
