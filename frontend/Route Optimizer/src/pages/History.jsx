import { useNavigate } from 'react-router-dom'
import { useGetMyRoutesQuery } from '../features/routes/routesApiSlice'
import { ClipboardList, Map, Clock, CheckCircle2 } from 'lucide-react'

export default function History() {
  const navigate = useNavigate()
  const { data: routes = [], isLoading } = useGetMyRoutesQuery()

  const completedRoutes = routes.filter(r => r.status === 'completed')

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
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

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delivery History</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All your completed delivery routes
        </p>
      </div>

      {completedRoutes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm
                border border-gray-100">
          <ClipboardList size={40} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No completed routes yet
          </h3>
          <p className="text-gray-500 text-sm">
            Complete your first delivery route to see history here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {completedRoutes.map(route => {
            const stops = route.stops || []
            const delivered = stops.filter(s => s.status === 'delivered').length
            const failed = stops.filter(s => s.status === 'failed').length
            const successRate = stops.length > 0
              ? Math.round((delivered / stops.length) * 100) : 0

            return (
              <div key={route._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100
                              overflow-hidden">

                <div className="flex items-center justify-between px-6 py-4
                                border-b border-gray-50">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDate(route.date)}
                    </p>
                    {route.actualTime && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Completed in {route.actualTime}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/summary/${route._id}`)}
                    className="text-xs font-semibold text-indigo-600 bg-indigo-50
                               px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                  >
                    View Report
                  </button>
                </div>

                <div className="grid grid-cols-4 divide-x divide-gray-50 px-6 py-4">
                  {[
                    { label: 'Total Stops', value: stops.length, color: '#6366f1' },
                    { label: 'Delivered', value: delivered, color: '#22c55e' },
                    { label: 'Failed', value: failed, color: '#ef4444' },
                    { label: 'Success', value: `${successRate}%`, color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} className="px-4 first:pl-0 last:pr-0 text-center">
                      <p className="text-lg font-bold" style={{ color: stat.color }}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {(route.totalDistance || route.estimatedTime) && (
                  <div className="flex gap-4 px-6 py-3 bg-gray-50 text-xs text-gray-500">
                    {route.totalDistance && (
                      <span className="flex items-center gap-1">
                        <Map size={12} className="text-indigo-400" /> {route.totalDistance}
                      </span>
                    )}
                    {route.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-amber-500" /> Estimated {route.estimatedTime}
                      </span>
                    )}
                    {route.actualTime && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-green-500" /> Actual {route.actualTime}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}