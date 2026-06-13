import { useState } from 'react'
import Home from './pages/Home'
import Processing from './pages/Processing'
import Review from './pages/Review'

export type Page =
  | { name: 'home' }
  | { name: 'processing'; jobId: string }
  | { name: 'review'; jobId: string }

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'home' })

  if (page.name === 'processing') {
    return (
      <Processing
        jobId={page.jobId}
        onDone={() => setPage({ name: 'review', jobId: page.jobId })}
        onError={(msg) => {
          alert(`Job failed: ${msg}`)
          setPage({ name: 'home' })
        }}
      />
    )
  }

  if (page.name === 'review') {
    return (
      <Review
        jobId={page.jobId}
        onBack={() => setPage({ name: 'home' })}
      />
    )
  }

  return (
    <Home
      onSubmit={(jobId) => setPage({ name: 'processing', jobId })}
    />
  )
}
