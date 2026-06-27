import { useEffect, useState } from 'react'
import { addSeconds } from 'date-fns'
import { Globe, Clock, MapPin, Sparkles, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface City {
  name: string
  country: string
  timezone: string
  gradient: string
  shadow: string
}

const CITIES: City[] = [
  { name: 'New York', country: 'USA', timezone: 'America/New_York', gradient: 'from-rose-300 to-orange-200', shadow: 'shadow-rose-200' },
  { name: 'London', country: 'UK', timezone: 'Europe/London', gradient: 'from-blue-300 to-indigo-200', shadow: 'shadow-blue-200' },
  { name: 'Paris', country: 'France', timezone: 'Europe/Paris', gradient: 'from-violet-300 to-purple-200', shadow: 'shadow-violet-200' },
  { name: 'Berlin', country: 'Germany', timezone: 'Europe/Berlin', gradient: 'from-emerald-300 to-teal-200', shadow: 'shadow-emerald-200' },
  { name: 'Dubai', country: 'UAE', timezone: 'Asia/Dubai', gradient: 'from-amber-300 to-yellow-200', shadow: 'shadow-amber-200' },
  { name: 'Tehran', country: 'Iran', timezone: 'Asia/Tehran', gradient: 'from-emerald-300 to-rose-300', shadow: 'shadow-emerald-200' },
  { name: 'Mumbai', country: 'India', timezone: 'Asia/Kolkata', gradient: 'from-fuchsia-300 to-pink-200', shadow: 'shadow-fuchsia-200' },
  { name: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', gradient: 'from-cyan-300 to-sky-200', shadow: 'shadow-cyan-200' },
  { name: 'Hong Kong', country: 'China', timezone: 'Asia/Hong_Kong', gradient: 'from-red-300 to-rose-200', shadow: 'shadow-red-200' },
  { name: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', gradient: 'from-indigo-300 to-blue-200', shadow: 'shadow-indigo-200' },
  { name: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', gradient: 'from-lime-300 to-green-200', shadow: 'shadow-lime-200' },
  { name: 'São Paulo', country: 'Brazil', timezone: 'America/Sao_Paulo', gradient: 'from-green-300 to-emerald-200', shadow: 'shadow-green-200' },
  { name: 'Los Angeles', country: 'USA', timezone: 'America/Los_Angeles', gradient: 'from-orange-300 to-amber-200', shadow: 'shadow-orange-200' },
  { name: 'Istanbul', country: 'Turkey', timezone: 'Europe/Istanbul', gradient: 'from-sky-300 to-amber-300', shadow: 'shadow-sky-200' },
  { name: 'Toronto', country: 'Canada', timezone: 'America/Toronto', gradient: 'from-red-300 to-orange-300', shadow: 'shadow-red-200' },
  { name: 'Seoul', country: 'South Korea', timezone: 'Asia/Seoul', gradient: 'from-purple-300 to-fuchsia-300', shadow: 'shadow-purple-200' },
]

async function fetchServerUtc(): Promise<Date> {
  const errors: string[] = []

  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { unixtime: number }
      return new Date(data.unixtime * 1000)
    }
  } catch (err) {
    errors.push(`worldtimeapi: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  try {
    const res = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { dateTime: string; year: number; month: number; day: number; hour: number; minute: number; seconds: number; milliSeconds: number }
      const date = new Date(Date.UTC(data.year, data.month - 1, data.day, data.hour, data.minute, data.seconds, data.milliSeconds))
      if (!Number.isNaN(date.getTime())) return date
    }
  } catch (err) {
    errors.push(`timeapi.io: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  try {
    const res = await fetch('https://worldtimeapi.org/api/ip', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { unixtime: number }
      return new Date(data.unixtime * 1000)
    }
  } catch (err) {
    errors.push(`worldtimeapi ip: ${err instanceof Error ? err.message : 'unknown'}`)
  }

  throw new Error(`All time sources failed: ${errors.join('; ')}`)
}

function formatZonedTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function formatZonedDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(date)
}

function formatZonedLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function formatZonedOffset(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')
  return part?.value ?? ''
}

function getZonedHour(date: Date, timeZone: string) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hour12: false })
    .formatToParts(date)
    .find((p) => p.type === 'hour')
  return Number(part?.value ?? 0)
}

