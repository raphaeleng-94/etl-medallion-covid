'use client'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useDashboard, CONTINENT_COLORS } from '@/store/dashboard'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-white mb-1">{d.country}</div>
      <div className="text-[10px] mb-1" style={{ color: CONTINENT_COLORS[d.continent] ?? '#6b90ad' }}>{d.continent}</div>
      <div className="text-slate-400">GDP: <span className="text-slate-200 font-mono">${d.x?.toLocaleString()}</span></div>
      <div className="text-slate-400">CFR: <span className="text-cyan-400 font-mono">{d.y?.toFixed(2)}%</span></div>
    </div>
  )
}

export default function ScatterCfrGdp() {
  const { filteredCountries, selectedISO, setSelectedISO } = useDashboard()

  const data = filteredCountries
    .filter(c => c.case_fatality_rate != null && c.gdp_per_capita != null)
    .map(c => ({
      x: c.gdp_per_capita,
      y: c.case_fatality_rate,
      country: c.country,
      continent: c.continent,
      iso: c.iso_code,
      color: CONTINENT_COLORS[c.continent] ?? '#6b90ad',
    }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <XAxis dataKey="x" type="number" name="GDP"
          tick={{ fill: '#6b90ad', fontSize: 9 }}
          tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
          axisLine={false} tickLine={false}
          label={{ value: 'GDP per Capita (USD)', position: 'insideBottom', offset: -16, fill: '#4a6f8a', fontSize: 9 }} />
        <YAxis dataKey="y" type="number" name="CFR"
          tick={{ fill: '#6b90ad', fontSize: 9 }}
          tickFormatter={v => `${v}%`}
          axisLine={false} tickLine={false}
          label={{ value: 'CFR %', angle: -90, position: 'insideLeft', fill: '#4a6f8a', fontSize: 9 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
        <Scatter
          data={data}
          onClick={(d: any) => setSelectedISO(selectedISO === d.iso ? null : d.iso)}
          style={{ cursor: 'pointer' }}
        >
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color}
              opacity={selectedISO && selectedISO !== d.iso ? 0.15 : 0.85}
              stroke={selectedISO === d.iso ? '#fff' : 'transparent'}
              strokeWidth={1.5}
              r={selectedISO === d.iso ? 8 : 5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
