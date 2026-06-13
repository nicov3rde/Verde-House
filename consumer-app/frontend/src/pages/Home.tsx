import { useState, useRef, useCallback } from 'react'
import { createJob } from '../api'

interface Props { onSubmit: (jobId: string) => void }

type Tab = 'url' | 'upload'
type Platform = 'youtube' | 'twitch' | 'kick'

function detectPlatform(url: string): Platform {
  if (/twitch\.tv/i.test(url)) return 'twitch'
  if (/kick\.com/i.test(url)) return 'kick'
  return 'youtube'
}

const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: '#FF0000',
  twitch: '#9146FF',
  kick: '#53FC18',
}
const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  kick: 'Kick',
}

export default function Home({ onSubmit }: Props) {
  const [tab, setTab] = useState<Tab>('url')
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState<Platform>('youtube')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [styleRef, setStyleRef] = useState<File | null>(null)
  const [numClips, setNumClips] = useState(5)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [showStyle, setShowStyle] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const styleRef2 = useRef<HTMLInputElement>(null)

  const handleUrlChange = (v: string) => {
    setUrl(v)
    setPlatform(detectPlatform(v))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setVideoFile(file)
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (tab === 'url' && !url.trim()) { setError('Please enter a URL.'); return }
    if (tab === 'upload' && !videoFile) { setError('Please select a video file.'); return }

    setLoading(true)
    try {
      const form = new FormData()
      if (tab === 'url') {
        form.append('input_type', platform)
        form.append('url', url.trim())
      } else {
        form.append('input_type', 'file')
        form.append('video', videoFile!)
      }
      form.append('num_clips', String(numClips))
      form.append('aspect_ratio', aspectRatio)
      if (styleRef) form.append('style_ref', styleRef)

      const { job_id } = await createJob(form)
      onSubmit(job_id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start job.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-bg font-bold text-sm">V</span>
        </div>
        <span className="font-semibold text-lg tracking-tight">Verde Clip</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Turn long videos into viral clips</h1>
          <p className="text-muted text-sm">AI-powered highlight detection + vertical crop + burned-in captions</p>
        </div>

        <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 flex flex-col gap-5">

          {/* Tabs */}
          <div className="flex bg-bg rounded-xl p-1 gap-1">
            {(['url', 'upload'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t ? 'bg-card text-white' : 'text-muted hover:text-white'
                }`}
              >
                {t === 'url' ? '🔗 Paste URL' : '📁 Upload File'}
              </button>
            ))}
          </div>

          {/* URL input */}
          {tab === 'url' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-4 py-3 focus-within:border-accent transition-colors">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{ background: PLATFORM_COLORS[platform] + '22', color: PLATFORM_COLORS[platform] }}>
                  {PLATFORM_LABELS[platform]}
                </span>
                <input
                  type="url"
                  value={url}
                  onChange={e => handleUrlChange(e.target.value)}
                  placeholder="Paste YouTube, Twitch, or Kick URL…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder-muted"
                />
              </div>
              <p className="text-xs text-muted px-1">
                YouTube • Twitch VODs (requires TwitchDownloaderCLI) • Kick VODs (requires kick-dl)
              </p>
            </div>
          )}

          {/* File upload */}
          {tab === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-10 cursor-pointer transition-colors ${
                dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
              }`}
            >
              <span className="text-3xl">{videoFile ? '🎬' : '📤'}</span>
              <p className="text-sm font-medium">
                {videoFile ? videoFile.name : 'Drop video here or click to browse'}
              </p>
              <p className="text-xs text-muted">MP4, MOV, AVI • up to 2 GB</p>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => setVideoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

          {/* Settings row */}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs text-muted">Clips to generate</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={15} value={numClips}
                  onChange={e => setNumClips(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold w-6 text-center">{numClips}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted">Aspect ratio</label>
              <div className="flex gap-1">
                {['9:16', '1:1', '16:9'].map(r => (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      aspectRatio === r ? 'bg-accent text-bg' : 'bg-bg text-muted hover:text-white border border-border'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style reference (collapsible) */}
          <div>
            <button
              onClick={() => setShowStyle(s => !s)}
              className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors"
            >
              <span className="text-base">{showStyle ? '▾' : '▸'}</span>
              Style reference <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">optional</span>
            </button>
            {showStyle && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-xs text-muted">Upload a TikTok or Reel to clone its color grade and caption style.</p>
                <div
                  onClick={() => styleRef2.current?.click()}
                  className="flex items-center gap-3 border border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-accent/50 transition-colors"
                >
                  <span className="text-2xl">{styleRef ? '✅' : '🎨'}</span>
                  <span className="text-sm text-muted">{styleRef ? styleRef.name : 'Select style reference video…'}</span>
                  <input
                    ref={styleRef2}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => setStyleRef(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-4 py-2">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-bg bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Starting…' : '✨ Generate Clips'}
          </button>
        </div>
      </main>
    </div>
  )
}
