import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

let socket = null

export function useSocket() {

  if (!socket) {
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })
  }

  const subscribe = useCallback((sessionId, onProgress, onComplete, onError) => {
    const eventName = `processing:${sessionId}`

    socket.on(eventName, (data) => {
      if (data.event === 'complete') {
        onComplete(data.result)
        socket.off(eventName)
      } else if (data.event === 'error') {
        onError(data.message)
        socket.off(eventName)
      } else {
        onProgress(data)
      }
    })

    return () => socket.off(eventName)

  }, [])

  return { subscribe }
}