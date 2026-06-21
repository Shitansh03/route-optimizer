import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser } from '../features/auth/authSlice'
import {
  useGetMyRoutesQuery,
  useGetRouteByIdQuery,
  useCreateRouteMutation,
  useAddStopsMutation,
  useSetStartLocationMutation,
  useOptimizeRouteMutation,
  useDeleteRouteMutation,
} from '../features/routes/routesApiSlice'
import { useGeocodeSingleMutation } from '../features/extract/extractApiSlice'
import DeliveryMap from '../components/map/DeliveryMap'
import TextInput from '../components/input/TextInput'
import VoiceInput from '../components/input/VoiceInput'
import ScreenshotUpload from '../components/input/ScreenshotUpload'
import ScreenRecording from '../components/input/ScreenRecording'
import AddressReview from '../components/common/AddressReview'
import toast from 'react-hot-toast'
import AddressSearchInput from '../components/input/AddressSearchInput'
import { Pencil, Clock, MapPin, Map, Fuel, Zap, Rocket, Trash2, Check, MapPinned, Search } from 'lucide-react'

const SAVED_START_KEY = 'routeopti_saved_start'

const INPUT_METHODS = [
  {
    id: 'text',
    label: 'Text',
    description: 'Type or paste addresses one by one or in bulk',
    color: '#6366f1',
    bg: '#eef2ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: 'screenshot',
    label: 'Screenshot',
    description: 'Upload a screenshot of addresses or locations',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'voice',
    label: 'Voice Input',
    description: 'Speak the addresses and add as stops',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    id: 'recording',
    label: 'Screen Recording',
    description: 'Upload a screen recording of your delivery app',
    color: '#d97706',
    bg: '#fffbeb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
]


function StartingPointModal({ onConfirm, onClose, isOpen, geocodeSingle }) {
  const [mode, setMode] = useState('gps')
  const [rememberMe, setRememberMe] = useState(true)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsError, setGpsError] = useState('')
  const [confirmed, setConfirmed] = useState(null)
  const [geocoding, setGeocoding] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setConfirmed(null)
    setGpsError('')
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_START_KEY) || 'null')
      if (saved?.lat) { setConfirmed(saved); setMode('manual') }
    } catch { }
  }, [isOpen])

  async function handleGetGPS() {
    setGpsError('')
    setGpsLoading(true)
    setConfirmed(null)
    if (!navigator.geolocation) {
      setGpsError('GPS not available. Please search your location.')
      setGpsLoading(false)
      setMode('manual')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'RouteOptimizer/1.0' } }
          )
          const data = await res.json()
          const address = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(', ')
            : `${lat.toFixed(5)}, ${lng.toFixed(5)}`
          setConfirmed({ lat, lng, address })
        } catch {
          setConfirmed({ lat, lng, address: 'Your current location' })
        }
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        setGpsError(err.code === 1
          ? 'Location access denied. Please search your location below.'
          : 'Could not detect GPS. Please search manually.')
        setMode('manual')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  async function handleAddressSelect(suggestion) {
    if (suggestion.lat && suggestion.lng) {
      setConfirmed({ lat: suggestion.lat, lng: suggestion.lng, address: suggestion.label })
    } else {
      const text = suggestion.label || suggestion.value || suggestion
      if (!text) return
      setGeocoding(true)
      setConfirmed(null)
      try {
        const res = await geocodeSingle(text).unwrap()
        if (res?.result?.lat) {
          setConfirmed({
            lat: res.result.lat,
            lng: res.result.lng,
            address: res.result.formattedAddress || text
          })
        } else {
          setGpsError('Location not found. Try adding city name or PIN code.')
        }
      } catch {
        setGpsError('Could not find this location. Please try again.')
      } finally {
        setGeocoding(false)
      }
    }
  }

  function handleConfirm() {
    if (!confirmed) return
    if (rememberMe) {
      localStorage.setItem(SAVED_START_KEY, JSON.stringify(confirmed))
    } else {
      localStorage.removeItem(SAVED_START_KEY)
    }
    onConfirm(confirmed)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadein">

        <div className="px-7 pt-7 pb-5"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Set your starting point</h2>
              <p className="text-white/70 text-xs">Hub, warehouse, or home — where you start from</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6 space-y-5">

          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl">
            {[
              { id: 'gps', label: 'Use GPS', sub: 'Auto-detect', icon: MapPinned },
              { id: 'manual', label: 'Search', sub: 'Type & search', icon: Search },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setConfirmed(null); setGpsError('') }}
                className={`py-3 rounded-xl text-center transition-all ${mode === m.id ? 'bg-white shadow-md text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="text-sm font-semibold flex items-center justify-center gap-1.5">
                  <m.icon size={14} /> {m.label}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
              </button>
            ))}
          </div>

          {mode === 'gps' && (
            <div className="space-y-3">
              <button
                onClick={handleGetGPS}
                disabled={gpsLoading}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm
                           flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
              >
                {gpsLoading ? (
                  <>
                    <svg className="animate-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" viewBox="0 0 24 24" />
                    Detecting location...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                      <circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
                      <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                    </svg>
                    Detect My Location
                  </>
                )}
              </button>
              {gpsError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                  {gpsError}
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Search your starting location
              </label>
              <AddressSearchInput
                placeholder="Type hub name, colony, area..."
                onSelect={handleAddressSelect}
                onTextChange={() => { setConfirmed(null); setGpsError('') }}
                autoFocus
              />
              {geocoding && (
                <div className="flex items-center gap-2 text-xs text-indigo-600">
                  <svg className="animate-spinner w-3 h-3 border-2 border-indigo-200 border-t-indigo-600 rounded-full" viewBox="0 0 24 24" />
                  Finding location...
                </div>
              )}
              {gpsError && !geocoding && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">
                  {gpsError}
                </div>
              )}
              <p className="text-xs text-gray-400">
                Finds buildings, streets, areas, and landmarks across India
              </p>
            </div>
          )}

          {confirmed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
              <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-green-800">Location set!</p>
                <p className="text-xs text-green-700 mt-0.5 leading-relaxed">{confirmed.address}</p>
                <p className="text-xs text-green-500 mt-0.5">
                  {confirmed.lat?.toFixed(5)}, {confirmed.lng?.toFixed(5)}
                </p>
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                          transition-all cursor-pointer shrink-0 ${rememberMe ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 hover:border-indigo-300'
                }`}
            >
              {rememberMe && (
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Remember this location</p>
              <p className="text-xs text-gray-400">Skip this step next time</p>
            </div>
          </label>
        </div>

        <div className="px-7 pb-7 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-medium
                             text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!confirmed || geocoding}
            className="py-3 px-6 rounded-2xl text-white text-sm font-bold transition-all
                       hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{ flex: 2, background: confirmed ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : '#d1d5db' }}
          >
            {geocoding ? (
              'Finding location...'
            ) : confirmed ? (
              <span className="flex items-center justify-center gap-1.5">
                <Check size={14} /> Set Starting Point
              </span>
            ) : (
              'Choose a location first'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const user = useSelector(selectCurrentUser)
  const navigate = useNavigate()

  const [activeRouteId, setActiveRouteId] = useState(null)
  const [pendingReview, setPendingReview] = useState(null)
  const [activeInput, setActiveInput] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [mapView, setMapView] = useState('Map')
  const [showStartModal, setShowStartModal] = useState(false)
  const [pendingOptimize, setPendingOptimize] = useState(false)

  const { data: routes = [], refetch: refetchRoutes } = useGetMyRoutesQuery()

  const { data: activeRouteFresh, refetch: refetchActive } = useGetRouteByIdQuery(
    activeRouteId,
    { skip: !activeRouteId, pollingInterval: 0 }
  )

  const [createRoute] = useCreateRouteMutation()
  const [addStops] = useAddStopsMutation()
  const [setStartLocation] = useSetStartLocationMutation()
  const [optimizeRoute] = useOptimizeRouteMutation()
  const [deleteRoute] = useDeleteRouteMutation()
  const [geocodeSingle] = useGeocodeSingleMutation()

  useEffect(() => {
    if (!activeRouteId && routes.length > 0) {
      const existing =
        routes.find(r => r.status === 'active') ||
        routes.find(r => r.status === 'draft')
      if (existing) setActiveRouteId(existing._id)
    }
  }, [routes, activeRouteId])

  const currentRoute = activeRouteFresh || null
  const stops = currentRoute?.stops || []
  const delivered = stops.filter(s => s.status === 'delivered').length
  const failed = stops.filter(s => s.status === 'failed').length
  const pending = stops.filter(s => s.status === 'pending').length
  const isOptimized = (currentRoute?.optimizedOrder?.length || 0) > 0
  const totalDist = currentRoute?.totalDistance || '—'
  const estTime = currentRoute?.estimatedTime || '—'
  const hasStartLoc = !!(currentRoute?.startLocation?.lat)

  async function ensureRoute() {
    if (activeRouteId && currentRoute) return currentRoute
    const today = new Date().toISOString().split('T')[0]
    const newRoute = await createRoute({ date: today }).unwrap()
    setActiveRouteId(newRoute._id)
    return newRoute
  }

  async function handleStartConfirmed(location) {
    setShowStartModal(false)
    const route = await ensureRoute()

    try {
      await setStartLocation({
        routeId: route._id,
        startLocation: {
          lat: location.lat,
          lng: location.lng,
          address: location.address
        }
      }).unwrap()

      refetchActive()
      toast.success('Starting point set! Optimizing your route...', { duration: 3000 })

      await runOptimize(route._id)
    } catch {
      toast.error('Failed to set starting point. Try again.')
    }
  }

  async function runOptimize(routeId) {
    setIsOptimizing(true)
    toast.loading('Finding the best route...', { id: 'optimizing' })

    try {
      await optimizeRoute(routeId || currentRoute._id).unwrap()
      refetchActive()
      toast.dismiss('optimizing')
      toast.success('Route optimized! Ready to navigate.', { duration: 4000 })
    } catch (err) {
      toast.dismiss('optimizing')
      toast.error(err?.data?.msg || 'Optimization failed. Try again.')
    } finally {
      setIsOptimizing(false)
    }
  }

  async function handleOptimizeClick() {
    if (!currentRoute?._id) {
      toast.error('Add some stops first!')
      return
    }
    if (stops.length < 2) {
      toast.error('Add at least 2 stops to optimize.')
      return
    }

    const saved = localStorage.getItem(SAVED_START_KEY)

    if (hasStartLoc) {
      await runOptimize()
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved)
        await setStartLocation({
          routeId: currentRoute._id,
          startLocation: parsed
        }).unwrap()
        refetchActive()
        await runOptimize()
      } catch {
        setShowStartModal(true)
      }
    } else {
      setShowStartModal(true)
    }
  }

  async function handleAddressesReady(addresses, needsReview = []) {
    setActiveInput(null)
    const hasLowConfidence = addresses.some(a => a.confidence !== 'high')
    if (hasLowConfidence || needsReview.length > 0) {
      setPendingReview(addresses)
      return
    }
    await addApprovedAddresses(addresses)
  }

  async function addApprovedAddresses(addresses) {
    const route = await ensureRoute()
    toast.loading(`Finding locations for ${addresses.length} address${addresses.length > 1 ? 'es' : ''}...`, { id: 'geocoding' })

    const validStops = []
    for (const addr of addresses) {
      try {
        let lat, lng, formattedAddress

        if (addr.geocoded?.lat) {
          lat = addr.geocoded.lat
          lng = addr.geocoded.lng
          formattedAddress = addr.geocoded.formattedAddress || addr.cleaned
        } else {
          const res = await geocodeSingle(addr.cleaned).unwrap()
          if (res.result) {
            lat = res.result.lat
            lng = res.result.lng
            formattedAddress = res.result.formattedAddress || addr.cleaned
          }
        }

        if (lat && lng) {
          validStops.push({
            address: formattedAddress || addr.cleaned,
            lat, lng,
            status: 'pending'
          })
        }
      } catch {
        console.error('Geocode failed:', addr.cleaned)
      }
    }

    toast.dismiss('geocoding')

    if (validStops.length === 0) {
      toast.error('No locations found. Try adding city name or PIN code.')
      return
    }

    await addStops({ routeId: route._id, stops: validStops }).unwrap()
    refetchActive()
    toast.success(`Added ${validStops.length} stop${validStops.length > 1 ? 's' : ''} to your route!`)
  }

  async function handleClearAll() {
    if (!currentRoute?._id) return
    if (!window.confirm('Delete this route and all stops? This cannot be undone.')) return
    try {
      await deleteRoute(currentRoute._id).unwrap()
      setActiveRouteId(null)
      localStorage.removeItem(SAVED_START_KEY)
      toast.success('Route cleared.')
    } catch {
      toast.error('Failed to clear.')
    }
  }

  async function handleChangeStart() {
    if (!currentRoute?._id) {
      toast.error('Add stops first, then set starting point.')
      return
    }
    setShowStartModal(true)
  }

  function handleStartDelivery() {
    if (!isOptimized) {
      toast.error('Optimize route first!')
      return
    }
    navigate(`/active/${currentRoute._id}`)
  }

  const timeSavedMins = Math.max(0, Math.round(stops.length * 8))
  const distSavedKm = (stops.length * 1.2).toFixed(1)
  const fuelSavedRs = Math.round(stops.length * 0.04 * 90)
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const hasSavedStart = !!localStorage.getItem(SAVED_START_KEY)
  let savedStartName = ''
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_START_KEY) || '{}')
    savedStartName = s.address || ''
  } catch { }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">

      <header className="shrink-0 h-16 bg-white border-b border-gray-100
                         flex items-center justify-between px-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Optimize Routes.{' '}
            <span style={{ color: '#4f46e5' }}>Save Time.</span>{' '}
            <span style={{ color: '#7c3aed' }}>Deliver More.</span>
          </h1>
          <p className="text-xs text-gray-400">
            Add your stops, set starting point, and get the fastest route.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(hasStartLoc || hasSavedStart) && (
            <button
              onClick={handleChangeStart}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl
                         border border-indigo-100 bg-indigo-50 hover:bg-indigo-100
                         transition-colors text-xs font-medium text-indigo-700"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="max-w-40 truncate">
                {hasStartLoc
                  ? (currentRoute?.startLocation?.address || 'Starting point set')
                  : savedStartName || 'Saved location'}
              </span>
              <Pencil size={12} className="text-indigo-400" />
            </button>
          )}

          <button className="w-9 h-9 rounded-xl bg-gray-50 flex items-center
                             justify-center text-gray-400 hover:bg-gray-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <circle cx="12" cy="12" r="5" />
              <path strokeLinecap="round"
                d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>

          <button className="w-9 h-9 rounded-xl bg-gray-50 flex items-center
                             justify-center text-gray-400 hover:bg-gray-100 relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-gray-100">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-600">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-800">Hello, {user?.name?.split(' ')[0]}</p>
              <p className="text-xs text-gray-400">{today}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">

        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-hidden
                          relative border border-gray-100">

            <div className="absolute top-4 left-4 z-10 bg-white rounded-xl
                            shadow-md px-4 py-2.5 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOptimized ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-xs font-bold text-gray-800">
                  {isOptimized ? 'Optimized Route' : 'Route Planner'}
                </span>
              </div>
              <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {stops.length} Stops
              </span>
              {isOptimized && (
                <>
                  <div className="pl-2 border-l border-gray-100">
                    <p className="text-xs text-gray-400">Distance</p>
                    <p className="text-sm font-bold text-gray-900">{totalDist}</p>
                  </div>
                  <div className="pl-2 border-l border-gray-100">
                    <p className="text-xs text-gray-400">Est. Time</p>
                    <p className="text-sm font-bold text-gray-900">{estTime}</p>
                  </div>
                </>
              )}
            </div>

            <div className="absolute bottom-4 left-4 z-10 flex bg-white rounded-xl
                            shadow overflow-hidden border border-gray-100">
              {['Map', 'Satellite'].map(view => (
                <button
                  key={view}
                  onClick={() => setMapView(view)}
                  className={`px-4 py-2 text-xs font-medium transition-colors ${mapView === view ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {view}
                </button>
              ))}
            </div>

            {isOptimized && (
              <button
                onClick={handleOptimizeClick}
                disabled={isOptimizing}
                className="absolute bottom-4 right-4 z-10 flex items-center gap-2
                           px-4 py-2 rounded-xl text-sm font-semibold text-indigo-700
                           bg-white border border-indigo-200 shadow hover:bg-indigo-50
                           transition-colors disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`w-4 h-4 ${isOptimizing ? 'animate-spinner' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-optimize
              </button>
            )}

            <DeliveryMap
              stops={stops}
              startLocation={currentRoute?.startLocation}
              optimizedOrder={currentRoute?.optimizedOrder || []}
              routeGeometry={currentRoute?.routeGeometry}
              height="100%"
            />

            {stops.length === 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center
                              bg-white/80 backdrop-blur-sm rounded-2xl pointer-events-none">
                <div className="text-center px-6">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center
                                  justify-center bg-indigo-50">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.5} className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">No stops yet</h3>
                  <p className="text-sm text-gray-400">Add locations using the panel on the right →</p>
                  <p className="text-xs text-gray-300 mt-1">Works for delivery, road trips, errands, and more</p>
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 grid grid-cols-4 gap-3">
            {[
              { label: 'Time Saved', value: `${Math.floor(timeSavedMins / 60)}h ${timeSavedMins % 60}m`, sub: 'vs unoptimized', color: '#22c55e', icon: Clock },
              { label: 'Distance Saved', value: `${distSavedKm} km`, sub: 'vs unoptimized', color: '#3b82f6', icon: MapPin },
              { label: 'Stops', value: stops.length, sub: 'Total Locations', color: '#8b5cf6', icon: Map },
              { label: 'Fuel Saved', value: `₹${fuelSavedRs}`, sub: 'Est. Savings', color: '#f59e0b', icon: Fuel },
            ].map(stat => (
              <div key={stat.label}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: stat.color + '15' }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Add Locations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Works for deliveries, errands, road trips, and more
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {INPUT_METHODS.map((method, idx) => (
              <div key={method.id}>
                <button
                  onClick={() => setActiveInput(activeInput === method.id ? null : method.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: method.bg, color: method.color }}>
                    {method.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{method.label}</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{method.description}</p>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${activeInput === method.id ? 'rotate-90' : ''
                      }`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {activeInput === method.id && (
                  <div className="px-4 pb-4 border-t border-gray-50 animate-fadein">
                    <div className="pt-3">
                      {method.id === 'text' && <TextInput onAddressesReady={handleAddressesReady} />}
                      {method.id === 'voice' && <VoiceInput onAddressesReady={handleAddressesReady} />}
                      {method.id === 'screenshot' && <ScreenshotUpload onAddressesReady={handleAddressesReady} />}
                      {method.id === 'recording' && <ScreenRecording onAddressesReady={handleAddressesReady} />}
                    </div>
                  </div>
                )}

                {idx < INPUT_METHODS.length - 1 && <div className="border-t border-gray-50" />}
              </div>
            ))}
          </div>

          {stops.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">Current Route</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                  {stops.length} stops
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Pending', val: pending, color: '#6366f1' },
                  { label: 'Done', val: delivered, color: '#22c55e' },
                  { label: 'Failed', val: failed, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} className="text-center rounded-xl p-2" style={{ background: s.color + '10' }}>
                    <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>

              {hasStartLoc ? (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <span className="text-xs">📍</span>
                  <p className="text-xs text-gray-500 flex-1 truncate">
                    Start: {currentRoute?.startLocation?.address || 'Location set'}
                  </p>
                  <button
                    onClick={handleChangeStart}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium shrink-0"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  <span className="text-xs">⚡</span>
                  <p className="text-xs text-gray-400 flex-1">
                    Starting point will be set when you optimize
                  </p>
                </div>
              )}

              {isOptimized && (
                <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-50 mt-2">
                  <span className="flex items-center gap-1"><Map size={12} /> {totalDist}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {estTime}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleOptimizeClick}
            disabled={isOptimizing || stops.length < 2}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2
                       shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: isOptimizing
                ? '#a5b4fc'
                : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
            }}
          >
            {isOptimizing ? (
              <>
                <svg className="animate-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" viewBox="0 0 24 24" />
                Finding best route...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {hasStartLoc ? 'Re-Optimize Route' : 'Optimize Route'}
              </>
            )}
          </button>

          {stops.length >= 2 && !isOptimized && !isOptimizing && (
            <p className="text-xs text-center text-gray-400 -mt-1 flex items-center justify-center gap-1">
              {hasStartLoc ? (
                <><Check size={12} className="text-green-500" /> Starting point set — ready to optimize!</>
              ) : hasSavedStart ? (
                <><MapPin size={12} /> {`Will use saved: "${savedStartName.substring(0, 30)}..."`}</>
              ) : (
                <><MapPin size={12} /> You'll choose your starting point next</>
              )}
            </p>
          )}

          {isOptimized && (
            <button
              onClick={handleStartDelivery}
              className="w-full py-3 rounded-2xl text-white font-semibold text-sm
             flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              <Rocket size={16} /> Start Navigation
            </button>
          )}

          {stops.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-full py-2.5 rounded-2xl border border-gray-200 text-sm font-medium
             text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200
             transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={15} /> Clear All Stops
            </button>
          )}

        </div>
      </div>

      <StartingPointModal
        isOpen={showStartModal}
        onConfirm={handleStartConfirmed}
        onClose={() => setShowStartModal(false)}
        geocodeSingle={geocodeSingle}
      />

      {pendingReview && (
        <AddressReview
          addresses={pendingReview}
          onApprove={approved => {
            setPendingReview(null)
            addApprovedAddresses(approved)
          }}
          onClose={() => setPendingReview(null)}
        />
      )}

    </div>
  )
}