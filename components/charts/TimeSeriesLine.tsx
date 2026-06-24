'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import { useDashboard, CONTINENT_COLORS } from '@/store/dashboard'
import { fmtBig } from '@/lib/fmt'
import { useState } from 'react'

const CONTINENTS = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="text-slate-400 mb-2 font-mono">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex gap-3 justify-between">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono text-slate-200">{fmtBig(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TimeSeriesLine() {
  const { timeSeries, selectedContinent } = useDashboard()
  const [metric, setMetric] = useState<'new_cases' | 'new_deaths' | 'rolling_7day_cases'>('rolling_7day_cases')

  const continentsToShow = selectedContinent ? [selectedContinent] : CONTINENTS

  // Group by date
  const byDate: Record<string, Record<string, number>> = {}
  timeSeries.forEach(row => {
    if (!continentsToShow.includes(row.continent)) return
    if (!byDate[row.date]) byDate[row.date] = {}
    byDate[row.date][row.continent] = (byDate[row.date][row.continent] ?? 0) + (row[metric] ?? 0)
  })

  // Sample every 14 days to avoid crowding
  const allDates = Object.keys(byDate).sort()
  const sampledDates = allDates.filter((_, i) => i % 14 === 0)

  const data = sampledDates.map(date => ({
    date: date.slice(0, 7), // YYYY-MM
    ...byDate[date],
  }))

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 mb-3 shrink-0">
        {[
          { k: 'rolling_7day_cases', label: '7d Avg Cases' },
          { k: 'new_cases', label: 'New Cases' },
          { k: 'new_deaths', label: 'New Deaths' },
        ].map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setMetric(k as any)}
            className={`px-3 py-1 rounded-full text-[10px] font-medium border transition-all ${
              metric === k
                ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-400'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#6b90ad', fontSize: 9 }}
              axisLine={false} tickLine={false} interval={5} />
            <YAxis tick={{ fill: '#6b90ad', fontSize: 9 }} tickFormatter={fmtBig}
              axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={6}
              formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>} />
            {continentsToShow.map(cont => (
              <Line
                key={cont}
                type="monotone"
                dataKey={cont}
                stroke={CONTINENT_COLORS[cont] ?? '#6b90ad'}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
