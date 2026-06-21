import { useState, useRef } from 'react'
import { useExtractFromTextMutation } from '../../features/extract/extractApiSlice'
import toast from 'react-hot-toast'
import { ClipboardCheck } from 'lucide-react'

export default function ScreenshotUpload({ onAddressesReady }) {
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [isOCRing, setIsOCRing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const inputRef = useRef(null)

  const [extractFromText] = useExtractFromTextMutation()

  function handleFileChange(e) {
    const selected = e.target.files[0]
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setRawText('')
    setShowRaw(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    setFile(dropped)
    setPreview(URL.createObjectURL(dropped))
    setRawText('')
    setShowRaw(false)
  }


  function preprocessImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const TARGET = 2400
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (Math.max(w, h) < TARGET) {
          const s = TARGET / Math.max(w, h)
          w = Math.round(w * s)
          h = Math.round(h * s)
        }
        if (Math.max(w, h) > 4000) {
          const s = 4000 / Math.max(w, h)
          w = Math.round(w * s)
          h = Math.round(h * s)
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)

        const imageData = ctx.getImageData(0, 0, w, h)
        const d = imageData.data

        for (let i = 0; i < d.length; i += 4) {
          const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
          d[i] = d[i + 1] = d[i + 2] = gray
        }


        const hist = new Array(256).fill(0)
        for (let i = 0; i < d.length; i += 4) hist[d[i]]++
        const totalPx = (d.length / 4)
        let lo = 0, hi = 255, cum = 0
        for (let v = 0; v < 256; v++) {
          cum += hist[v]
          if (cum / totalPx < 0.05) lo = v
          if (cum / totalPx < 0.95) hi = v
        }
        const range = hi - lo || 1


        const blurred = new Uint8ClampedArray(d.length)
        // Simple box-blur 3×3 for unsharp mask
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let sum = 0, count = 0
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                  sum += d[(ny * w + nx) * 4]
                  count++
                }
              }
            }
            const idx = (y * w + x) * 4
            blurred[idx] = Math.round(sum / count)
          }
        }

        for (let i = 0; i < d.length; i += 4) {
          let v = Math.round(((d[i] - lo) / range) * 255)
          v = Math.max(0, Math.min(255, v))
          const sharp = v + 1.2 * (v - blurred[i])
          const final = Math.max(0, Math.min(255, Math.round(sharp)))
          d[i] = d[i + 1] = d[i + 2] = final
        }

        ctx.putImageData(imageData, 0, 0)
        canvas.toBlob(resolve, 'image/png', 1.0)
      }
      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  async function runOCR(blob, psmMode, label, progressStart, progressEnd, worker) {
    setOcrStatus(`Pass ${label}: reading text...`)
    await worker.setParameters({
      tessedit_pageseg_mode: String(psmMode),
      preserve_interword_spaces: '1',
    })
    const { data: { text } } = await worker.recognize(blob)
    return text.trim()
  }

  async function handleProcess() {
    if (!file) { toast.error('Please select an image first'); return }

    setIsOCRing(true)
    setOcrProgress(5)
    setOcrStatus('Enhancing image...')

    try {
      const processedBlob = await preprocessImage(file)
      setOcrProgress(15)

      setOcrStatus('Loading OCR engine...')
      const { createWorker } = await import('tesseract.js')

      const worker = await createWorker('eng', 1)
      setOcrProgress(28)

      const texts = []

      setOcrProgress(32)
      texts.push(await runOCR(processedBlob, 4, '1/3 (column)', 32, 50, worker))
      setOcrProgress(52)
      texts.push(await runOCR(processedBlob, 6, '2/3 (block)', 52, 70, worker))
      setOcrProgress(72)
      texts.push(await runOCR(processedBlob, 11, '3/3 (sparse)', 72, 88, worker))
      setOcrProgress(88)

      await worker.terminate()


      const allLines = new Map()
      for (const t of texts) {
        for (const line of t.split('\n')) {
          const trimmed = line.trim()
          if (trimmed.length < 4) continue
          const key = trimmed.toLowerCase().replace(/[^a-z0-9 ,]/g, '').replace(/\s+/g, ' ').trim()
          if (!key || key.length < 4) continue
          if (!allLines.has(key) || trimmed.length > allLines.get(key).length) {
            allLines.set(key, trimmed)
          }
        }
      }

      const mergedLines = [...allLines.values()]
      const combined = mergedLines.join('\n')
      setRawText(combined)
      setOcrProgress(90)

      console.log(`OCR extracted ${mergedLines.length} unique lines from 3 passes`)

      if (combined.length < 20) {
        toast.error('Very little text found. Try a clearer photo or higher zoom.', { duration: 5000 })
        setIsOCRing(false)
        return
      }

      setOcrStatus('AI extracting addresses...')
      const aiResult = await extractFromText(combined).unwrap()
      setOcrProgress(100)

      if (aiResult.addresses && aiResult.addresses.length > 0) {
        onAddressesReady(aiResult.addresses)
        toast.success(
          `Found ${aiResult.addresses.length} address${aiResult.addresses.length > 1 ? 'es' : ''}!`,
          { duration: 4000 }
        )
      } else {
        setShowRaw(true)
        toast(
          'Showing raw OCR text — copy it and paste into the Text input.',
          { icon: <ClipboardCheck size={18} className="text-amber-500" />, duration: 6000 }
        )
      }

    } catch (err) {
      console.error('Screenshot OCR error:', err)
      if (rawText) {
        setShowRaw(true)
        toast('OCR done but AI failed — raw text shown below.', { icon: <ClipboardCheck size={18} className="text-amber-500" />, duration: 5000 })
      } else {
        toast.error('Processing failed. Use the Text input and paste addresses manually.')
      }
    } finally {
      setIsOCRing(false)
      setOcrProgress(0)
      setOcrStatus('')
    }
  }

  function handleClear() {
    setFile(null)
    setPreview(null)
    setRawText('')
    setShowRaw(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleCopyRaw() {
    try {
      await navigator.clipboard.writeText(rawText)
      toast.success('Copied! Now paste in the Text input above.')
    } catch {
      toast.error('Select all text below and copy manually.')
    }
  }

  return (
    <div className="space-y-3">

      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center
                     cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
        >
          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: '#eef2ff' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0
                   L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Drop image here</p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, JFIF, WEBP — phone photos OK</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.jfif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-xl overflow-hidden border border-gray-100">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-h-52 object-contain bg-gray-50"
          />
          {!isOCRing && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow
                         flex items-center justify-center hover:bg-red-50 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {isOCRing && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{ocrStatus}</span>
            <span>{ocrProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${ocrProgress}%`, background: '#4f46e5' }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Running 3 OCR passes for maximum text coverage...
          </p>
        </div>
      )}

      {file && !isOCRing && (
        <button
          onClick={handleProcess}
          className="w-full py-2.5 rounded-xl text-white text-sm font-semibold
                     transition-all hover:opacity-90"
          style={{ background: '#4f46e5' }}
        >
          Extract Addresses from Image
        </button>
      )}

      {showRaw && rawText && (
        <div className="space-y-2 animate-fadein">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <strong>AI couldn't auto-extract.</strong> The raw OCR text is below.
            Copy it and paste into the <strong>Text</strong> input — it will extract from there.
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">
              Raw OCR ({rawText.split('\n').filter(l => l.trim()).length} lines)
            </p>
            <button
              onClick={handleCopyRaw}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <ClipboardCheck size={13} /> Copy all
            </button>
          </div>
          <textarea
            readOnly
            value={rawText}
            rows={7}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs
                       text-gray-700 bg-gray-50 resize-none font-mono leading-relaxed"
          />
        </div>
      )}

    </div>
  )
}