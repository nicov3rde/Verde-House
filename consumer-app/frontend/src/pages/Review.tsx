import { useEffect, useRef, useState, useCallback } from 'react'
import { getJob, approveClip, rejectClip, trimClip, mediaUrl, downloadUrl } from '../api'
import type { Clip } from '../types'

interface Props { jobId: string; onBack: () => void }
type View = 'swipe' | 'edit' | 'done'

const SWIPE_THRESHOLD = 80

export default function Review({ jobId, onBack }: Props) {
  const [clips, setClips] = useState<Clip[]>([])
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<View>('swipe')
  const [loading, setLoading] = useState(true)

  // Swipe state
  const [dragX, setDragX] = useState(0)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const dragStart = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Trim state
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    getJob(jobId).then(job => {
      setClips(job.clips ?? [])
      setLoading(false)
    })
  }, [jobId])

  useEffect(() => {
    if (clips[index]) {
      const dur = clips[index].end_time - clips[index].start_time
      setTrimStart(0)
      setTrimEnd(dur)
    }
  }, [index, clips])

  const clip = clips[index]
  const approved = clips.filter(c => c.status === 'approved')

  // ── Swipe handlers ────────────────────────────────────────────────────────

  const advanceToNext = useCallback(() => {
    setDragX(0)
    setExiting(null)
    setIndex(i => {
      const next = i + 1
      if (next >= clips.length) { setView('done'); return i }
      return next
    })
  }, [clips.length])

  const handleApprove = useCallback(async () => {
    if (!clip) return
    setExiting('right')
    await approveClip(clip.id)
    setClips(cs => cs.map(c => c.id === clip.id ? { ...c, status: 'approved' } : c))
    setTimeout(advanceToNext, 300)
  }, [clip, advanceToNext])

  const handleReject = useCallback(async () => {
    if (!clip) return
    setExiting('left')
    await rejectClip(clip.id)
    setClips(cs => cs.map(c => c.id === clip.id ? { ...c, status: 'rejected' } : c))
    setTimeout(advanceToNext, 300)
  }, [clip, advanceToNext])

  const handleEditMode = () => setView('edit')

  // Pointer events for swipe
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX
    cardRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return
    setDragX(e.clientX - dragStart.current)
  }
  const onPointerUp = () => {
    if (dragStart.current === null) return
    dragStart.current = null
    if (dragX > SWIPE_THRESHOLD) handleApprove()
    else if (dragX < -SWIPE_THRESHOLD) handleReject()
    else setDragX(0)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (view !== 'swipe') return
      if (e.key === 'ArrowRight') handleApprove()
      if (e.key === 'ArrowLeft') handleReject()
      if (e.key === 'e') handleEditMode()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, handleApprove, handleReject])

  // ── Trim handlers ─────────────────────────────────────────────────────────

  const handleTrimSave = async () => {
    if (!clip) return
    await trimClip(clip.id, trimStart, trimEnd)
    setClips(cs => cs.map(c => c.id === clip.id ? { ...c, status: 'approved' } : c))
    setView('swipe')
    setTimeout(advanceToNext, 100)
  }

  const nudge = (sec: number) => {
    const dur = clip ? clip.end_time - clip.start_time : 60
    setTrimStart(s => Math.max(0, Math.min(s + sec, trimEnd - 1)))
    if (videoRef.current) videoRef.current.currentTime = trimStart
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted">Loading clips…</div>
  }

  if (clips.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-muted">No clips were generated for this job.</p>
        <button onClick={onBack} className="text-accent underline text-sm">← Back to home</button>
      </div>
    )
  }

  // Done screen
  if (view === 'done') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 gap-6">
        <div className="text-center">
          <p className="text-4xl mb-3">🎉</p>
          <h2 className="text-2xl font-bold mb-1">All done!</h2>
          <p className="text-muted text-sm">{approved.length} clip{approved.length !== 1 ? 's' : ''} approved</p>
        </div>

        {approved.length > 0 && (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {approved.map(c => (
                <div key={c.id} className="rounded-xl overflow-hidden bg-card border border-border aspect-[9/16] relative">
                  <video src={mediaUrl(c.clip_path)} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-2">
                    <p className="text-xs font-medium truncate">{c.title}</p>
                    <span className="text-[10px] text-accent">Score {c.score}</span>
                  </div>
                </div>
              ))}
            </div>
            <a
              href={downloadUrl(jobId)}
              download
              className="block w-full py-3.5 rounded-xl font-semibold text-center text-bg bg-accent hover:bg-accent-dim transition-colors"
            >
              ⬇ Download All Approved ({approved.length})
            </a>
          </div>
        )}
        <button onClick={onBack} className="text-muted text-sm hover:text-white transition-colors">← New video</button>
      </div>
    )
  }

  // Edit / trim view
  if (view === 'edit' && clip) {
    const dur = clip.end_time - clip.start_time

    return (
      <div className="min-h-full flex flex-col bg-bg">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <button onClick={() => setView('swipe')} className="text-muted hover:text-white">✕</button>
          <span className="font-medium flex-1 truncate">{clip.title}</span>
          <button onClick={handleTrimSave} className="bg-accent text-bg text-sm font-semibold px-4 py-1.5 rounded-lg">
            Save & Approve
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center gap-6 px-4 py-6">
          {/* Video preview */}
          <div className="w-full max-w-xs aspect-[9/16] rounded-2xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={mediaUrl(clip.clip_path)}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Trim controls */}
          <div className="w-full max-w-sm flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>Start</span>
                <span>{trimStart.toFixed(1)}s</span>
              </div>
              <input
                type="range" min={0} max={dur} step={0.1} value={trimStart}
                onChange={e => {
                  const v = Number(e.target.value)
                  setTrimStart(Math.min(v, trimEnd - 0.5))
                  if (videoRef.current) videoRef.current.currentTime = v
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>End</span>
                <span>{trimEnd.toFixed(1)}s</span>
              </div>
              <input
                type="range" min={0} max={dur} step={0.1} value={trimEnd}
                onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 0.5))}
              />
            </div>

            {/* Nudge buttons */}
            <div className="flex gap-2 justify-center">
              {[-5, -2, 2, 5].map(n => (
                <button
                  key={n}
                  onClick={() => nudge(n)}
                  className="px-3 py-2 rounded-lg bg-card border border-border text-sm hover:border-accent transition-colors"
                >
                  {n > 0 ? `+${n}s` : `${n}s`}
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-muted">
              Duration: <strong className="text-white">{(trimEnd - trimStart).toFixed(1)}s</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main swipe view
  const rotation = dragX * 0.04
  const opacity = Math.min(Math.abs(dragX) / SWIPE_THRESHOLD, 1)
  const exitTransform = exiting === 'right'
    ? 'translateX(120vw) rotate(20deg)'
    : exiting === 'left'
    ? 'translateX(-120vw) rotate(-20deg)'
    : `translateX(${dragX}px) rotate(${rotation}deg)`

  return (
    <div className="min-h-full flex flex-col bg-bg select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={onBack} className="text-muted hover:text-white text-sm">✕</button>
        <span className="text-sm text-muted">
          {index + 1} / {clips.length}
        </span>
        <span className="text-sm text-accent font-medium">{approved.length} ✓</span>
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 relative overflow-hidden">
        {/* Background card (next clip) */}
        {index + 1 < clips.length && (
          <div className="absolute inset-x-4 inset-y-0 flex items-center justify-center pointer-events-none">
            <div className="w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden bg-card border border-border scale-95 opacity-50" />
          </div>
        )}

        {/* Main swipe card */}
        {clip && (
          <div
            ref={cardRef}
            className="swipe-card relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl cursor-grab active:cursor-grabbing"
            style={{
              transform: exitTransform,
              transition: exiting ? 'transform 0.35s ease' : dragX !== 0 ? 'none' : 'transform 0.25s ease',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Video */}
            <video
              key={clip.id}
              src={mediaUrl(clip.clip_path)}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Approve overlay */}
            <div
              className="absolute inset-0 bg-accent/30 flex items-center justify-center rounded-2xl transition-opacity"
              style={{ opacity: dragX > 0 ? opacity : 0 }}
            >
              <span className="text-white text-6xl font-black rotate-[-20deg] border-4 border-white rounded-xl px-4 py-1">✓</span>
            </div>

            {/* Reject overlay */}
            <div
              className="absolute inset-0 bg-danger/30 flex items-center justify-center rounded-2xl transition-opacity"
              style={{ opacity: dragX < 0 ? opacity : 0 }}
            >
              <span className="text-white text-6xl font-black rotate-[20deg] border-4 border-white rounded-xl px-4 py-1">✗</span>
            </div>

            {/* Clip info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 py-5 pointer-events-none">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-accent text-bg text-xs font-bold px-2 py-0.5 rounded-full">
                  {clip.score}
                </span>
                <span className="text-xs text-white/70">viral score</span>
              </div>
              <h3 className="text-white font-bold text-base leading-tight mb-1">{clip.title}</h3>
              <p className="text-white/70 text-xs leading-snug line-clamp-2">"{clip.hook_sentence}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 pb-8 px-4">
        <button
          onClick={handleReject}
          className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-2xl hover:border-danger hover:text-danger transition-colors shadow-lg"
        >
          ✗
        </button>
        <button
          onClick={handleEditMode}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-lg hover:border-accent hover:text-accent transition-colors shadow-md"
          title="Edit / Trim (E)"
        >
          ✂
        </button>
        <button
          onClick={handleApprove}
          className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-2xl hover:border-accent hover:text-accent transition-colors shadow-lg"
        >
          ✓
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-muted pb-4 hidden sm:block">
        ← Reject &nbsp;·&nbsp; E Edit &nbsp;·&nbsp; → Approve
      </p>
    </div>
  )
}
