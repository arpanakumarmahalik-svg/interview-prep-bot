import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.png'

interface SessionRow {
  id: string
  target_company: string
  overall_score: number | null
  created_at: string
  report_data: { transcript: any[]; candidateName?: string }
}

function DashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error && data) setSessions(data as SessionRow[])
      setLoading(false)
    }
    fetchSessions()
  }, [user])

  const scored = sessions.filter(s => s.overall_score !== null)
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + (s.overall_score || 0), 0) / scored.length) : null
  const bestScore = scored.length > 0 ? Math.max(...scored.map(s => s.overall_score || 0)) : null
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-10">
          <img src={logo} alt="HireReady AI" className="h-8 w-auto" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{displayName}</span>
            <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Sign out</button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {displayName}.</h2>
            <p className="text-sm text-gray-500">Pick a topic and get grilled. We'll track your progress.</p>
          </div>
          <button onClick={() => navigate('/form')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg">
            + New interview
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Sessions</p>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Avg score</p>
            <p className="text-3xl font-bold">{avgScore ?? '—'}</p>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Best score</p>
            <p className="text-3xl font-bold">{bestScore ?? '—'}</p>
          </div>
        </div>

        <h3 className="font-semibold mb-3">Recent interviews</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No interviews yet. Start your first one above.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => (
              <div key={s.id} className="flex justify-between items-center border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <div>
                  <p className="font-medium">{s.target_company}</p>
                  <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full">
                    Score {s.overall_score ?? 'N/A'}
                  </span>
                  <button onClick={() => navigate(`/report/${s.id}`)} className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                    View →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage