import { useState } from 'react'
import { useExtractFromTextMutation, useGeocodeSingleMutation } from '../../features/extract/extractApiSlice'
import AddressSearchInput from './AddressSearchInput'
import toast from 'react-hot-toast'
import { MapPin, ClipboardList, Check } from 'lucide-react'

export default function TextInput({ onAddressesReady }) {
  const [mode, setMode] = useState('single')
  const [bulkText, setBulkText] = useState('')
  const [selectedStop, setSelectedStop] = useState(null)
  const [resolving, setResolving] = useState(false)

  const [extractFromText, { isLoading: isExtracting }] = useExtractFromTextMutation()
  const [geocodeSingle, { isLoading: isGeocoding }] = useGeocodeSingleMutation()

  async function handleSingleSelect(suggestion) {
    if (suggestion.lat && suggestion.lng) {
      setSelectedStop(suggestion)
      return
    }

    if (suggestion.source === 'typed' || (!suggestion.lat && !suggestion.eloc)) {
      setResolving(true)
      try {
        const res = await geocodeSingle(suggestion.label).unwrap()
        if (res.result) {
          setSelectedStop({
            ...suggestion,
            lat: res.result.lat,
            lng: res.result.lng,
            formattedAddress: res.result.formattedAddress || suggestion.label,
          })
        } else {
          toast.error('Location not found. Try adding city name.')
          setSelectedStop(null)
        }
      } catch {
        toast.error('Geocoding failed. Try again.')
      } finally {
        setResolving(false)
      }
      return
    }

    setSelectedStop(suggestion)
  }

  function handleAddSingle() {
    if (!selectedStop?.lat) {
      toast.error('Please select a location from the suggestions first.')
      return
    }
    onAddressesReady([{
      cleaned: selectedStop.label,
      confidence: 'high',
      geocoded: {
        lat: selectedStop.lat,
        lng: selectedStop.lng,
        formattedAddress: selectedStop.formattedAddress || selectedStop.label,
      },
    }])
    setSelectedStop(null)
    toast.success('Stop added!')
  }

  async function handleBulkSubmit() {
    if (!bulkText.trim()) {
      toast.error('Please paste some addresses first')
      return
    }
    try {
      const result = await extractFromText(bulkText).unwrap()
      if (result.addresses && result.addresses.length > 0) {
        onAddressesReady(result.addresses)
        setBulkText('')
        toast.success(`Found ${result.addresses.length} addresses!`)
      } else {
        toast.error('No addresses found. Check the text and try again.')
      }
    } catch {
      toast.error('Extraction failed. Try again.')
    }
  }

  return (
    <div className="space-y-3">

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[
          { id: 'single', label: 'One address', icon: MapPin },
          { id: 'bulk', label: 'Paste many', icon: ClipboardList },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSelectedStop(null) }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === m.id
              ? 'bg-white shadow text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <m.icon size={13} />
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'single' && (
        <div className="space-y-2">
          <AddressSearchInput
            placeholder="Search building, street, area, colony..."
            onSelect={handleSingleSelect}
            onTextChange={() => setSelectedStop(null)}
          />

          {resolving && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl">
              <svg className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin shrink-0"
                viewBox="0 0 24 24" />
              <p className="text-xs text-indigo-600">Finding location on map...</p>
            </div>
          )}

          {selectedStop?.lat && !resolving && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <Check size={14} className="text-indigo-500 shrink-0" />
              <p className="text-xs text-indigo-700 flex-1 leading-snug">{selectedStop.label}</p>
            </div>
          )}

          <button
            onClick={handleAddSingle}
            disabled={!selectedStop?.lat || resolving}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold
                       transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#4f46e5' }}
          >
            {resolving ? 'Finding location...' : '+ Add Stop'}
          </button>
        </div>
      )}

      {mode === 'bulk' && (
        <div className="space-y-2">
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={`Paste multiple addresses, one per line:\n\n401 Techfinity Tower, IT Park, Nagpur\n11th Floor VIPL IT Park, Nagpur\nNPTI Executive Hostel, Nagpur`}
            rows={6}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800
                       placeholder-gray-400 outline-none resize-none transition-all leading-relaxed
                       focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <p className="text-xs text-gray-400">
            AI extracts and cleans all addresses. One per line works best.
          </p>
          <button
            onClick={handleBulkSubmit}
            disabled={isExtracting || !bulkText.trim()}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold
                       transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#4f46e5' }}
          >
            {isExtracting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  viewBox="0 0 24 24" />
                AI Processing...
              </span>
            ) : 'Extract & Add All'}
          </button>
        </div>
      )}
    </div>
  )
}