import type { Clip, Job } from './types'

const BASE = ''  // same origin in prod; Vite proxy handles dev

export async function createJob(form: FormData): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE}/api/jobs`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${BASE}/api/jobs/${jobId}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listJobs(): Promise<Job[]> {
  const res = await fetch(`${BASE}/api/jobs`)
  if (!res.ok) return []
  return res.json()
}

export function streamJob(jobId: string): EventSource {
  return new EventSource(`${BASE}/api/jobs/${jobId}/stream`)
}

export async function approveClip(clipId: string): Promise<void> {
  await fetch(`${BASE}/api/clips/${clipId}/approve`, { method: 'POST' })
}

export async function rejectClip(clipId: string): Promise<void> {
  await fetch(`${BASE}/api/clips/${clipId}/reject`, { method: 'POST' })
}

export async function trimClip(clipId: string, start: number, end: number): Promise<Clip> {
  const res = await fetch(`${BASE}/api/clips/${clipId}/trim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start, end }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function mediaUrl(clipPath: string): string {
  return `${BASE}/media/${clipPath}`
}

export function downloadUrl(jobId: string): string {
  return `${BASE}/api/jobs/${jobId}/download`
}
