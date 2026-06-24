'use client'
import { motion } from 'framer-motion'

interface Props {
  icon: string
  label: string
  value: string
  sub?: string
  color?: string
  onClick?: () => void
  active?: boolean
}

export default function KpiCard({ icon, label, value, sub, color = '#00d4ff', onClick, active }: Props) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border p-4 cursor-pointer transition-colors ${
        active ? 'border-cyan-400/60' : 'border-white/8 hover:border-white/20'
      }`}
      style={{ background: active ? `${color}12` : 'rgba(255,255,255,0.02)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]"
           style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="text-xl mb-2">{icon}</div>
      <div className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-extrabold font-mono leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1.5">{sub}</div>}
    </motion.div>
  )
}
