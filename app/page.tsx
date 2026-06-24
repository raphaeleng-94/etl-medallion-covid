'use client'
import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useDashboard, CONTINENT_COLORS, METRIC_LABELS, type Metric } from '@/store/dashboard'
import { fmtBig, fmtNum, fmtPct, fmtUSD, FLAGS } from '@/lib/fmt'
import KpiCard from '@/components/ui/KpiCard'
import Card from '@/components/ui/Card'
import { ChartSkeleton } from '@/components/ui/Skeleton'

// Dynamic imports to avoid SSR issues with recharts
const TopCountriesBar  = dynamic(() => import('@/components/charts/TopCountriesBar'),  { ssr: false, loading: () => <ChartSkeleton /> })
const ContinentDonut   = dynamic(() => import('@/components/charts/ContinentDonut'),   { ssr: false, loading: () => <ChartSkeleton /> })
const ScatterCfrGdp    = dynamic(() => import('@/components/charts/ScatterCfrGdp'),    { ssr: false, loading: () => <ChartSkeleton /> })
const BubbleVaccCases  = dynamic(() => import('@/components/charts/BubbleVaccCases'),  { ssr: false, loading: () => <ChartSkeleton /> })
const VaccinationBar   = dynamic(() => import('@/components/charts/VaccinationBar'),   { ssr: false, loading: () => <ChartSkeleton /> })
const TimeSeriesLine   = dynamic(() => import('@/components/charts/TimeSeriesLine'),   { ssr: false, loading: () => <ChartSkeleton /> })
const ContinentGroupBar= dynamic(() => import('@/components/charts/ContinentGroupBar'),{ ssr: false, loading: () => <ChartSkeleton /> })

const TABS = ['01 Overview', '02 Cases & Deaths', '03 Vaccination', '04 Comparisons', '05 Explorer']
const CONTINENTS = ['Africa','Asia','Europe','North America','South America','Oceania']

