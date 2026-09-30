import TopBar from '../components/TopBar'
import { Terminal } from 'lucide-react'

export default function SqlExplorer() {
  return (
    <>
      <TopBar title="SQL Explorer" subtitle="Run the curated 30 queries read-only" />
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="glass max-w-md p-8 text-center">
          <Terminal className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
          <h2 className="font-display text-xl font-bold">SQL Explorer coming soon</h2>
          <p className="mt-2 text-sm text-slate-500">SELECT-only runner via explorer_ro.</p>
        </div>
      </div>
    </>
  )
}
