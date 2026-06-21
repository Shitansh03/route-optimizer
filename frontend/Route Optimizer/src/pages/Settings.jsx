import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser, setCredentials, logout } from '../features/auth/authSlice'
import { useGetMeQuery } from '../features/auth/authApiSlice'
import { apiSlice } from '../features/api/apiSlice'
import toast from 'react-hot-toast'

export default function Settings() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user     = useSelector(selectCurrentUser)

  const [form, setForm] = useState({
    name:  user?.name  || '',
    city:  user?.city  || '',
    hub:   user?.hub   || '',
  })
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }


  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    toast.success('Profile updated! (Connect to backend in Day 4)')
    setSaving(false)
  }

  function handleLogout() {
    dispatch(logout())
    dispatch(apiSlice.util.resetApiState())
    toast.success('Logged out')
    navigate('/login')
  }

  const inputClass = `w-full px-4 py-3 rounded-xl border border-gray-200
    text-gray-900 text-sm placeholder-gray-400 outline-none transition-all
    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100
                          flex items-center justify-center text-2xl font-bold
                          text-indigo-600">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.phone}</p>
            <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold
                             px-2 py-0.5 rounded-full mt-1 inline-block">
              Delivery Partner
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Full Name
            </label>
            <input type="text" name="name" value={form.name}
                   onChange={handleChange} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City
              </label>
              <input type="text" name="city" value={form.city}
                     onChange={handleChange} placeholder="Delhi"
                     className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hub / Warehouse
              </label>
              <input type="text" name="hub" value={form.hub}
                     onChange={handleChange} placeholder="Amazon Hub Sector 4"
                     className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm
                       transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">App Info</h2>
        <div className="space-y-3 text-sm">
          {[
            { label: 'App Name',    value: 'RouteOpti' },
            { label: 'Version',     value: '1.0.0 Beta' },
            { label: 'OCR Engine',  value: 'Tesseract.js v5' },
            { label: 'AI Model',    value: 'Groq Llama 3 70B' },
            { label: 'Maps',        value: 'OpenStreetMap (Free)' },
            { label: 'Optimization',value: 'OpenRouteService' },
          ].map(item => (
            <div key={item.label}
                 className="flex justify-between items-center py-1
                            border-b border-gray-50 last:border-0">
              <span className="text-gray-500">{item.label}</span>
              <span className="font-medium text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
        <h2 className="text-base font-bold text-red-600 mb-4">Account</h2>
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600
                     font-semibold text-sm hover:bg-red-50 transition-colors"
        >
          Logout from RouteOpti
        </button>
      </div>

    </div>
  )
}