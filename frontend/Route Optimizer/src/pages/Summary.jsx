import { useParams, useNavigate } from 'react-router-dom'
import { useGetRouteByIdQuery } from '../features/routes/routesApiSlice'
import { PartyPopper, XCircle } from 'lucide-react'

export default function Summary() {
  const { routeId } = useParams()
  const navigate = useNavigate()
  const { data: route, isLoading } = useGetRouteByIdQuery(routeId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spinner" />
      </div>
    )
  }

  if (!route) return null

  const stops = route.stops || []
  const delivered = stops.filter(s => s.status === 'delivered')
  const failed = stops.filter(s => s.status === 'failed')
  const reattempt = stops.filter(s => s.status === 'reattempt')
  const successRate = stops.length > 0 ? Math.round((delivered.length / stops.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: '#f0fdf4' }}>
            <PartyPopper size={30} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Route Complete!</h1>
          <p className="text-gray-500 mt-1">Great work today. Here's your delivery summary.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Total Stops', value: stops.length, color: '#6366f1' },
            { label: 'Delivered', value: delivered.length, color: '#22c55e' },
            { label: 'Failed', value: failed.length, color: '#ef4444' },
            { label: 'Success Rate', value: `${successRate}%`, color: '#f59e0b' },
            { label: 'Total Distance', value: route.totalDistance || '—', color: '#3b82f6' },
            { label: 'Actual Time', value: route.actualTime || '—', color: '#8b5cf6' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              Failed Deliveries ({failed.length})
            </h2>
            <div className="space-y-2">
              {failed.map((stop, i) => (
                <div key={stop._id || i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                  <span className="text-red-500 font-bold text-sm shrink-0">#{i + 1}</span>
                  <div>
                    <p className="text-sm text-gray-800">{stop.address}</p>
                    {stop.note && <p className="text-xs text-gray-500 mt-0.5">Note: {stop.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            Start New Route
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600
                       hover:bg-gray-50 transition-colors"
          >
            Print Report
          </button>
        </div>

      </div>
    </div>
  )
}