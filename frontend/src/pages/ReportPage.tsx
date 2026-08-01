import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { supabase } from '../lib/supabaseClient'

interface TranscriptItem {
  stage: string
  question: string
  answer: string
  score: number | null
  feedback: string
}

interface EmotionSample {
  t: number
  expressions: Record<string, number>
}

interface ReportData {
  id?: string
  targetCompany?: string
  candidateName?: string
  overallScore: number | null
  transcript: TranscriptItem[]
  emotionSamples: EmotionSample[]
  strengths: string[]
  improvements: string[]
}

const EMOTION_COLORS: Record<string, string> = {
  happy: '#22c55e',
  neutral: '#818cf8',
  sad: '#38bdf8',
  angry: '#ef4444',
  fearful: '#f59e0b',
  disgusted: '#a855f7',
  surprised: '#06b6d4',
}

function ReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()

  const [report, setReport] = useState<ReportData | null>((location.state as ReportData) || null)
  const [loading, setLoading] = useState(!location.state && !!id)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (report || !id) return
    const fetchReport = async () => {
      const { data, error } = await supabase.from('sessions').select('*').eq('id', id).single()
      if (error || !data) {
        setLoadError('Could not load this report.')
      } else {
        setReport({
          id: data.id,
          targetCompany: data.target_company,
          overallScore: data.overall_score,
          transcript: data.report_data?.transcript ?? [],
          emotionSamples: data.report_data?.emotionSamples ?? [],
          strengths: data.report_data?.strengths ?? [],
          improvements: data.report_data?.improvements ?? [],
          candidateName: data.report_data?.candidateName,
        })
      }
      setLoading(false)
    }
    fetchReport()
  }, [id, report])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading report...</div>
  }

  if (loadError || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-red-500 mb-4">{loadError || 'No report data found.'}</p>
        <button onClick={() => navigate('/dashboard')} className="text-blue-600 underline">Back to Dashboard</button>
      </div>
    )
  }

  const scoredStages = report.transcript.filter(t => t.score !== null)
  const chartData = report.emotionSamples.map(s => ({ t: s.t, ...s.expressions }))
  const emotionKeys = report.emotionSamples.length > 0 ? Object.keys(report.emotionSamples[0].expressions) : []
  const distributionData = emotionKeys.map(key => {
    const avg = report.emotionSamples.reduce((sum, s) => sum + (s.expressions[key] || 0), 0) / report.emotionSamples.length
    return { emotion: key, value: Math.round(avg * 100) }
  })

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            ← Back to Dashboard
          </button>
          <span className="text-sm text-gray-500">{report.targetCompany}</span>
        </div>

        <div className="flex justify-between items-end mb-8">
          <h1 className="text-3xl font-bold">Session Report</h1>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase">Overall</p>
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {report.overallScore ?? 'N/A'}<span className="text-lg text-gray-400">/100</span>
            </p>
          </div>
        </div>

        {report.emotionSamples.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Emotion timeline</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  {emotionKeys.map(key => (
                    <Line key={key} type="monotone" dataKey={key} stroke={EMOTION_COLORS[key] || '#888'} dot={false} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Emotion distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="emotion" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value">
                    {distributionData.map((d, i) => (
                      <Cell key={i} fill={EMOTION_COLORS[d.emotion] || '#888'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-10">Camera wasn't used during this session, so no emotion data is available.</p>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">Strengths</h3>
            <ul className="text-sm space-y-2 list-disc list-inside">
              {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h3 className="font-semibold mb-3 text-amber-600 dark:text-amber-400">Areas to improve</h3>
            <ul className="text-sm space-y-2 list-disc list-inside">
              {report.improvements.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Question-by-question breakdown</h2>
        <div className="space-y-4 mb-10">
          {scoredStages.map((item, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs uppercase text-gray-500">{item.stage.replace('_', ' ')}</p>
                <span className="text-sm font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">
                  {item.score}/100
                </span>
              </div>
              <p className="font-medium mb-2">{item.question}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.answer}</p>
              {item.feedback && <p className="text-sm italic">{item.feedback}</p>}
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button onClick={() => navigate('/form')} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg">
            Start another interview
          </button>
          <button onClick={() => navigate('/dashboard')} className="border border-gray-300 dark:border-gray-700 px-6 py-3 rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReportPage