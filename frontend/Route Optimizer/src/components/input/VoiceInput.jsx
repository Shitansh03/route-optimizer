import { useState, useEffect, useRef } from 'react'
import { useGeocodeSingleMutation } from '../../features/extract/extractApiSlice'
import toast from 'react-hot-toast'
import { Mic } from 'lucide-react'

export default function VoiceInput({ onAddressesReady }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [language, setLanguage] = useState('en-IN')
  const [geocodeSingle, { isLoading }] = useGeocodeSingleMutation()
  const recognitionRef = useRef(null)

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const isSupported = !!SpeechRecognition

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  function startListening() {
    if (!isSupported) {
      toast.error('Voice input not supported in this browser. Use Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      const current = event.results[event.results.length - 1]
      setTranscript(current[0].transcript)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'no-speech') {
        toast.error(`Voice error: ${event.error}`)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  async function handleAddAddress() {
    if (!transcript.trim()) {
      toast.error('Please speak an address first')
      return
    }
    try {
      const result = await geocodeSingle(transcript.trim()).unwrap()
      if (result.result) {
        onAddressesReady([{
          cleaned: transcript.trim(),
          confidence: 'high',
          geocoded: result.result
        }])
        setTranscript('')
        toast.success('Address added from voice!')
      } else {
        toast.error('Could not find this location. Try speaking more clearly.')
      }
    } catch {
      toast.error('Geocoding failed. Try again.')
    }
  }

  if (!isSupported) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg viewBox="0 0 24 24" className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-sm">Voice input requires Chrome browser</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex gap-2">
        {[
          { code: 'en-IN', label: 'English' },
          { code: 'hi-IN', label: 'हिंदी' },
        ].map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${language === lang.code
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center py-4">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
        >
          {isListening ? (
            <div className="relative">
              <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75" />
              <svg viewBox="0 0 24 24" className="relative w-8 h-8 text-white" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        <p className="text-sm font-medium text-gray-700 mt-3 flex items-center gap-1.5">
          {isListening && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
          {isListening ? 'Listening... tap to stop' : 'Tap to speak address'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {language === 'hi-IN' ? 'हिंदी में पता बोलें' : 'Say the delivery address'}
        </p>
      </div>

      {transcript && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Heard:</p>
          <p className="text-sm text-gray-800 font-medium">{transcript}</p>
        </div>
      )}

      {transcript && (
        <button
          onClick={handleAddAddress}
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all
                     hover:opacity-90 disabled:opacity-50"
          style={{ background: '#4f46e5' }}
        >
          {isLoading ? 'Finding location...' : '+ Add This Address'}
        </button>
      )}

      {transcript && (
        <button
          onClick={() => setTranscript('')}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      )}
    </div>
  )
}