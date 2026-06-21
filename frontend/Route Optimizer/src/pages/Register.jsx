import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useRegisterMutation } from '../features/auth/authApiSlice'
import { setCredentials } from '../features/auth/authSlice'
import toast from 'react-hot-toast'
import { PartyPopper } from 'lucide-react'

export default function Register() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [register, { isLoading }] = useRegisterMutation()

  const [form, setForm] = useState({
    name: '', phone: '', password: '', city: '', hub: ''
  })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    try {
      const result = await register(form).unwrap()
      dispatch(setCredentials({ token: result.token, user: result.user }))
      toast.success(`Account created! Welcome, ${result.user.name}!`, { icon: <PartyPopper size={18} className="text-amber-500" /> })
      navigate('/')
    } catch (err) {
      toast.error(err?.data?.msg || 'Registration failed.')
    }
  }

  const inputClass = `w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm
                      placeholder-gray-400 outline-none transition-all
                      focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%)' }}>
      <div className="w-full max-w-lg">

        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#4f46e5' }}>
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">RouteOpti</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h2>
          <p className="text-gray-500 text-sm mb-8">Join thousands of delivery partners saving 2hrs daily</p>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="Rahul Kumar" required className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                <input
                  type="tel" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="9876543210" required className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password *</label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="Min 6 characters" required className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  type="text" name="city" value={form.city} onChange={handleChange}
                  placeholder="Delhi" className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hub / Warehouse</label>
                <input
                  type="text" name="hub" value={form.hub} onChange={handleChange}
                  placeholder="Amazon Hub Sector 4" className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all mt-2
                         hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {isLoading ? 'Creating account...' : 'Create Free Account'}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Sign in
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}