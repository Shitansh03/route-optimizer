import { useState, useRef } from 'react'
import { useUploadRecordingMutation } from '../../features/extract/extractApiSlice'
import { useSocket } from '../../hooks/useSocket'
import toast from 'react-hot-toast'
import { Film, RefreshCw, Sparkles, Eye, Bot, Mailbox, CheckCircle2, Lightbulb, Clock, Check, Circle } from 'lucide-react'

const STEPS = {
  extract: { label: 'Extracting frames', icon: Film },
  dedup: { label: 'Removing duplicate frames', icon: RefreshCw },
  enhance: { label: 'Enhancing image quality', icon: Sparkles },
  ocr: { label: 'Reading text (OCR)', icon: Eye },
  ai: { label: 'AI extracting addresses', icon: Bot },
  validate: { label: 'Validating PIN codes', icon: Mailbox },
  done: { label: 'Complete!', icon: CheckCircle2 },
}

export default function ScreenRecording({ onAddressesReady }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState({ step: '', message: '', pct: 0 })
  const inputRef = useRef(null)

  const [uploadRecording] = useUploadRecordingMutation()
  const { subscribe } = useSocket()

  function handleFileChange(e) {
    const selected = e.target.files[0]
    if (!selected) return
    if (!selected.type.startsWith('video/')) {
      toast.error('Please upload a video file (MP4, MOV, etc.)')
      return
    }
    setFile(selected)
  }

  function handleDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped && dropped.type.startsWith('video/')) {
      setFile(dropped)
    } else {
      toast.error('Please drop a video file')
    }
  }

  async function handleUpload() {
    if (!file) return

    setUploading(true)
    setProgress({ step: 'upload', message: 'Uploading video...', pct: 2 })

    try {
      const formData = new FormData()
      formData.append('video', file)

      const result = await uploadRecording(formData).unwrap()
      const { sessionId } = result

      setUploading(false)
      setProcessing(true)
      setProgress({ step: 'extract', message: 'Starting processing...', pct: 5 })

      subscribe(
        sessionId,
        (data) => {
          setProgress({
            step: data.step || '',
            message: data.message || '',
            pct: data.pct || 0,
          })
        },
        (result) => {
          setProcessing(false)
          setProgress({ step: 'done', message: 'Complete!', pct: 100 })

          const allAddresses = [
            ...(result.autoApproved || []),
            ...(result.needsReview || [])
          ]

          if (allAddresses.length > 0) {
            onAddressesReady(allAddresses, result.needsReview || [])
            toast.success(
              `Found ${result.totalFound} addresses! ${result.autoApproved?.length} auto-approved, ${result.needsReview?.length} need review.`,
              { duration: 5000 }
            )
          } else {
            toast.error('No addresses found in recording. Make sure the app shows addresses while scrolling.')
          }

          setFile(null)
          if (inputRef.current) inputRef.current.value = ''
          setTimeout(() => setProgress({ step: '', message: '', pct: 0 }), 3000)
        },
        (message) => {
          setProcessing(false)
          setUploading(false)
          toast.error(message || 'Processing failed. Please try again.')
          setProgress({ step: '', message: '', pct: 0 })
        }
      )

    } catch (err) {
      setUploading(false)
      setProcessing(false)
      toast.error('Upload failed. Check your connection and try again.')
    }
  }

  function formatSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const isActive = uploading || processing

  return (
    <div className="space-y-4">

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
        <div className="flex gap-2">
          <Lightbulb size={18} className="text-indigo-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-indigo-800 mb-0.5">How to use:</p>
            <p className="text-xs text-indigo-600 leading-relaxed">
              Screen record yourself scrolling through delivery addresses in Field-X or any app.
              Upload the video and we'll automatically extract all addresses.
            </p>
          </div>
        </div>
      </div>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !isActive && inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer
                     hover:border-orange-400 hover:bg-orange-50/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: '#fff7ed' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Drop screen recording here</p>
          <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI — up to 500MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
          </div>
          {!isActive && (
            <button
              onClick={() => setFile(null)}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {isActive && (
        <div className="space-y-3">
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              {STEPS[progress.step]?.icon && (() => {
                const StepIcon = STEPS[progress.step].icon
                return <StepIcon size={13} />
              })()}
              {progress.message}
            </span>
            <span>{progress.pct}%</span>
          </div>

          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress.pct}%`,
                background: 'linear-gradient(90deg, #4f46e5, #7c3aed)'
              }}
            />
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Object.entries(STEPS).map(([key, step]) => {
              const stepPcts = { extract: 15, dedup: 28, enhance: 35, ocr: 67, ai: 80, validate: 90, done: 100 }
              const isDone = progress.pct >= stepPcts[key]
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isDone ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                    {isDone ? <Check size={12} /> : <Circle size={8} fill="currentColor" />}
                  </div>
                  <step.icon size={10} style={{ color: isDone ? '#4f46e5' : '#9ca3af' }} />
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
            <Clock size={12} /> This takes 1-3 minutes depending on video length
          </p>
        </div>
      )}

      {file && !isActive && (
        <button
          onClick={handleUpload}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
        >
          <Film size={16} /> Process Screen Recording
        </button>
      )}

    </div>
  )
}