import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useGetRouteByIdQuery,
  useUpdateStopStatusMutation,
  useCompleteRouteMutation,
} from '../features/routes/routesApiSlice'
import DeliveryMap from '../components/map/DeliveryMap'
import toast from 'react-hot-toast'
import { Truck, CheckCircle2, XCircle, MapPin, User, Phone, RotateCcw, FlagTriangleRight, PartyPopper } from 'lucide-react'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#6366f1', bg: '#eef2ff' },
  delivered: { label: 'Delivered', color: '#22c55e', bg: '#f0fdf4' },
  failed: { label: 'Failed', color: '#ef4444', bg: '#fef2f2' },
  reattempt: { label: 'Reattempt', color: '#f59e0b', bg: '#fffbeb' },
}

export default function ActiveRoute() {
  const { routeId } = useParams()
  const navigate = useNavigate()

  const { data: route, isLoading } = useGetRouteByIdQuery(routeId, {
    pollingInterval: 30000
  })

  const [updateStop] = useUpdateStopStatusMutation()
  const [completeRoute] = useCompleteRouteMutation()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [noteMap, setNoteMap] = useState({})
  const [showNote, setShowNote] = useState(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spinner mx-auto mb-4" />
          <p className="text-gray-600">Loading route...</p>
        </div>
      </div>
    )
  }

  if (!route) {
    return (
      <div className="flex items-center justify-center h-screen text-center">
        <div>
          <p className="text-gray-600 mb-4">Route not found.</p>
          <button onClick={() => navigate('/')} className="text-indigo-600 font-medium">← Go back</button>
        </div>
      </div>
    )
  }

  const orderedStops = route.optimizedOrder?.length > 0
    ? route.optimizedOrder.map(idx => ({ ...route.stops[idx], _originalIdx: idx }))
    : route.stops

  const currentStop = orderedStops[currentIdx]
  const delivered = route.stops.filter(s => s.status === 'delivered').length
  const failed = route.stops.filter(s => s.status === 'failed').length
  const total = route.stops.length
  const progress = Math.round((delivered / total) * 100)

  async function handleStatus(status) {
    if (!currentStop) return
    try {
      await updateStop({
        routeId,
        stopId: currentStop._id,
        status,
        note: noteMap[currentStop._id] || ''
      }).unwrap()

      toast.success(`Stop marked as ${STATUS_CONFIG[status].label}`)
      setShowNote(null)

      if (currentIdx < orderedStops.length - 1) {
        setCurrentIdx(prev => prev + 1)
      }
    } catch {
      toast.error('Failed to update stop status')
    }
  }

  async function handleComplete() {
    if (!window.confirm('Mark entire route as complete?')) return
    try {
      await completeRoute(routeId).unwrap()
      toast.success('Route completed! Great work today!', { icon: <PartyPopper size={18} className="text-amber-500" /> })
      navigate(`/summary/${routeId}`)
    } catch {
      toast.error('Failed to complete route')
    }
  }

  function openInMaps(stop) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`
    window.open(url, '_blank')
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">

      <div className="flex-1 relative">
        <DeliveryMap
          stops={route.stops}
          startLocation={route.startLocation}
          optimizedOrder={route.optimizedOrder || []}
          routeGeometry={route.routeGeometry}
          activeStopIndex={currentIdx}
          height="100%"
        />

        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>

        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="bg-white rounded-xl p-3 shadow-md">
            <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
              <span>Progress: {delivered}/{total} delivered</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: '#22c55e' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-100 flex flex-col overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Active Delivery</h2>
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full flex items-center gap-1">
              <Truck size={12} /> In Progress
            </span>
          </div>
          <div className="flex gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 size={13} className="text-green-500" /> {delivered} delivered
            </span>
            <span className="flex items-center gap-1">
              <XCircle size={13} className="text-red-500" /> {failed} failed
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-indigo-500" /> {total - delivered - failed} remaining
            </span>
          </div>
        </div>

        {currentStop && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto">

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {currentIdx + 1}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Current Stop</p>
                <p className="text-sm font-bold text-gray-800">Stop #{currentIdx + 1} of {orderedStops.length}</p>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-indigo-900 leading-relaxed">
                {currentStop.address}
              </p>
              {currentStop.customerName && (
                <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                  <User size={12} /> {currentStop.customerName}
                </p>
              )}
              {currentStop.customerPhone && (
                <p className="text-xs text-indigo-600 flex items-center gap-1">
                  <Phone size={12} /> {currentStop.customerPhone}
                </p>
              )}
            </div>

            <button
              onClick={() => openInMaps(currentStop)}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-xl border-2 border-indigo-200
                         text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Open in Google Maps
            </button>

            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleStatus('delivered')}
                className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 shadow-sm flex items-center justify-center gap-2"
                style={{ background: '#22c55e' }}
              >
                <CheckCircle2 size={17} /> Delivered
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleStatus('failed')}
                  className="py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                  style={{ background: '#ef4444' }}
                >
                  <XCircle size={15} /> Failed
                </button>
                <button
                  onClick={() => handleStatus('reattempt')}
                  className="py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-1.5"
                  style={{ background: '#f59e0b' }}
                >
                  <RotateCcw size={15} /> Reattempt
                </button>
              </div>
            </div>

            <textarea
              placeholder="Add a note (optional)..."
              value={noteMap[currentStop._id] || ''}
              onChange={e => setNoteMap(prev => ({ ...prev, [currentStop._id]: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 resize-none
                         placeholder-gray-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
            />

            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">All Stops</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {orderedStops.map((stop, idx) => {
                  const cfg = STATUS_CONFIG[stop.status] || STATUS_CONFIG.pending
                  return (
                    <button
                      key={stop._id || idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${idx === currentIdx ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50'
                        }`}
                    >
                      <span className="text-xs font-bold text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: cfg.color }}>
                        {idx + 1}
                      </span>
                      <p className="text-xs text-gray-600 truncate flex-1">{stop.address}</p>
                      <span className="text-xs" style={{ color: cfg.color }}>{cfg.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 shrink-0">
          <button
            onClick={handleComplete}
            className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            <FlagTriangleRight size={17} /> Complete Route
          </button>
        </div>
      </div>

    </div>
  )
}