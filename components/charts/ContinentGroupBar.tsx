'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { useDashboard } from '@/store/dashboard'
import { fmtBig, fmtPct } from '@/lib/fmt'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-white mb-2">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-3 justify-between">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="font-mono text-slate-200">{p.name === 'Vacc %' || p.name === 'CFR %' ? fmtPct(p.value, 1) : fmtBig(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ContinentGroupBar() {
  const { continents } = useDashboard()

  const data = continents.map(c => ({
    name: c.continent.replace(' America', ' Am.').replace('Oceania', 'Oceania'),
    'Cases (M)': Math.round(c.total_cases / 1e6),
    'Deaths (K)': Math.round(c.total_deaths / 1e3),
    'Vacc %': Math.round(c.avg_vaccination_rate ?? 0),
    'CFR %': +(c.avg_case_fatality_rate ?? 0).toFixed(2),
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
        barCategoryGap="20%" barGap={2}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b90ad', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Legend iconType="circle" iconSize={6}
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>} />
        <Bar dataKey="Cases (M)" fill="#00d4ff" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Deaths (K)" fill="#ff4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Vacc %" fill="#39ff14" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
        <Bar dataKey="CFR %" fill="#ff6b35" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
