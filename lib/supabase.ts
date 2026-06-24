import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(url, key)

// ── Types ─────────────────────────────────────────────────────
export interface CountrySummary {
  id: number
  country: string
  iso_code: string
  continent: string
  population: number
  gdp_per_capita: number
  human_development_index: number
  total_cases: number
  total_deaths: number
  total_vaccinations: number
  people_fully_vaccinated: number
  case_fatality_rate: number
  vaccination_rate: number
  cases_per_million: number
  deaths_per_million: number
  last_update: string
  updated_at: string
}

export interface ContinentSummary {
  id: number
  continent: string
  total_countries: number
  population: number
  total_cases: number
  total_deaths: number
  total_vaccinations: number
  avg_case_fatality_rate: number
  avg_vaccination_rate: number
  cases_per_million: number
  deaths_per_million: number
  updated_at: string
}

export interface TimeSeries {
  id: number
  date: string
  continent: string
  total_cases: number
  new_cases: number
  total_deaths: number
  new_deaths: number
  total_vaccinations: number
  rolling_7day_cases: number
  rolling_7day_deaths: number
}

// ── Fetchers ──────────────────────────────────────────────────
export async function fetchCountries(): Promise<CountrySummary[]> {
  const { data, error } = await supabase
    .schema('gold')
    .from('covid_country_summary')
    .select('*')
    .order('total_cases', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchContinents(): Promise<ContinentSummary[]> {
  const { data, error } = await supabase
    .schema('gold')
    .from('covid_continent_summary')
    .select('*')
    .order('total_cases', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchTimeSeries(): Promise<TimeSeries[]> {
  const { data, error } = await supabase
    .schema('gold')
    .from('covid_time_series')
    .select('*')
    .order('date', { ascending: true })
  if (error) throw error
  return data ?? []
}