function getCityStatus(hour: number) {
  if (hour >= 6 && hour < 12) return { label: 'Morning', icon: <Sparkles className="w-4 h-4" /> }
  if (hour >= 12 && hour < 18) return { label: 'Afternoon', icon: <Globe className="w-4 h-4" /> }
  if (hour >= 18 && hour < 22) return { label: 'Evening', icon: <Clock className="w-4 h-4" /> }
  return { label: 'Night', icon: <MapPin className="w-4 h-4" /> }
}

function App() {
  const [baseUtc, setBaseUtc] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetchServerUtc()
      .then((date) => {
        if (!cancelled) {
          setBaseUtc(date)
          setTick(0)
          setLoading(false)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [retryKey])

  useEffect(() => {
    if (!baseUtc) return
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [baseUtc])

  const now = baseUtc ? addSeconds(baseUtc, tick) : null

  const retry = () => {
    setBaseUtc(null)
    setTick(0)
    setLoading(true)
    setError(null)
    setRetryKey((k) => k + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-yellow-50 to-cyan-50">
        <div className="flex flex-col items-center gap-4 text-indigo-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-lg font-medium">Syncing with world time…</p>
        </div>
      </div>
    )
  }

  if (error || !now) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-yellow-50 to-cyan-50 p-6">
        <div className="flex flex-col items-center gap-5 text-rose-600 max-w-md text-center">
          <AlertCircle className="w-10 h-10" />
          <p className="text-lg font-medium">Could not sync with the world clock.</p>
          <p className="text-sm text-rose-500">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const utcDate = now
  const utcTime = formatZonedTime(utcDate, 'UTC')
  const utcDateLabel = formatZonedLongDate(utcDate, 'UTC')
  const utcOffset = formatZonedOffset(utcDate, 'UTC')

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50 to-cyan-50 text-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm shadow-sm border border-white/50 mb-6">
            <Globe className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">World Clock</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Time Around the Globe
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
            Synchronized with an independent time server so your local clock settings never affect what you see.
          </p>
        </header>

        <section className="relative rounded-[2.5rem] p-8 md:p-12 mb-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-purple-200 overflow-hidden">
          <div className="absolute inset-0 bg-white/10 rounded-[2.5rem]" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4">
                <Clock className="w-4 h-4" />
                Coordinated Universal Time
              </div>
              <h2 className="text-6xl md:text-8xl font-mono font-bold tracking-tighter tabular-nums">
                {utcTime}
              </h2>
              <p className="mt-2 text-xl md:text-2xl font-medium opacity-90">
                {utcDateLabel}
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-7xl md:text-9xl font-black opacity-20">UTC</span>
              <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm font-mono font-semibold">
                {utcOffset}
              </span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CITIES.map((city) => {
            const cityTime = formatZonedTime(now, city.timezone)
            const cityDate = formatZonedDate(now, city.timezone)
            const cityOffset = formatZonedOffset(now, city.timezone)
            const hour = getZonedHour(now, city.timezone)
            const status = getCityStatus(hour)

            return (
              <div
                key={city.timezone}
                className={`group relative rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 p-6 shadow-lg ${city.shadow} hover:-translate-y-2 hover:shadow-xl transition-all duration-300`}
              >
                <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-3xl bg-gradient-to-r ${city.gradient}`} />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{city.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">{city.country}</p>
                  </div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${city.gradient} text-white shadow-md`}>
                    <Globe className="w-5 h-5" />
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-4xl font-mono font-bold tracking-tight text-slate-900 tabular-nums">
                    {cityTime}
                  </p>
                  <p className="text-sm font-medium text-slate-500 mt-1">{cityDate}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold font-mono">
                    {cityOffset}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    {status.icon}
                    {status.label}
                  </span>
                </div>
              </div>
            )
          })}
        </section>

        <footer className="mt-16 text-center text-sm text-slate-400">
          <p>Times are powered by worldtimeapi.org, date-fns, and the browser&apos;s Intl API.</p>
        </footer>
      </div>
    </div>
  )
}

export default App
