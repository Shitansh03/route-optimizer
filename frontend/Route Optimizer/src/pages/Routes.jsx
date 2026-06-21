import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useGetMyRoutesQuery,
  useCreateRouteMutation,
  useDeleteRouteMutation,
} from '../features/routes/routesApiSlice'
import toast from 'react-hot-toast'
import { MapPinOff, MapPin, Map, Clock, CheckCircle2 } from 'lucide-react'

const STATUS_STYLE = {
  draft: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
  active: { label: 'Active', bg: '#eef2ff', color: '#4f46e5' },
  completed: { label: 'Completed', bg: '#f0fdf4', color: '#16a34a' },
}

export default function Routes() {
  const navigate = useNavigate()
  const { data: routes = [], isLoading, refetch } = useGetMyRoutesQuery()
  const [createRoute] = useCreateRouteMutation()
  const [deleteRoute] = useDeleteRouteMutation()
  const [creating, setCreating] = useState(false)

  async function handleCreateNew() {
    setCreating(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const route = await createRoute({ date: today }).unwrap()
      toast.success('New route created!')
      navigate('/')
    } catch {
      toast.error('Failed to create route')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!window.confirm('Delete this route?')) return
    try {
      await deleteRoute(id).unwrap()
      toast.success('Route deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600
                        rounded-full animate-spinner" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">


      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Routes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage all your delivery routes
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white
                     text-sm font-semibold transition-all hover:opacity-90
                     disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {creating ? 'Creating...' : 'New Route'}
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm
                        border border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 mx-auto mb-4
                flex items-center justify-center">
            <MapPinOff size={28} className="text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No routes yet
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Create your first route to start optimizing deliveries
          </p>
          <button
            onClick={handleCreateNew}
            className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
            style={{ background: '#4f46e5' }}
          >
            Create First Route
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map(route => {
            const style = STATUS_STYLE[route.status] || STATUS_STYLE.draft
            const stops = route.stops || []
            const delivered = stops.filter(s => s.status === 'delivered').length
            const progress = stops.length > 0
              ? Math.round((delivered / stops.length) * 100)
              : 0

            return (
              <div
                key={route._id}
                onClick={() => navigate('/')}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100
                           hover:border-indigo-200 hover:shadow-md transition-all
                           cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center
                                    justify-center shrink-0"
                      style={{ background: style.bg }}>
                      <span className="text-xs font-bold"
                        style={{ color: style.color }}>
                        {new Date(route.date).toLocaleDateString('en-IN', {
                          month: 'short'
                        })}
                      </span>
                      <span className="text-lg font-bold"
                        style={{ color: style.color }}>
                        {new Date(route.date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">
                          Route — {formatDate(route.date)}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: style.bg, color: style.color }}>
                          {style.label}
                        </span>
                      </div>

                      <div className="flex gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-indigo-400" /> {stops.length} stops
                        </span>
                        {route.totalDistance && (
                          <span className="flex items-center gap-1">
                            <Map size={12} className="text-blue-400" /> {route.totalDistance}
                          </span>
                        )}
                        {route.estimatedTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-amber-500" /> {route.estimatedTime}
                          </span>
                        )}
                        {route.status === 'completed' && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={12} /> {delivered}/{stops.length} delivered
                          </span>
                        )}
                      </div>

                      {route.status === 'active' && stops.length > 0 && (
                        <div className="mt-2 w-48">
                          <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${progress}%`, background: '#4f46e5' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100
                                  transition-opacity">
                    {route.status === 'active' && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/active/${route._id}`) }}
                        className="text-xs font-semibold text-indigo-600 bg-indigo-50
                                   px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                      >
                        Continue →
                      </button>
                    )}
                    {route.status === 'completed' && (
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/summary/${route._id}`) }}
                        className="text-xs font-semibold text-green-600 bg-green-50
                                   px-3 py-1.5 rounded-lg hover:bg-green-100"
                      >
                        View Summary
                      </button>
                    )}
                    <button
                      onClick={e => handleDelete(route._id, e)}
                      className="text-xs text-red-400 hover:text-red-600 p-1.5
                                 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                             01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1
                             1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}