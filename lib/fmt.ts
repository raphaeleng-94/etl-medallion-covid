export const fmtBig = (n: number | null | undefined): string => {
  if (n == null) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return Math.round(n).toLocaleString()
}

export const fmtNum = (n: number | null | undefined): string =>
  n == null ? '—' : Math.round(n).toLocaleString('en-US')

export const fmtPct = (n: number | null | undefined, dec = 2): string =>
  n == null ? '—' : `${(+n).toFixed(dec)}%`

export const fmtUSD = (n: number | null | undefined): string =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`

export const FLAGS: Record<string, string> = {
  USA:'🇺🇸',CHN:'🇨🇳',IND:'🇮🇳',FRA:'🇫🇷',DEU:'🇩🇪',BRA:'🇧🇷',JPN:'🇯🇵',ITA:'🇮🇹',
  GBR:'🇬🇧',RUS:'🇷🇺',TUR:'🇹🇷',ESP:'🇪🇸',VNM:'🇻🇳',AUS:'🇦🇺',ARG:'🇦🇷',NLD:'🇳🇱',
  MEX:'🇲🇽',IRN:'🇮🇷',IDN:'🇮🇩',POL:'🇵🇱',COL:'🇨🇴',GRC:'🇬🇷',PRT:'🇵🇹',UKR:'🇺🇦',
  MYS:'🇲🇾',ISR:'🇮🇱',CAN:'🇨🇦',THA:'🇹🇭',CHL:'🇨🇱',BEL:'🇧🇪',PER:'🇵🇪',CHE:'🇨🇭',
  PHL:'🇵🇭',ZAF:'🇿🇦',DNK:'🇩🇰',SWE:'🇸🇪',NZL:'🇳🇿',BGD:'🇧🇩',PAK:'🇵🇰',NOR:'🇳🇴',
  FIN:'🇫🇮',MAR:'🇲🇦',CUB:'🇨🇺',SAU:'🇸🇦',EGY:'🇪🇬',ETH:'🇪🇹',KEN:'🇰🇪',NGA:'🇳🇬',
}
