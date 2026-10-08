import { type ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: ReactNode;
  link: string;
  shadow: string;
  href?: string;
}

export function StatCard({ label, value, color, icon, link, shadow, href }: StatCardProps) {
  const content = (
    <div className={`group relative overflow-hidden rounded-2xl bg-zinc-900/60 border border-white/10 p-5 text-white transition-all hover:scale-[1.03] active:scale-[0.98] hover:border-white/20 shadow-2xl hover:shadow-black/50 ${href ? 'cursor-pointer' : ''}`}>
      {/* Accent Gradient Glow */}
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <div className={`absolute -top-12 -right-12 w-32 h-32 ${color} opacity-10 blur-3xl rounded-full group-hover:opacity-20 transition-opacity`} />

      <div className="relative z-10 flex flex-col items-end text-right space-y-1">
        <div className="flex items-center justify-between w-full mb-1">
          <div className={`${color} p-2 rounded-lg bg-opacity-20`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={color.replace('bg-', 'text-')}>
              {icon}
            </svg>
          </div>
          <span className={`${typeof value === 'number' ? 'text-4xl' : 'text-xl'} font-black tracking-tighter`}>{value}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 leading-tight group-hover:text-zinc-300 transition-colors">{label}</span>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-[#1ea39e] transition-colors">
        {link}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transition-transform group-hover:translate-x-0.5"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>
  );

  if (href) {
    return <a href={href} className="block no-underline">{content}</a>;
  }
  return content;
}
