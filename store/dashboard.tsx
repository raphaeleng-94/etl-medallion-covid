'use client'
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { CountrySummary, ContinentSummary, TimeSeries, fetchCountries, fetchContinents, fetchTimeSeries } from '@/lib/supabase'

export type Metric = 'total_cases' | 'total_deaths' | 'vaccination_rate' | 'case_fatality_rate' | 'cases_per_million' | 'deaths_per_million' | 'gdp_per_capita'

export const METRIC_LABELS: Record<Metric, string> = {
  total_cases: 'Total Cases', total_deaths: 'Total Deaths',
  vaccination_rate: 'Vaccination %', case_fatality_rate: 'CFR %',
  cases_per_million: 'Cases / Million', deaths_per_million: 'Deaths / Million',
  gdp_per_capita: 'GDP per Capita',
}

export const CONTINENT_COLORS: Record<string, string> = {
  'Asia': '#00d4ff', 'Europe': '#bd10e0', 'North America': '#ff6b35',
  'South America': '#39ff14', 'Africa': '#ffcc00', 'Oceania': '#ff4488',
}

// Static fallback data — used if Supabase fetch fails or returns empty
const FALLBACK_COUNTRIES: CountrySummary[] = [
  { id:1, country:'United States', iso_code:'USA', continent:'North America', population:331449281, gdp_per_capita:54225, human_development_index:0.926, total_cases:103436829, total_deaths:1144877, total_vaccinations:678000000, people_fully_vaccinated:230000000, case_fatality_rate:1.11, vaccination_rate:69.4, cases_per_million:312074, deaths_per_million:3454, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:2, country:'China', iso_code:'CHN', continent:'Asia', population:1439323776, gdp_per_capita:16907, human_development_index:0.761, total_cases:99228000, total_deaths:121000, total_vaccinations:3500000000, people_fully_vaccinated:1260000000, case_fatality_rate:0.12, vaccination_rate:87.5, cases_per_million:68941, deaths_per_million:84, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:3, country:'India', iso_code:'IND', continent:'Asia', population:1380004385, gdp_per_capita:6461, human_development_index:0.645, total_cases:44689000, total_deaths:530000, total_vaccinations:2200000000, people_fully_vaccinated:890000000, case_fatality_rate:1.19, vaccination_rate:64.5, cases_per_million:32383, deaths_per_million:384, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:4, country:'France', iso_code:'FRA', continent:'Europe', population:67391582, gdp_per_capita:39031, human_development_index:0.901, total_cases:38999000, total_deaths:162000, total_vaccinations:156000000, people_fully_vaccinated:52000000, case_fatality_rate:0.42, vaccination_rate:77.2, cases_per_million:578692, deaths_per_million:2404, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:5, country:'Germany', iso_code:'DEU', continent:'Europe', population:83900471, gdp_per_capita:45724, human_development_index:0.942, total_cases:38427000, total_deaths:174979, total_vaccinations:190000000, people_fully_vaccinated:61000000, case_fatality_rate:0.46, vaccination_rate:72.7, cases_per_million:458007, deaths_per_million:2086, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:6, country:'Brazil', iso_code:'BRA', continent:'South America', population:214326223, gdp_per_capita:14103, human_development_index:0.765, total_cases:37519960, total_deaths:702116, total_vaccinations:487000000, people_fully_vaccinated:160000000, case_fatality_rate:1.87, vaccination_rate:74.7, cases_per_million:175060, deaths_per_million:3276, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:7, country:'Japan', iso_code:'JPN', continent:'Asia', population:126476461, gdp_per_capita:40247, human_development_index:0.919, total_cases:33803572, total_deaths:73000, total_vaccinations:370000000, people_fully_vaccinated:100000000, case_fatality_rate:0.22, vaccination_rate:79.1, cases_per_million:267272, deaths_per_million:577, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:8, country:'South Korea', iso_code:'KOR', continent:'Asia', population:51744876, gdp_per_capita:33590, human_development_index:0.925, total_cases:30615000, total_deaths:34000, total_vaccinations:130000000, people_fully_vaccinated:44000000, case_fatality_rate:0.11, vaccination_rate:85.0, cases_per_million:591600, deaths_per_million:657, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:9, country:'Italy', iso_code:'ITA', continent:'Europe', population:60297396, gdp_per_capita:35220, human_development_index:0.892, total_cases:26562000, total_deaths:194000, total_vaccinations:131000000, people_fully_vaccinated:47000000, case_fatality_rate:0.73, vaccination_rate:78.0, cases_per_million:440517, deaths_per_million:3217, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:10, country:'United Kingdom', iso_code:'GBR', continent:'Europe', population:67215293, gdp_per_capita:40285, human_development_index:0.932, total_cases:24749000, total_deaths:232112, total_vaccinations:140000000, people_fully_vaccinated:49000000, case_fatality_rate:0.94, vaccination_rate:72.9, cases_per_million:368205, deaths_per_million:3453, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:11, country:'Russia', iso_code:'RUS', continent:'Europe', population:145912025, gdp_per_capita:26491, human_development_index:0.824, total_cases:22879000, total_deaths:395049, total_vaccinations:150000000, people_fully_vaccinated:82000000, case_fatality_rate:1.73, vaccination_rate:56.2, cases_per_million:156800, deaths_per_million:2707, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:12, country:'Mexico', iso_code:'MEX', continent:'North America', population:128932753, gdp_per_capita:19900, human_development_index:0.779, total_cases:7633000, total_deaths:334336, total_vaccinations:164000000, people_fully_vaccinated:56000000, case_fatality_rate:4.38, vaccination_rate:43.4, cases_per_million:59201, deaths_per_million:2593, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:13, country:'Australia', iso_code:'AUS', continent:'Oceania', population:25499884, gdp_per_capita:48758, human_development_index:0.944, total_cases:11390000, total_deaths:22000, total_vaccinations:65000000, people_fully_vaccinated:21000000, case_fatality_rate:0.19, vaccination_rate:82.4, cases_per_million:446669, deaths_per_million:863, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:14, country:'Argentina', iso_code:'ARG', continent:'South America', population:45376763, gdp_per_capita:18934, human_development_index:0.845, total_cases:10044000, total_deaths:130472, total_vaccinations:97000000, people_fully_vaccinated:37000000, case_fatality_rate:1.30, vaccination_rate:81.5, cases_per_million:221347, deaths_per_million:2875, last_update:'2023-05-11', updated_at:'2023-05-11' },
  { id:15, country:'South Africa', iso_code:'ZAF', continent:'Africa', population:59308690, gdp_per_capita:12032, human_development_index:0.713, total_cases:4073000, total_deaths:102595, total_vaccinations:35000000, people_fully_vaccinated:14000000, case_fatality_rate:2.52, vaccination_rate:23.6, cases_per_million:68675, deaths_per_million:1730, last_update:'2023-05-11', updated_at:'2023-05-11' },
]

