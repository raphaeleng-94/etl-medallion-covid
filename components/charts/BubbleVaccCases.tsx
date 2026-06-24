'use client'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ZAxis } from 'recharts'
import { useDashboard, CONTINENT_COLORS } from '@/store/dashboard'
import { fmtNum } from '@/lib/fmt'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-white mb-1">{d.country}</div>
      <div className="text-[10px] mb-1" style={{ color: CONTINENT_COLORS[d.continent] ?? '#6b90ad' }}>{d.continent}</div>
      <div className="text-slate-400">Vaccination: <span className="text-green-400 font-mono">{d.x?.toFixed(1)}%</span></div>
      <div className="text-slate-400">Cases/M: <span className="text-cyan-400 font-mono">{fmtNum(d.cpm)}</span></div>
      <div className="text-slate-400">Population: <span className="text-slate-200 font-mono">{fmtNum(d.pop)}</span></div>
    </div>
  )
}

export default function BubbleVaccCases() {
  const { filteredCountries, selectedISO, setSelectedISO } = useDashboard()

  const maxPop = Math.max(...filteredCountries.map(c => c.population ?? 0))

  const data = filteredCountries
    .filter(c => c.vaccination_rate != null && c.cases_per_million != null && c.population)
    .map(c => ({
      x: c.vaccination_rate,
      y: c.cases_per_million / 1000,
      z: Math.max(60, Math.sqrt((c.population ?? 0) / maxPop) * 800),
      cpm: c.cases_per_million,
      pop: c.population,
      country: c.country,
      continent: c.continent,
      iso: c.iso_code,
      color: CONTINENT_COLORS[c.continent] ?? '#6b90ad',
    }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
        <XAxis dataKey="x" type="number" name="Vaccination Rate"
          tick={{ fill: '#6b90ad', fontSize: 9 }}
          tickFormatter={v => `${v}%`}
          axisLine={false} tickLine={false}
          label={{ value: 'Vaccination Rate %', position: 'insideBottom', offset: -16, fill: '#4a6f8a', fontSize: 9 }} />
        <YAxis dataKey="y" type="number" name="Cases per Million"
          tick={{ fill: '#6b90ad', fontSize: 9 }}
          axisLine={false} tickLine={false}
          label={{ value: 'Cases/M (000s)', angle: -90, position: 'insideLeft', fill: '#4a6f8a', fontSize: 9 }} />
        <ZAxis dataKey="z" range={[20, 400]} />
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
              opacity={selectedISO && selectedISO !== d.iso ? 0.15 : 0.7}
              stroke={selectedISO === d.iso ? '#fff' : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
