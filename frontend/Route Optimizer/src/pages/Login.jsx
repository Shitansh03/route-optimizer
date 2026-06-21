import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useLoginMutation } from '../features/auth/authApiSlice'
import { setCredentials } from '../features/auth/authSlice'
import toast from 'react-hot-toast'
import { Hand } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [login, { isLoading }] = useLoginMutation()

  const [form, setForm] = useState({ phone: '', password: '' })

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const result = await login(form).unwrap()
      dispatch(setCredentials({ token: result.token, user: result.user }))
      toast.success(`Welcome back, ${result.user.name}!`, { icon: <Hand size={18} className="text-amber-500" /> })
      navigate('/')
    } catch (err) {
      toast.error(err?.data?.msg || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f5f3ff 100%)' }}>

      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12"
        style={{ background: 'linear-gradient(160deg, #4f46e5, #7c3aed)' }}>
        <div className="text-center text-white max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-3xl font-bold">RouteOpti</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Optimize Routes.<br />
            <span className="text-yellow-300">Save Time.</span><br />
            Deliver More.
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            The world's smartest delivery route optimizer. Built for Amazon, Flipkart, Meesho delivery partners.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { val: '2hrs', label: 'Saved daily' },
              { val: '15km', label: 'Less distance' },
              { val: '95%', label: 'OCR accuracy' },
            ].map(stat => (
              <div key={stat.val} className="bg-white/15 rounded-xl p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold text-yellow-300">{stat.val}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#4f46e5' }}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">RouteOpti</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              Welcome back <Hand size={22} className="text-amber-500" />
            </h2>
            <p className="text-gray-500 text-sm mb-8">Sign in to your delivery account</p>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm
                             placeholder-gray-400 outline-none transition-all
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 text-sm
                             placeholder-gray-400 outline-none transition-all
                             focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all
                           disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-98"
                style={{ background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" viewBox="0 0 24 24" />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>

            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}