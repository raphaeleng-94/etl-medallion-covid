'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useDashboard, CONTINENT_COLORS } from '@/store/dashboard'
import { fmtBig } from '@/lib/fmt'

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#0b1622] border border-white/10 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-bold mb-1" style={{ color: d.payload.color }}>{d.name}</div>
      <div className="text-slate-300 font-mono">{fmtBig(d.value)} cases</div>
      <div className="text-slate-500">{((d.value / d.payload.total) * 100).toFixed(1)}% of total</div>
    </div>
  )
}

const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={9} fontWeight={700}>
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function ContinentDonut() {
  const { filteredCountries, setContinent, selectedContinent } = useDashboard()

  const byContinent: Record<string, number> = {}
  filteredCountries.forEach(c => {
    byContinent[c.continent] = (byContinent[c.continent] ?? 0) + (c.total_cases ?? 0)
  })
  const total = Object.values(byContinent).reduce((a, b) => a + b, 0)

  const data = Object.entries(byContinent).map(([name, value]) => ({
    name, value, color: CONTINENT_COLORS[name] ?? '#6b90ad', total,
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%" cy="44%"
          innerRadius="48%" outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={renderLabel}
          onClick={(d) => setContinent((selectedContinent ?? undefined) === d.name ? null : (d.name as string))}
          style={{ cursor: 'pointer' }}
        >
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color}
              opacity={selectedContinent && selectedContinent !== d.name ? 0.2 : 0.9}
              stroke={selectedContinent === d.name ? d.color : 'transparent'}
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle" iconSize={7}
          formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 10 }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
