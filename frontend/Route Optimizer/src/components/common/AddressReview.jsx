import { useState } from 'react'
import { useGeocodeSingleMutation } from '../../features/extract/extractApiSlice'
import toast from 'react-hot-toast'

export default function AddressReview({ addresses, onApprove, onClose }) {
  const [items, setItems] = useState(
    addresses.map((addr, i) => ({
      id: i,
      cleaned: addr.cleaned || addr.raw || '',
      confidence: addr.confidence || 'medium',
      issues: addr.issues || '',
      approved: addr.confidence === 'high',
      rejected: false,
      editing: false,
    }))
  )
  const [geocodeSingle, { isLoading }] = useGeocodeSingleMutation()
  const [geocoding, setGeocoding] = useState(false)

  function toggleApprove(id) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, approved: !item.approved, rejected: false } : item
    ))
  }

  function toggleReject(id) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, rejected: !item.rejected, approved: false } : item
    ))
  }

  function startEdit(id) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, editing: true } : item
    ))
  }

  function saveEdit(id, newText) {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, cleaned: newText, editing: false, approved: true } : item
    ))
  }

  async function handleSubmit() {
    const approved = items.filter(i => i.approved && !i.rejected)
    if (approved.length === 0) {
      toast.error('Please approve at least one address')
      return
    }

    setGeocoding(true)
    const geocoded = []

    for (const item of approved) {
      try {
        const result = await geocodeSingle(item.cleaned).unwrap()
        if (result.result) {
          geocoded.push({
            cleaned: item.cleaned,
            confidence: item.confidence,
            geocoded: result.result
          })
        } else {
          toast.error(`Could not find: "${item.cleaned.substring(0, 40)}..."`, { duration: 3000 })
        }
      } catch {
      }
    }

    setGeocoding(false)

    if (geocoded.length > 0) {
      onApprove(geocoded)
      toast.success(`Added ${geocoded.length} addresses to route!`)
    } else {
      toast.error('No addresses could be geocoded. Check the addresses and try again.')
    }
  }

  const approvedCount = items.filter(i => i.approved && !i.rejected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Review Extracted Addresses</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {approvedCount} of {items.length} approved
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 px-6 py-3 border-b border-gray-50">
          <button
            onClick={() => setItems(prev => prev.map(i => ({ ...i, approved: true, rejected: false })))}
            className="text-xs font-medium text-green-700 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100 flex items-center gap-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Approve All
          </button>

          <button
            onClick={() => setItems(prev => prev.map(i => ({ ...i, approved: false, rejected: false })))}
            className="text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            Clear All
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-3 transition-all ${item.rejected ? 'border-red-100 bg-red-50 opacity-60' :
                  item.approved ? 'border-green-200 bg-green-50' :
                    'border-gray-100 bg-white'
                }`}
            >
              <div className="flex items-start gap-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${item.confidence === 'high' ? 'bg-green-100 text-green-700' :
                    item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-600'
                  }`}>
                  {item.confidence === 'high' ? ' High' : item.confidence === 'medium' ? '~ Med' : '! Low'}
                </span>

                <div className="flex-1 min-w-0">
                  {item.editing ? (
                    <input
                      defaultValue={item.cleaned}
                      autoFocus
                      onBlur={e => saveEdit(item.id, e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(item.id, e.target.value)}
                      className="w-full text-sm px-2 py-1 border border-indigo-300 rounded-lg outline-none
                                 focus:ring-2 focus:ring-indigo-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{item.cleaned}</p>
                  )}
                  {item.issues && (
                    <p className="text-xs text-amber-600 mt-0.5">{item.issues}</p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleApprove(item.id)}
                    title="Approve"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${item.approved && !item.rejected
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                      }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => startEdit(item.id)}
                    title="Edit"
                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600
                               flex items-center justify-center transition-all"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleReject(item.id)}
                    title="Reject"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${item.rejected
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'
                      }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={geocoding || approvedCount === 0}
            className="flex-2 py-2.5 px-6 rounded-xl text-white text-sm font-semibold transition-all
                       hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#4f46e5', flex: 2 }}
          >
            {geocoding
              ? `Geocoding ${approvedCount} addresses...`
              : `Add ${approvedCount} Addresses to Route`}
          </button>
        </div>

      </div>
    </div>
  )
}