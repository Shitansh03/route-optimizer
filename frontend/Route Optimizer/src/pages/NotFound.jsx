import { useNavigate } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="text-8xl font-black text-gray-100 mb-2">404</div>
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 mx-auto mb-6
                flex items-center justify-center">
          <MapPinOff size={32} className="text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-500 mb-6">
          This route doesn't exist. Let's get you back on track.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 rounded-xl text-white font-semibold text-sm
                     hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  )
}