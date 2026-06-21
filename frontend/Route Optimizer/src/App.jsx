import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet
} from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from './features/auth/authSlice'
import { Toaster } from 'react-hot-toast'

import Login        from './pages/Login'
import Register     from './pages/Register'
import Dashboard    from './pages/Dashboard'
import ActiveRoute  from './pages/ActiveRoute'
import Summary      from './pages/Summary'
import Routes       from './pages/Routes'
import History      from './pages/History'
import Analytics    from './pages/Analytics'
import Settings     from './pages/Settings'
import NotFound     from './pages/NotFound'
import MainLayout   from './components/layout/MainLayout'

function ProtectedLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  )
}

function PublicLayout() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/login',    element: <Login /> },
      { path: '/register', element: <Register /> },
    ]
  },
  {
    element: <ProtectedLayout />,
    children: [
      { path: '/',                  element: <Dashboard /> },
      { path: '/routes',            element: <Routes /> },
      { path: '/map',               element: <Dashboard /> },
      { path: '/history',           element: <History /> },
      { path: '/analytics',         element: <Analytics /> },
      { path: '/saved',             element: <Routes /> },
      { path: '/settings',          element: <Settings /> },
      { path: '/active/:routeId',   element: <ActiveRoute /> },
      { path: '/summary/:routeId',  element: <Summary /> },
    ]
  },
  { path: '*', element: <NotFound /> }
])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            style: {
              background: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0'
            }
          },
          error: {
            style: {
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca'
            }
          },
        }}
      />
    </>
  )
}