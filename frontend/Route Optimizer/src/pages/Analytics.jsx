import { useGetMyRoutesQuery } from '../features/routes/routesApiSlice'
import { Package, CheckCircle2, Clock, Fuel, BarChart3 } from 'lucide-react'

export default function Analytics() {
  const { data: routes = [], isLoading } = useGetMyRoutesQuery()

  const completed = routes.filter(r => r.status === 'completed')
  const allStops = completed.flatMap(r => r.stops || [])
  const delivered = allStops.filter(s => s.status === 'delivered').length
  const failed = allStops.filter(s => s.status === 'failed').length
  const total = allStops.length
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0

  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayRoutes = completed.filter(r => r.date === dateStr)
    const dayStops = dayRoutes.flatMap(r => r.stops || [])
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: dateStr,
      stops: dayStops.length,
      delivered: dayStops.filter(s => s.status === 'delivered').length,
    }
  })

  const maxStops = Math.max(...last7Days.map(d => d.stops), 1)

  const totalTimeSaved = Math.round(delivered * 8)
  const totalDistSaved = (delivered * 1.2).toFixed(0)
  const totalFuelSaved = Math.round(delivered * 0.04 * 90)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600
                        rounded-full animate-spinner" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your delivery performance overview
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Deliveries',
            value: delivered,
            sub: `out of ${total}`,
            color: '#6366f1',
            icon: Package
          },
          {
            label: 'Success Rate',
            value: `${successRate}%`,
            sub: `${failed} failed`,
            color: '#22c55e',
            icon: CheckCircle2
          },
          {
            label: 'Time Saved',
            value: `${Math.floor(totalTimeSaved / 60)}h ${totalTimeSaved % 60}m`,
            sub: 'total saved',
            color: '#f59e0b',
            icon: Clock
          },
          {
            label: 'Fuel Saved',
            value: `₹${totalFuelSaved}`,
            sub: `${totalDistSaved}km less`,
            color: '#3b82f6',
            icon: Fuel
          },
        ].map(kpi => (
          <div key={kpi.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${kpi.color}1A` }}
              >
                <kpi.icon size={18} style={{ color: kpi.color }} />
              </div>
              <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-900 mb-5">
          Last 7 Days — Deliveries
        </h2>

        {total === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Complete some routes to see analytics</p>
          </div>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {last7Days.map(day => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">
                  {day.stops > 0 ? day.stops : ''}
                </span>
                <div className="w-full relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg transition-all"
                    style={{
                      height: `${(day.stops / maxStops) * 100}%`,
                      background: '#e0e7ff',
                      minHeight: day.stops > 0 ? '4px' : '0'
                    }}
                  />
                  <div
                    className="absolute bottom-0 w-full rounded-t-lg transition-all"
                    style={{
                      height: `${(day.delivered / maxStops) * 100}%`,
                      background: '#4f46e5',
                      minHeight: day.delivered > 0 ? '4px' : '0'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400">{day.day}</span>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-600" />
              <span className="text-xs text-gray-500">Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-100" />
              <span className="text-xs text-gray-500">Total Stops</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Route Overview</h2>
          <div className="space-y-3">
            {[
              { label: 'Total routes created', value: routes.length },
              { label: 'Routes completed', value: completed.length },
              {
                label: 'Routes in progress',
                value: routes.filter(r => r.status === 'active').length
              },
              {
                label: 'Draft routes',
                value: routes.filter(r => r.status === 'draft').length
              },
            ].map(item => (
              <div key={item.label}
                className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Performance</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Success rate</span>
                <span className="font-bold text-green-600">{successRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Failed rate</span>
                <span className="font-bold text-red-500">
                  {total > 0 ? Math.round((failed / total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-400"
                  style={{
                    width: total > 0
                      ? `${Math.round((failed / total) * 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}