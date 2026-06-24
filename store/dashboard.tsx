'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { CountrySummary, ContinentSummary, TimeSeries, fetchCountries, fetchContinents, fetchTimeSeries } from '@/lib/supabase'

export type Metric = 'total_cases' | 'total_deaths' | 'vaccination_rate' | 'case_fatality_rate' | 'cases_per_million' | 'deaths_per_million' | 'gdp_per_capita'

export const METRIC_LABELS: Record<Metric, string> = {
  total_cases: 'Total Cases',
  total_deaths: 'Total Deaths',
  vaccination_rate: 'Vaccination %',
  case_fatality_rate: 'CFR %',
  cases_per_million: 'Cases / Million',
  deaths_per_million: 'Deaths / Million',
  gdp_per_capita: 'GDP per Capita',
}

export const CONTINENT_COLORS: Record<string, string> = {
  'Asia': '#00d4ff',
  'Europe': '#bd10e0',
  'North America': '#ff6b35',
  'South America': '#39ff14',
  'Africa': '#ffcc00',
  'Oceania': '#ff4488',
}

interface DashboardState {
  countries: CountrySummary[]
  continents: ContinentSummary[]
  timeSeries: TimeSeries[]
  loading: boolean
  error: string | null
  selectedContinent: string | null
  selectedMetric: Metric
  selectedISO: string | null
  topN: number
  searchQuery: string
  activeTab: number
  setContinent: (c: string | null) => void
  setMetric: (m: Metric) => void
  setSelectedISO: (iso: string | null) => void
  setTopN: (n: number) => void
  setSearch: (q: string) => void
  setActiveTab: (t: number) => void
  filteredCountries: CountrySummary[]
  topCountries: CountrySummary[]
  getMetricValue: (c: CountrySummary) => number
}

const Ctx = createContext<DashboardState | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [continents, setContinents] = useState<ContinentSummary[]>([])
  const [timeSeries, setTimeSeries] = useState<TimeSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContinent, setContinent] = useState<string | null>(null)
  const [selectedMetric, setMetric] = useState<Metric>('total_cases')
  const [selectedISO, setSelectedISO] = useState<string | null>(null)
  const [topN, setTopN] = useState(15)
  const [searchQuery, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    Promise.all([fetchCountries(), fetchContinents(), fetchTimeSeries()])
      .then(([c, cont, ts]) => {
        setCountries(c)
        setContinents(cont)
        setTimeSeries(ts)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const getMetricValue = useCallback((c: CountrySummary): number => {
    const map: Record<Metric, number> = {
      total_cases: c.total_cases,
      total_deaths: c.total_deaths,
      vaccination_rate: c.vaccination_rate,
      case_fatality_rate: c.case_fatality_rate,
      cases_per_million: c.cases_per_million,
      deaths_per_million: c.deaths_per_million,
      gdp_per_capita: c.gdp_per_capita,
    }
    return map[selectedMetric] ?? 0
  }, [selectedMetric])

  const filteredCountries = countries
    .filter(c => !selectedContinent || c.continent === selectedContinent)
    .filter(c => !searchQuery || c.country.toLowerCase().includes(searchQuery.toLowerCase()))

  const topCountries = [...filteredCountries]
    .sort((a, b) => (getMetricValue(b) ?? 0) - (getMetricValue(a) ?? 0))
    .slice(0, topN)

  return (
    <Ctx.Provider value={{
      countries, continents, timeSeries, loading, error,
      selectedContinent, selectedMetric, selectedISO, topN, searchQuery, activeTab,
      setContinent, setMetric, setSelectedISO, setTopN, setSearch, setActiveTab,
      filteredCountries, topCountries, getMetricValue,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDashboard must be inside DashboardProvider')
  return ctx
}
