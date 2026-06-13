import { useEffect, useRef, useState } from 'react'
import { streamJob } from '../api'

interface Props {
  jobId: string
  onDone: () => void
  onError: (msg: string) => void
}

interface Step {
  message: string
  pct: number
}

const STEPS = [
  'Downloading video',
  'Transcribing audio',
  'Finding viral moments',
  'Rendering clips',
]

export default function Processing({ jobId, onDone, onError }: Props) {
  const [pct, setPct] = useState(0)
  const [message, setMessage] = useState('Starting up…')
  const [logs, setLogs] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const es = streamJob(jobId)
    esRef.current = es

    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const d: Step = JSON.parse(e.data)
        setPct(p => Math.max(p, d.pct))
        setMessage(d.message)
      } catch {}
    })

    es.addEventListener('log', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        if (d.line) setLogs(l => [...l.slice(-99), d.line])
      } catch {}
    })

    es.addEventListener('done', () => {
      setPct(100)
      setMessage('Done!')
      setTimeout(onDone, 600)
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        onError(d.message || 'Unknown error')
      } catch {
        onError('Connection lost')
      }
    })

    es.onerror = () => {
      // SSE ping timeout — try to reconnect by polling status
    }

    return () => es.close()
  }, [jobId])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const activeStep = pct < 20 ? 0 : pct < 48 ? 1 : pct < 72 ? 2 : 3

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 gap-8">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center animate-pulse">
          <span className="text-bg font-bold">V</span>
        </div>
        <span className="font-semibold text-xl">Verde Clip</span>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Progress bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-white font-medium">{message}</span>
            <span className="text-muted">{pct}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex gap-2">
          {STEPS.map((step, i) => (
            <div key={step} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < activeStep ? 'bg-accent text-bg' :
                i === activeStep ? 'bg-accent/30 text-accent ring-1 ring-accent' :
                'bg-border text-muted'
              }`}>
                {i < activeStep ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${
                i <= activeStep ? 'text-white' : 'text-muted'
              }`}>{step}</span>
            </div>
          ))}
        </div>

        {/* Live logs */}
        {logs.length > 0 && (
          <div className="bg-bg border border-border rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-xs text-muted">
            {logs.map((l, i) => (
              <div key={i} className="leading-5">{l}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        <p className="text-xs text-center text-muted">
          Job ID: <code className="text-accent">{jobId}</code> — this may take several minutes for long videos.
        </p>
      </div>
    </div>
  )
}
