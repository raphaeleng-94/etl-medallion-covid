import { ReactNode } from 'react'

interface Props {
  title: string
  sub?: string
  badge?: string
  badgeColor?: string
  children: ReactNode
  className?: string
  bodyClass?: string
}

export default function Card({ title, sub, badge, badgeColor = '#00d4ff', children, className = '', bodyClass = '' }: Props) {
  return (
    <div className={`flex flex-col rounded-xl border border-white/8 overflow-hidden ${className}`}
         style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="flex items-start justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div>
          <div className="text-[12px] font-semibold text-slate-200">{title}</div>
          {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
        </div>
        {badge && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ml-2"
                style={{ color: badgeColor, borderColor: `${badgeColor}44`, background: `${badgeColor}12` }}>
            {badge}
          </span>
        )}
      </div>
      <div className={`flex-1 min-h-0 ${bodyClass}`}>{children}</div>
    </div>
  )
}