export default function Home() {
  const {
    loading, error,
    selectedContinent, selectedMetric, selectedISO, topN, searchQuery,
    setContinent, setMetric, setSelectedISO, setTopN, setSearch,
    filteredCountries, 
  } = useDashboard()

  const [activeTab, setActiveTab] = useState(0)
  const [sortCol, setSortCol] = useState<string>('total_cases')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  // ── KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total_cases  = filteredCountries.reduce((s, c) => s + (c.total_cases ?? 0), 0)
    const total_deaths = filteredCountries.reduce((s, c) => s + (c.total_deaths ?? 0), 0)
    const avg_vacc     = filteredCountries.reduce((s, c) => s + (c.vaccination_rate ?? 0), 0) / (filteredCountries.length || 1)
    const avg_cfr      = filteredCountries.reduce((s, c) => s + (c.case_fatality_rate ?? 0), 0) / (filteredCountries.length || 1)
    return { total_cases, total_deaths, avg_vacc, avg_cfr, count: filteredCountries.length }
  }, [filteredCountries])

  // ── Table sort ────────────────────────────────────────────────
  const sortedCountries = useMemo(() => {
    const colMap: Record<string, (c: any) => number | string> = {
      total_cases:      c => c.total_cases ?? 0,
      total_deaths:     c => c.total_deaths ?? 0,
      case_fatality_rate: c => c.case_fatality_rate ?? 0,
      vaccination_rate: c => c.vaccination_rate ?? 0,
      cases_per_million: c => c.cases_per_million ?? 0,
      deaths_per_million: c => c.deaths_per_million ?? 0,
      gdp_per_capita:   c => c.gdp_per_capita ?? 0,
      country:          c => c.country ?? '',
    }
    const getter = colMap[sortCol] ?? (c => c.total_cases ?? 0)
    return [...filteredCountries].sort((a, b) => {
      const av = getter(a), bv = getter(b)
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av)
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [filteredCountries, sortCol, sortDir])

  function handleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  if (error) return (
    <div className="h-full flex items-center justify-center text-red-400 font-mono text-sm">
      ⚠ {error}
    </div>
  )

  return (
    <div className="relative z-10 flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="shrink-0 h-14 flex items-center gap-0 border-b border-white/8 bg-[#060d17]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 h-full border-r border-white/8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
               style={{ background: 'linear-gradient(135deg,#00d4ff,#bd10e0)' }}>🦠</div>
          <div>
            <div className="text-[13px] font-bold leading-none bg-gradient-to-r from-cyan-400 to-slate-200 bg-clip-text text-transparent">
              COVID-19 Global Analytics
            </div>
            <div className="text-[9px] text-slate-500 font-mono tracking-wider mt-0.5">
              MEDALLION ETL · SUPABASE · AIRFLOW · DBT
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center h-full px-3 gap-1 flex-1 overflow-x-auto">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
                activeTab === i
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <span className="text-[10px] font-mono opacity-50">{tab.slice(0, 2)}</span>
              {tab.slice(3)}
            </button>
          ))}
        </nav>

        {/* Layer badges */}
        <div className="flex items-center gap-2 px-4 border-l border-white/8 h-full shrink-0">
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{ color:'#cd7f32', borderColor:'#cd7f3244', background:'#cd7f3210' }}>BRONZE</span>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{ color:'#c0c0c0', borderColor:'#c0c0c044', background:'#c0c0c010' }}>SILVER</span>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{ color:'#ffcc00', borderColor:'#ffcc0044', background:'#ffcc0010' }}>GOLD</span>
          {loading
            ? <div className="text-[10px] text-slate-500 font-mono ml-1 animate-pulse">⟳ loading…</div>
            : <div className="text-[10px] text-green-400 font-mono ml-1">✓ live</div>
          }
        </div>
      </header>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="shrink-0 h-10 flex items-center gap-3 px-4 border-b border-white/6 bg-white/[0.015] overflow-x-auto">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Continent</span>
        <div className="flex gap-1.5">
          {['All', ...CONTINENTS].map(cont => (
            <button
              key={cont}
              onClick={() => setContinent(cont === 'All' ? null : cont)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all whitespace-nowrap ${
                (cont === 'All' && !selectedContinent) || selectedContinent === cont
                  ? 'bg-cyan-400 border-cyan-400 text-[#060d17] font-bold'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              {cont}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Metric</span>
        <select
          value={selectedMetric}
          onChange={e => setMetric(e.target.value as Metric)}
          className="bg-white/5 border border-white/10 rounded-full text-[11px] text-slate-200 px-3 py-1 outline-none focus:border-cyan-500/50 cursor-pointer"
        >
          {Object.entries(METRIC_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest whitespace-nowrap">Top N</span>
        <select
          value={topN}
          onChange={e => setTopN(+e.target.value)}
          className="bg-white/5 border border-white/10 rounded-full text-[11px] text-slate-200 px-3 py-1 outline-none cursor-pointer"
        >
          {[10,15,20,48].map(n => <option key={n} value={n}>Top {n === 48 ? 'All' : n}</option>)}
        </select>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {/* ══ TAB 0: OVERVIEW ══ */}
            {activeTab === 0 && (
              <div className="space-y-3">
                {/* KPI row */}
                <div className="grid grid-cols-5 gap-3">
                  <KpiCard icon="🦠" label="Total Cases"  value={fmtBig(kpis.total_cases)}  sub={selectedContinent ?? 'worldwide'} color="#00d4ff" active />
                  <KpiCard icon="💀" label="Total Deaths" value={fmtBig(kpis.total_deaths)} sub="confirmed" color="#ff4444" />
                  <KpiCard icon="💉" label="Avg Vaccinated" value={fmtPct(kpis.avg_vacc, 1)} sub="fully vaccinated avg" color="#39ff14" />
                  <KpiCard icon="📊" label="Avg CFR"      value={fmtPct(kpis.avg_cfr)}     sub="case fatality rate" color="#ff6b35" />
                  <KpiCard icon="🌍" label="Countries"    value={String(kpis.count)}         sub="in selection" color="#bd10e0" />
                </div>

                {/* Charts row 1 */}
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-3" style={{ height: '320px' }}>
                  <Card title="Top Countries — Selected Metric" sub="Click bar · cross-filters table"
                        badge={METRIC_LABELS[selectedMetric].toUpperCase()} bodyClass="p-2">
                    <TopCountriesBar />
                  </Card>
                  <Card title="Cases by Continent" sub="Click slice to filter" badge="GOLD" bodyClass="p-2">
                    <ContinentDonut />
                  </Card>
                  <Card title="Pipeline Status" sub="24 / 24 tests passed" badge="✓ HEALTHY" badgeColor="#39ff14"
                        bodyClass="p-4">
                    <PipelineStatus />
                  </Card>
                </div>

                {/* Charts row 2 */}
                <div className="grid grid-cols-3 gap-3" style={{ height: '260px' }}>
                  <Card title="CFR vs GDP per Capita" sub="Hover points for details" badge="SILVER" bodyClass="p-2">
                    <ScatterCfrGdp />
                  </Card>
                  <Card title="Vaccination vs Exposure" sub="Bubble size = population" badge="GOLD" bodyClass="p-2">
                    <BubbleVaccCases />
                  </Card>
                  <Card title="Continent Comparison" sub="Cases · Deaths · Vacc · CFR" badge="GOLD" bodyClass="p-2">
                    <ContinentGroupBar />
                  </Card>
                </div>
              </div>
            )}

            {/* ══ TAB 1: CASES & DEATHS ══ */}
            {activeTab === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard icon="🦠" label="Total Cases"   value={fmtBig(kpis.total_cases)}  color="#00d4ff" active />
                  <KpiCard icon="💀" label="Total Deaths"  value={fmtBig(kpis.total_deaths)} color="#ff4444" />
                  <KpiCard icon="📊" label="Global CFR"    value={fmtPct(kpis.avg_cfr)}      color="#ff6b35" />
                  <KpiCard icon="🌍" label="Countries"     value={String(kpis.count)}          color="#bd10e0" />
                </div>
                <div className="grid grid-cols-2 gap-3" style={{ height: '340px' }}>
                  <Card title="Top Countries — Cases & Deaths" sub="Click to highlight" badge={METRIC_LABELS[selectedMetric].toUpperCase()} bodyClass="p-2">
                    <TopCountriesBar />
                  </Card>
                  <Card title="CFR vs GDP per Capita" sub="Wealthier countries tend to have lower CFR" badge="SILVER" bodyClass="p-2">
                    <ScatterCfrGdp />
                  </Card>
                </div>
                <div style={{ height: '320px' }}>
                  <Card title="Global Trend — Cases & Deaths over Time" sub="7-day rolling average by continent" badge="GOLD" bodyClass="p-3" className="h-full">
                    <TimeSeriesLine />
                  </Card>
                </div>
              </div>
            )}

            {/* ══ TAB 2: VACCINATION ══ */}
            {activeTab === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard icon="💉" label="Avg Vaccinated" value={fmtPct(kpis.avg_vacc, 1)} color="#39ff14" active />
                  <KpiCard icon="🦠" label="Total Cases"   value={fmtBig(kpis.total_cases)}  color="#00d4ff" />
                  <KpiCard icon="📊" label="Avg CFR"       value={fmtPct(kpis.avg_cfr)}      color="#ff6b35" />
                  <KpiCard icon="🌍" label="Countries"     value={String(kpis.count)}          color="#bd10e0" />
                </div>
                <div style={{ height: '280px' }}>
                  <Card title="Vaccination Coverage by Country" sub="% fully vaccinated · click to highlight" badge="GOLD LAYER" bodyClass="p-2" className="h-full">
                    <VaccinationBar />
                  </Card>
                </div>
                <div className="grid grid-cols-2 gap-3" style={{ height: '300px' }}>
                  <Card title="Vaccination vs Exposure" sub="Bubble = population size" badge="GOLD" bodyClass="p-2">
                    <BubbleVaccCases />
                  </Card>
                  <Card title="Cases by Continent" sub="Distribution of total cases" badge="GOLD" bodyClass="p-2">
                    <ContinentDonut />
                  </Card>
                </div>
              </div>
            )}

            {/* ══ TAB 3: COMPARISONS ══ */}
            {activeTab === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3" style={{ height: '320px' }}>
                  <Card title="Continent Comparison — Key Metrics" sub="Cases · Deaths · Vaccination · CFR" badge="GOLD LAYER" bodyClass="p-2">
                    <ContinentGroupBar />
                  </Card>
                  <Card title="Continent Scorecards" sub="Click row to filter dashboard" badge="GOLD" bodyClass="overflow-y-auto">
                    <ContinentScorecard />
                  </Card>
                </div>
                <div className="grid grid-cols-2 gap-3" style={{ height: '300px' }}>
                  <Card title="CFR vs GDP" sub="Does wealth reduce mortality?" badge="SILVER" bodyClass="p-2">
                    <ScatterCfrGdp />
                  </Card>
                  <Card title="Global Trends" sub="Rolling 7-day average" badge="GOLD" bodyClass="p-3">
                    <TimeSeriesLine />
                  </Card>
                </div>
              </div>
            )}

            {/* ══ TAB 4: EXPLORER ══ */}
            {activeTab === 4 && (
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    placeholder="🔍 Search country..."
                    value={searchQuery}
                    onChange={e => setSearch(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-200 outline-none focus:border-cyan-500/50 w-64 placeholder:text-slate-600"
                  />
                  <span className="text-[11px] text-slate-500">
                    Showing <strong className="text-cyan-400">{sortedCountries.length}</strong> countries
                  </span>
                  {selectedISO && (
                    <button onClick={() => setSelectedISO(null)}
                      className="px-3 py-1 rounded-full text-[11px] border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-colors">
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {[
                            ['#', ''],
                            ['Country', 'country'],
                            ['Continent', ''],
                            ['Total Cases', 'total_cases'],
                            ['Total Deaths', 'total_deaths'],
                            ['CFR %', 'case_fatality_rate'],
                            ['Vacc %', 'vaccination_rate'],
                            ['Cases/M', 'cases_per_million'],
                            ['Deaths/M', 'deaths_per_million'],
                            ['GDP/Cap', 'gdp_per_capita'],
                          ].map(([label, col]) => (
                            <th
                              key={label}
                              onClick={() => col && handleSort(col)}
                              className={`px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap ${col ? 'cursor-pointer hover:text-cyan-400' : ''}`}
                            >
                              {label}
                              {col && sortCol === col && (
                                <span className="text-cyan-400 ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCountries.map((c, i) => {
                          const color = CONTINENT_COLORS[c.continent] ?? '#6b90ad'
                          const isSelected = selectedISO === c.iso_code
                          const maxCases = sortedCountries[0]?.total_cases ?? 1
                          return (
                            <tr
                              key={c.iso_code}
                              onClick={() => setSelectedISO(isSelected ? null : c.iso_code)}
                              className={`border-b border-white/5 cursor-pointer transition-colors ${
                                isSelected ? 'bg-cyan-400/8' : 'hover:bg-white/3'
                              }`}
                            >
                              <td className="px-3 py-2 text-slate-600 font-mono text-[10px]">{i + 1}</td>
                              <td className="px-3 py-2 font-semibold text-slate-200 whitespace-nowrap">
                                <span className="mr-2">{FLAGS[c.iso_code] ?? '🏳'}</span>
                                {c.country}
                              </td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                                      style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
                                  {c.continent}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.round((c.total_cases / maxCases) * 100)}%`, background: color }} />
                                  </div>
                                  <span className="font-mono text-slate-300">{fmtBig(c.total_cases)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 font-mono text-red-400">{fmtBig(c.total_deaths)}</td>
                              <td className={`px-3 py-2 font-mono ${(c.case_fatality_rate ?? 0) > 3 ? 'text-red-400' : (c.case_fatality_rate ?? 0) > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {fmtPct(c.case_fatality_rate)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{
                                      width: `${Math.min(c.vaccination_rate ?? 0, 100)}%`,
                                      background: (c.vaccination_rate ?? 0) >= 70 ? '#39ff14' : (c.vaccination_rate ?? 0) >= 50 ? '#00d4ff' : '#ff6b35',
                                    }} />
                                  </div>
                                  <span className="font-mono text-slate-300">{fmtPct(c.vaccination_rate, 1)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-400">{fmtNum(c.cases_per_million)}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{fmtNum(c.deaths_per_million)}</td>
                              <td className="px-3 py-2 font-mono text-slate-400">{fmtUSD(c.gdp_per_capita)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

// ── Pipeline status widget ──────────────────────────────────────
function PipelineStatus() {
  return (
    <div className="text-[11px] space-y-3">
      {[
        { label: 'BRONZE', color: '#cd7f32', detail: '115 rows raw', script: 'ingest_bronze.py', tests: '5/5' },
        { label: 'SILVER', color: '#c0c0c0', detail: '115 cleaned',  script: 'transform_silver.py', tests: '11/11' },
        { label: 'GOLD',   color: '#ffcc00', detail: '48 countries', script: 'aggregate_gold.py + dbt', tests: '8/8' },
      ].map((step, i) => (
        <div key={step.label}>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ background: step.color }} />
            <span className="font-mono font-bold" style={{ color: step.color }}>{step.label}</span>
            <span className="text-slate-500 text-[10px]">{step.detail}</span>
            <span className="ml-auto text-green-400 text-[10px]">✓</span>
          </div>
          <div className="ml-4 text-[9px] text-slate-600 font-mono">{step.script}</div>
          {i < 2 && <div className="ml-3 text-slate-600 text-[10px] mt-1">↓</div>}
        </div>
      ))}
      <div className="border-t border-white/8 pt-3 space-y-1">
        {[['Bronze', '5/5'],['Silver','11/11'],['Gold','8/8']].map(([l, v]) => (
          <div key={l} className="flex justify-between font-mono text-[10px]">
            <span className="text-slate-500">{l} tests</span>
            <span className="text-green-400">{v} ✓</span>
          </div>
        ))}
      </div>
      <div className="text-[9px] text-slate-600 font-mono text-center border-t border-white/6 pt-2">
        🕕 Airflow DAG: daily @ 06:00 UTC
      </div>
    </div>
  )
}

// ── Continent scorecard ──────────────────────────────────────────
function ContinentScorecard() {
  const { continents, selectedContinent, setContinent } = useDashboard()

  return (
    <div className="p-3 space-y-2">
      {continents.map(c => {
        const color = CONTINENT_COLORS[c.continent] ?? '#6b90ad'
        const isActive = selectedContinent === c.continent
        return (
          <div
            key={c.continent}
            onClick={() => setContinent(isActive ? null : c.continent)}
            className="p-3 rounded-xl border cursor-pointer transition-all"
            style={{
              background: isActive ? `${color}18` : `${color}08`,
              borderColor: isActive ? `${color}55` : `${color}22`,
            }}
          >
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-[13px]" style={{ color }}>{c.continent}</span>
              <span className="text-[10px] text-slate-500 font-mono">{c.total_countries} countries</span>
            </div>
            <div className="flex gap-4 text-[11px] mb-2">
              <span className="text-slate-500">Cases: <strong className="text-slate-300">{fmtBig(c.total_cases)}</strong></span>
              <span className="text-slate-500">Deaths: <strong className="text-red-400">{fmtBig(c.total_deaths)}</strong></span>
              <span className="text-slate-500">CFR: <strong className={(c.avg_case_fatality_rate ?? 0) > 2 ? 'text-red-400' : (c.avg_case_fatality_rate ?? 0) > 1 ? 'text-yellow-400' : 'text-green-400'}>
                {fmtPct(c.avg_case_fatality_rate)}
              </strong></span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="whitespace-nowrap">Vacc {fmtPct(c.avg_vaccination_rate, 0)}</span>
              <div className="flex-1 h-1 rounded-full bg-white/6 overflow-hidden">
                <div className="h-full rounded-full transition-all"
                     style={{
                       width: `${Math.min(c.avg_vaccination_rate ?? 0, 100)}%`,
                       background: (c.avg_vaccination_rate ?? 0) >= 70 ? '#39ff14' : (c.avg_vaccination_rate ?? 0) >= 50 ? '#00d4ff' : '#ff6b35',
                     }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
