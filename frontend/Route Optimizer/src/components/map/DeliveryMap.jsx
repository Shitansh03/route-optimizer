import { useEffect, useRef, useState } from 'react'
import {
  MapContainer, TileLayer, Marker, Popup,
  Polyline, useMap, ZoomControl,
} from 'react-leaflet'
import L from 'leaflet'
import { House, User, Phone } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const STOP_COLORS = [
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#22c55e', '#84cc16', '#eab308',
]
const getStopColor = (i) => STOP_COLORS[i % STOP_COLORS.length]

function createNumberedIcon(number, color, isActive = false, status = 'pending') {
  const size = isActive ? 42 : 34
  const border = isActive ? '3px' : '2px'

  const overlay =
    status === 'delivered'
      ? `<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;
                     background:#22c55e;border-radius:50%;border:1.5px solid white;
                     display:flex;align-items:center;justify-content:center;font-size:8px;color:white">✓</div>`
      : status === 'failed'
        ? `<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;
                     background:#ef4444;border-radius:50%;border:1.5px solid white;
                     display:flex;align-items:center;justify-content:center;font-size:8px;color:white">✗</div>`
        : ''

  return L.divIcon({
    html: `
      <div style="position:relative;width:${size}px;height:${size}px">
        <div style="
          width:${size}px;height:${size}px;
          background:${color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:${isActive ? 15 : 12}px;
          font-family:Inter,sans-serif;
          border:${border} solid white;
          box-shadow:0 3px 12px rgba(0,0,0,${isActive ? 0.45 : 0.3});
          ${isActive ? 'transform:scale(1.12)' : ''}
        ">${number}</div>
        ${overlay}
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  })
}

function createHubIcon() {
  return L.divIcon({
    html: `
      <div style="
        width:40px;height:40px;
        background:linear-gradient(135deg,#1e293b,#334155);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        border:3px solid white;
        box-shadow:0 4px 14px rgba(0,0,0,0.45);
      ">
        <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  })
}

function MapController({ positions, triggerFit }) {
  const map = useMap()
  const prevFit = useRef(0)

  useEffect(() => {
    if (!positions || positions.length === 0) return
    if (triggerFit === prevFit.current) return
    prevFit.current = triggerFit

    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 16, { animate: true })
    } else {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]))
      map.fitBounds(bounds, { padding: [60, 60], animate: true, maxZoom: 17 })
    }
  }, [triggerFit, positions, map])

  return null
}

function TileSwitcher({ view }) {
  const tiles = {
    Map: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attr: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
      maxZ: 19,
    },
    Satellite: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attr: '&copy; <a href="https://carto.com">CARTO</a>',
      maxZ: 19,
    },
  }

  const t = tiles[view] || tiles.Map
  return (
    <TileLayer
      key={view}
      url={t.url}
      attribution={t.attr}
      maxZoom={t.maxZ}
      tileSize={256}
    />
  )
}

export default function DeliveryMap({
  stops = [],
  startLocation = null,
  optimizedOrder = [],
  routeGeometry = null,
  activeStopIndex = null,
  height = '100%',
  mapView = 'Map',
}) {
  const defaultCenter = [20.5937, 78.9629]
  const defaultZoom = 5

  const orderedStops = optimizedOrder.length > 0
    ? optimizedOrder.map(idx => stops[idx]).filter(Boolean)
    : stops

  const allPositions = [
    ...(startLocation?.lat ? [startLocation] : []),
    ...orderedStops.filter(s => s?.lat && s?.lng),
  ]

  const routePositions = routeGeometry?.coordinates
    ? routeGeometry.coordinates.map(([lng, lat]) => [lat, lng])
    : null

  const straightLine = orderedStops.length > 0 ? [
    ...(startLocation?.lat ? [[startLocation.lat, startLocation.lng]] : []),
    ...orderedStops.filter(s => s?.lat && s?.lng).map(s => [s.lat, s.lng]),
  ] : []

  const mapCenter = allPositions.length > 0
    ? [allPositions[0].lat, allPositions[0].lng]
    : defaultCenter
  const mapZoom = allPositions.length > 0 ? 14 : defaultZoom

  const fitKey = allPositions.length

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        preferCanvas={true}
      >
        <TileSwitcher view={mapView} />

        <ZoomControl position="bottomright" />

        <MapController positions={allPositions} triggerFit={fitKey} />

        {startLocation?.lat && (
          <Marker
            position={[startLocation.lat, startLocation.lng]}
            icon={createHubIcon()}
            zIndexOffset={1000}
          >
            <Popup maxWidth={220}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <House size={14} /> Starting Point
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                  {startLocation.address || 'Your hub location'}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {orderedStops.map((stop, displayIndex) => {
          if (!stop?.lat || !stop?.lng) return null
          const isActive = displayIndex === activeStopIndex
          const baseColor = getStopColor(displayIndex)
          const markerColor =
            stop.status === 'delivered' ? '#22c55e' :
              stop.status === 'failed' ? '#ef4444' : baseColor

          return (
            <Marker
              key={stop._id || displayIndex}
              position={[stop.lat, stop.lng]}
              icon={createNumberedIcon(displayIndex + 1, markerColor, isActive, stop.status)}
              zIndexOffset={isActive ? 900 : 0}
            >
              <Popup maxWidth={240}>
                <div style={{ minWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      background: markerColor, color: 'white',
                      fontWeight: 700, fontSize: 11,
                      padding: '2px 8px', borderRadius: 999,
                    }}>
                      Stop #{displayIndex + 1}
                    </span>
                    {stop.status === 'delivered' &&
                      <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600 }}>✓ Delivered</span>}
                    {stop.status === 'failed' &&
                      <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>✗ Failed</span>}
                    {stop.status === 'reattempt' &&
                      <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>↻ Reattempt</span>}
                    {isActive &&
                      <span style={{ color: '#6366f1', fontSize: 11, fontWeight: 600 }}>← Now</span>}
                  </div>

                  <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.55, marginBottom: 4 }}>
                    {stop.address}
                  </p>

                  {stop.customerName && (
                    <p style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <User size={11} /> {stop.customerName}
                    </p>
                  )}
                  {stop.customerPhone && (
                    <p style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Phone size={11} /> {stop.customerPhone}
                    </p>
                  )}
                  {stop.note && (
                    <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 }}>
                      Note: {stop.note}
                    </p>
                  )}

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block', marginTop: 8,
                      fontSize: 11, color: '#4f46e5', fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Navigate →
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {routePositions ? (
          <Polyline
            positions={routePositions}
            color="#6366f1"
            weight={4}
            opacity={0.85}
          />
        ) : straightLine.length > 1 && (
          <Polyline
            positions={straightLine}
            color="#6366f1"
            weight={3}
            opacity={0.55}
            dashArray="10 6"
          />
        )}
      </MapContainer>
    </div>
  )
}