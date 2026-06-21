import { createSlice } from '@reduxjs/toolkit'

const savedToken = localStorage.getItem('token')
const savedUser  = localStorage.getItem('user')

const initialState = {
  token: savedToken || null,
  user:  savedUser ? JSON.parse(savedUser) : null,
  isAuthenticated: !!savedToken,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload
      state.token = token
      state.user  = user
      state.isAuthenticated = true
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    },
    logout: (state) => {
      state.token = null
      state.user  = null
      state.isAuthenticated = false
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem('user', JSON.stringify(state.user))
    }
  }
})

export const { setCredentials, logout, updateUser } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser  = (state) => state.auth.user
export const selectCurrentToken = (state) => state.auth.token
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated