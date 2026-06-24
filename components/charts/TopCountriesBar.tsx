'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useDashboard, CONTINENT_COLORS, METRIC_LABELS } from '@/store/dashboard'
import { fmtBig } from '@/lib/fmt'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-white mb-1">{d.fullName}</div>
      <div className="text-slate-400 mb-1">{d.continent}</div>
      <div className="font-mono" style={{ color: d.color }}>
        {payload[0].name}: {d.raw?.toLocaleString() ?? d.value?.toLocaleString()}
      </div>
    </div>
  )
}

export default function TopCountriesBar() {
  const { topCountries, getMetricValue, selectedMetric, selectedISO, setSelectedISO } = useDashboard()

  const data = topCountries.map(c => ({
    country: c.country.length > 14 ? c.country.slice(0, 13) + '…' : c.country,
    fullName: c.country,
    continent: c.continent,
    iso: c.iso_code,
    value: getMetricValue(c) ?? 0,
    raw: getMetricValue(c),
    color: CONTINENT_COLORS[c.continent] ?? '#6b90ad',
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 20, bottom: 4, left: 4 }}
        onClick={(e: any) => {
          if (e?.activePayload?.[0]) {
            const iso = e.activePayload[0].payload.iso
            setSelectedISO(selectedISO === iso ? null : iso)
          }
        }}
      >
        <XAxis type="number" tick={{ fill: '#6b90ad', fontSize: 9 }} tickFormatter={fmtBig}
          axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="country" width={95} tick={{ fill: '#94a3b8', fontSize: 10 }}
          axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="value" name={METRIC_LABELS[selectedMetric]} radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color}
              opacity={selectedISO && selectedISO !== d.iso ? 0.2 : 0.85}
              stroke={selectedISO === d.iso ? d.color : 'transparent'}
              strokeWidth={2}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
