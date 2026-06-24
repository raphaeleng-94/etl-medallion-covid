'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { useDashboard, CONTINENT_COLORS } from '@/store/dashboard'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold text-white mb-1">{d.fullName}</div>
      <div className="text-[10px] mb-1" style={{ color: CONTINENT_COLORS[d.continent] ?? '#6b90ad' }}>{d.continent}</div>
      <div className="text-slate-400">Vaccinated: <span className="text-green-400 font-mono">{d.value?.toFixed(1)}%</span></div>
    </div>
  )
}

export default function VaccinationBar() {
  const { filteredCountries, selectedISO, setSelectedISO } = useDashboard()

  const sorted = [...filteredCountries]
    .filter(c => c.vaccination_rate != null)
    .sort((a, b) => b.vaccination_rate - a.vaccination_rate)

  const data = sorted.map(c => ({
    country: c.country.length > 10 ? c.country.slice(0, 9) + '…' : c.country,
    fullName: c.country,
    continent: c.continent,
    iso: c.iso_code,
    value: c.vaccination_rate,
    color: c.vaccination_rate >= 75 ? '#39ff14' : c.vaccination_rate >= 50 ? '#00d4ff' : c.vaccination_rate >= 25 ? '#ff6b35' : '#ff4444',
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 4, right: 8, bottom: 40, left: 8 }}
        onClick={(e: any) => {
          if (e?.activePayload?.[0]) {
            const iso = e.activePayload[0].payload.iso
            setSelectedISO(selectedISO === iso ? null : iso)
          }
        }}
      >
        <XAxis dataKey="country" tick={{ fill: '#6b90ad', fontSize: 8 }}
          angle={-45} textAnchor="end" interval={0}
          axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#6b90ad', fontSize: 9 }} tickFormatter={(v: number) => `${v}%`}
          axisLine={false} tickLine={false} domain={[0, 100]} />
        <ReferenceLine y={70} stroke="#39ff14" strokeDasharray="3 3" strokeOpacity={0.4} />
        <ReferenceLine y={50} stroke="#00d4ff" strokeDasharray="3 3" strokeOpacity={0.3} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="value" name="Vaccination Rate %" radius={[3, 3, 0, 0]} maxBarSize={20}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color}
              opacity={selectedISO && selectedISO !== d.iso ? 0.2 : 0.85}
              stroke={selectedISO === d.iso ? '#fff' : 'transparent'}
              strokeWidth={1.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
