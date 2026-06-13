export type InputType = 'youtube' | 'twitch' | 'kick' | 'file'
export type JobStatus = 'queued' | 'running' | 'done' | 'error'
export type ClipStatus = 'pending' | 'approved' | 'rejected'

export interface Job {
  id: string
  status: JobStatus
  input_type: InputType
  url: string
  num_clips: number
  aspect_ratio: string
  error_msg: string | null
  created_at: string
  clips: Clip[]
}

export interface Clip {
  id: string
  job_id: string
  index_num: number
  title: string
  score: number
  hook_sentence: string
  start_time: number
  end_time: number
  clip_path: string
  status: ClipStatus
}

export interface ProgressEvent {
  step: string
  message: string
  pct: number
}