const FALLBACK_CONTINENTS: ContinentSummary[] = [
  { id:1, continent:'Europe', total_countries:20, population:722642999, total_cases:232818000, total_deaths:1792590, total_vaccinations:1200000000, avg_case_fatality_rate:0.78, avg_vaccination_rate:68.75, cases_per_million:322158, deaths_per_million:2480, updated_at:'2023-05-11' },
  { id:2, continent:'Asia', total_countries:16, population:4041457949, total_cases:227035095, total_deaths:1293080, total_vaccinations:8000000000, avg_case_fatality_rate:1.07, avg_vaccination_rate:66.43, cases_per_million:56178, deaths_per_million:320, updated_at:'2023-05-11' },
  { id:3, continent:'North America', total_countries:4, population:509450804, total_cases:116943829, total_deaths:1542743, total_vaccinations:900000000, avg_case_fatality_rate:1.85, avg_vaccination_rate:65.07, cases_per_million:229551, deaths_per_million:3028, updated_at:'2023-05-11' },
  { id:4, continent:'South America', total_countries:5, population:363665065, total_cases:63131960, total_deaths:1260530, total_vaccinations:700000000, avg_case_fatality_rate:2.34, avg_vaccination_rate:64.40, cases_per_million:173568, deaths_per_million:3466, updated_at:'2023-05-11' },
  { id:5, continent:'Africa', total_countries:7, population:573428125, total_cases:6969000, total_deaths:160102, total_vaccinations:200000000, avg_case_fatality_rate:2.16, avg_vaccination_rate:24.61, cases_per_million:12154, deaths_per_million:279, updated_at:'2023-05-11' },
  { id:6, continent:'Oceania', total_countries:2, population:30322117, total_cases:13650000, total_deaths:25100, total_vaccinations:80000000, avg_case_fatality_rate:0.17, avg_vaccination_rate:79.54, cases_per_million:450149, deaths_per_million:828, updated_at:'2023-05-11' },
]

interface DashboardState {
  countries: CountrySummary[]; continents: ContinentSummary[]; timeSeries: TimeSeries[]
  loading: boolean; error: string | null; usingFallback: boolean
  selectedContinent: string | null; selectedMetric: Metric; selectedISO: string | null
  topN: number; searchQuery: string; activeTab: number
  setContinent: (c: string | null) => void; setMetric: (m: Metric) => void
  setSelectedISO: (iso: string | null) => void; setTopN: (n: number) => void
  setSearch: (q: string) => void; setActiveTab: (t: number) => void
  filteredCountries: CountrySummary[]; topCountries: CountrySummary[]
  getMetricValue: (c: CountrySummary) => number
}

const Ctx = createContext<DashboardState | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [countries, setCountries] = useState<CountrySummary[]>([])
  const [continents, setContinents] = useState<ContinentSummary[]>([])
  const [timeSeries, setTimeSeries] = useState<TimeSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [selectedContinent, setContinent] = useState<string | null>(null)
  const [selectedMetric, setMetric] = useState<Metric>('total_cases')
  const [selectedISO, setSelectedISO] = useState<string | null>(null)
  const [topN, setTopN] = useState(15)
  const [searchQuery, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    Promise.all([fetchCountries(), fetchContinents(), fetchTimeSeries()])
      .then(([c, cont, ts]) => {
        if (c.length === 0) {
          // Supabase returned empty — use fallback
          setCountries(FALLBACK_COUNTRIES)
          setContinents(FALLBACK_CONTINENTS)
          setUsingFallback(true)
        } else {
          setCountries(c)
          setContinents(cont)
          setTimeSeries(ts)
        }
      })
      .catch(e => {
        console.error('Supabase fetch failed:', e)
        // Use fallback data on error
        setCountries(FALLBACK_COUNTRIES)
        setContinents(FALLBACK_CONTINENTS)
        setUsingFallback(true)
        setError(null) // Don't show error to user — show fallback data
      })
      .finally(() => setLoading(false))
  }, [])

  const getMetricValue = useCallback((c: CountrySummary): number => {
    const map: Record<Metric, number> = {
      total_cases: c.total_cases, total_deaths: c.total_deaths,
      vaccination_rate: c.vaccination_rate, case_fatality_rate: c.case_fatality_rate,
      cases_per_million: c.cases_per_million, deaths_per_million: c.deaths_per_million,
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
      countries, continents, timeSeries, loading, error, usingFallback,
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
