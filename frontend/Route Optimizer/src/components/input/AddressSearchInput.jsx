import { useState, useRef, useEffect } from 'react'
import { Building2, Home, MapPin, Landmark, Route, DoorOpen } from 'lucide-react'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

const SOURCE_COLOR = {
  mappls: { bg: '#fef3c7', text: '#92400e', label: 'Mappls' },
  photon: { bg: '#ede9fe', text: '#5b21b6', label: 'OSM' },
  nominatim: { bg: '#f3f4f6', text: '#6b7280', label: 'OSM' },
}

export default function AddressSearchInput({
  placeholder = 'Search building, street, area, colony...',
  onSelect,
  onTextChange,
  initialValue = '',
  autoFocus = false,
  userLat,
  userLng,
}) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDrop, setShowDrop] = useState(false)
  const [committed, setCommitted] = useState(false)
  const inputRef = useRef(null)
  const dropRef = useRef(null)
  const debouncedQ = useDebounce(query, 380)

  useEffect(() => {
    if (committed || debouncedQ.length < 2) {
      setSuggestions([])
      setShowDrop(false)
      return
    }

    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          const params = new URLSearchParams({ q: debouncedQ })
          if (userLat) params.set('lat', userLat)
          if (userLng) params.set('lng', userLng)

          const token = localStorage.getItem('token')
          const res = await fetch(`/api/extract/autocomplete?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok || cancelled) return
          const data = await res.json()
          if (!cancelled) {
            setSuggestions(data.suggestions || [])
            setShowDrop(true)
          }
        } catch {
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [debouncedQ, userLat, userLng, committed])

  useEffect(() => {
    function handleOutside(e) {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDrop(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  function handleChange(e) {
    setQuery(e.target.value)
    setCommitted(false)
    if (onTextChange) onTextChange(e.target.value)
  }

  async function handleSelect(suggestion) {
    setShowDrop(false)
    setCommitted(true)
    setSuggestions([])

    if (suggestion.lat && suggestion.lng) {
      setQuery(suggestion.label)
      if (onSelect) onSelect(suggestion)
      return
    }


    if (suggestion.eloc) {
      setQuery(suggestion.label)
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/extract/resolve-eloc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eloc: suggestion.eloc }),
        })
        const data = await res.json()
        if (data.result) {
          if (onSelect) onSelect({
            ...suggestion,
            lat: data.result.lat,
            lng: data.result.lng,
            formattedAddress: data.result.formattedAddress || suggestion.label,
          })
        } else {
          if (onSelect) onSelect(suggestion)
        }
      } catch {
        if (onSelect) onSelect(suggestion)
      } finally {
        setLoading(false)
      }
      return
    }

    setQuery(suggestion.label)
    if (onSelect) onSelect(suggestion)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setShowDrop(false); return }
    if (e.key === 'Enter') {
      if (suggestions.length > 0) {
        handleSelect(suggestions[0])
      } else if (query.trim() && onSelect) {
        setCommitted(true)
        onSelect({ label: query.trim(), lat: null, lng: null, eloc: null, source: 'typed' })
      }
    }
  }

  function typeIcon(type, source) {
    if (source === 'mappls') {
      const icons = {
        CITY: Building2,
        VILLAGE: Home,
        LOCALITY: MapPin,
        POI: Landmark,
        STREET: Route,
        HOUSE_NUMBER: DoorOpen,
      }
      return icons[type] || MapPin
    }
    return MapPin
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDrop(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 pr-10 rounded-xl border border-gray-200 text-sm
                     text-gray-800 placeholder-gray-400 outline-none transition-all
                     focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {loading ? (
            <svg className="w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin"
              viewBox="0 0 24 24" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          )}
        </div>
      </div>

      {showDrop && suggestions.length > 0 && (
        <div
          ref={dropRef}
          className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-xl
                     border border-gray-100 overflow-hidden"
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          {suggestions.map((s, i) => {
            const srcCfg = SOURCE_COLOR[s.source] || SOURCE_COLOR.nominatim
            const SuggestionIcon = typeIcon(s.type, s.source)
            return (
              <button
                key={i}
                onMouseDown={() => handleSelect(s)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left
                 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <SuggestionIcon size={16} className="mt-0.5 shrink-0 text-gray-400" />
                <span className="text-sm text-gray-700 leading-snug flex-1">{s.label}</span>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: srcCfg.bg, color: srcCfg.text }}
                >
                  {srcCfg.label}
                </span>
              </button>
            )
          })}
          <div className="px-4 py-1.5 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            Powered by Mappls & OpenStreetMap
          </div>
        </div>
      )}

      {showDrop && !loading && suggestions.length === 0 && query.length >= 3 && !committed && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-xl shadow-lg
                        border border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-500">
            No suggestions. Press Enter to use <strong>"{query}"</strong> as-is,
            or try adding city name (e.g. "Nagpur").
          </p>
        </div>
      )}
    </div>
  )
}