import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import interviewerMale from '../assets/avatars/interviewer-male.jpg'
import interviewerFemale from '../assets/avatars/interviewer-female.jpg'
import EmotionWebcam from '../components/EmotionWebcam'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCheatLock } from '../hooks/useCheatLock'

const API_URL = import.meta.env.VITE_API_URL
const INTERVIEW_DURATION_SECONDS = 30 * 60
const CLOSING_MESSAGE = "It was nice talking to you and we'll get back to you soon."
const LOCKOUT_HOURS = 3

const STAGES = [
  { key: 'introduction', label: 'Introduction' },
  { key: 'educational', label: 'Educational Background' },
  { key: 'technical', label: 'Technical' },
  { key: 'coding', label: 'Coding' },
  { key: 'project', label: 'Project' },
  { key: 'hr', label: 'HR' },
  { key: 'company', label: 'Company Fit' },
  { key: 'reverse_qa', label: 'Your Turn to Ask' },
]

interface CandidateData {
  name: string
  gender: string
  branch: string
  year: string
  skills: string
  projects: string
  targetCompany: string
  resumeText: string
}

interface AnswerRecord {
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

interface QAItem {
  stage: string
  question: string
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function unlockSpeechSynthesis() {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.resume()
    const primer = new SpeechSynthesisUtterance('')
    primer.volume = 0
    window.speechSynthesis.speak(primer)
  } catch {
    // ignore
  }
}

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) {
      resolve([])
      return
    }
    const existing = window.speechSynthesis.getVoices()
    if (existing.length > 0) {
      resolve(existing)
      return
    }
    let resolved = false
    window.speechSynthesis.onvoiceschanged = () => {
      if (resolved) return
      resolved = true
      resolve(window.speechSynthesis.getVoices())
    }
    setTimeout(() => {
      if (resolved) return
      resolved = true
      resolve(window.speechSynthesis.getVoices())
    }, 1000)
  })
}

function pickVoiceForGender(voices: SpeechSynthesisVoice[], gender: string): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'))
  const pool = englishVoices.length > 0 ? englishVoices : voices
  if (pool.length === 0) return null

  const maleKeywords = ['male', 'david', 'daniel', 'alex', 'fred', 'ravi', 'george', 'james', 'mark', 'guy', 'aaron', 'tom', 'oliver']
  const femaleKeywords = ['female', 'zira', 'samantha', 'heera', 'susan', 'victoria', 'karen', 'linda', 'moira', 'tessa', 'salli', 'joanna', 'aria', 'sara']

  const wantMale = gender === 'male'
  const keywords = wantMale ? maleKeywords : femaleKeywords
  const opposite = wantMale ? femaleKeywords : maleKeywords

  const match = pool.find(v => keywords.some(k => v.name.toLowerCase().includes(k)))
  if (match) return match

  const safe = pool.find(v => !opposite.some(k => v.name.toLowerCase().includes(k)))
  return safe || pool[0]
}

function pitchForGender(gender: string): number {
  return gender === 'female' ? 1.25 : 0.8
}

// Kept at module scope so the utterance object can't be garbage-collected mid-speech —
// a known Chrome bug where speech silently stops if the utterance isn't referenced anywhere.
let activeUtterance: SpeechSynthesisUtterance | null = null

function speak(
  text: string,
  voice: SpeechSynthesisVoice | null,
  pitch: number,
  onEnd?: () => void,
  onError?: (msg: string) => void
) {
  if (!('speechSynthesis' in window)) {
    onError?.('This browser does not support text-to-speech.')
    return
  }
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-IN'
  utterance.rate = 1
  utterance.pitch = pitch
  if (voice) utterance.voice = voice
  utterance.onend = () => {
    activeUtterance = null
    onEnd?.()
  }
  utterance.onerror = (e: any) => {
    activeUtterance = null
    onEnd?.()
    onError?.(`Voice playback error: ${e?.error || 'unknown'}`)
  }

  activeUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  activeUtterance = null
  void activeUtterance // referenced so TypeScript doesn't flag it as unused
}

function getFriendlyErrorMessage(rawError: string): string {
  const lower = rawError.toLowerCase()
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return 'Daily AI limit reached. Please try again later.'
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

function computeOverallScore(transcript: AnswerRecord[]): number | null {
  const scored = transcript.filter(t => t.score !== null) as (AnswerRecord & { score: number })[]
  if (scored.length === 0) return null
  const avg = scored.reduce((sum, t) => sum + t.score, 0) / scored.length
  return Math.round(avg)
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
const isVoiceSupported = !!SpeechRecognitionAPI

function InterviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const candidate = location.state as CandidateData | null
  const { lockedUntil, createLock } = useCheatLock()

  const [hasStarted, setHasStarted] = useState(false)
  const [startError, setStartError] = useState('')
  const [violation, setViolation] = useState(false)

  const [stageIndex, setStageIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  const [allQuestions, setAllQuestions] = useState<QAItem[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questionsError, setQuestionsError] = useState('')

  const [reverseQaAnswer, setReverseQaAnswer] = useState('')
  const [gettingAnswer, setGettingAnswer] = useState(false)
  const [reverseQaAnswered, setReverseQaAnswered] = useState(false)

  const [secondsLeft, setSecondsLeft] = useState(INTERVIEW_DURATION_SECONDS)
  const [isFinished, setIsFinished] = useState(false)
  const [preparingReport, setPreparingReport] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const greetingRef = useRef(getGreeting())
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const pitchRef = useRef<number>(1)
  const [voiceReady, setVoiceReady] = useState(false)
  const [noVoicesAvailable, setNoVoicesAvailable] = useState(false)
  const [ttsError, setTtsError] = useState('')

  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef<any>(null)

  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const [showCamera, setShowCamera] = useState(false)
  const emotionSamplesRef = useRef<EmotionSample[]>([])
  const startTimeRef = useRef<number>(Date.now())

  const isCodingStage = STAGES[stageIndex].key === 'coding'
  const isReverseQaStage = STAGES[stageIndex].key === 'reverse_qa'

  useEffect(() => {
    if (!candidate) navigate('/form')
  }, [candidate, navigate])

  useEffect(() => {
    if (lockedUntil) navigate('/form')
  }, [lockedUntil, navigate])

  useEffect(() => {
    if (!candidate || !hasStarted) return
    let cancelled = false
    pitchRef.current = pitchForGender(candidate.gender)
    getVoices().then(voices => {
      if (cancelled) return
      if (voices.length === 0) {
        setNoVoicesAvailable(true)
      }
      selectedVoiceRef.current = pickVoiceForGender(voices, candidate.gender)
      setVoiceReady(true)
    })
    return () => { cancelled = true }
  }, [candidate, hasStarted])

  // Chrome has a known bug where speechSynthesis silently pauses itself after ~15s
  // of continuous speaking, or after a fullscreen/visibility change. Nudging resume()
  // repeatedly while something is supposed to be speaking works around it.
  useEffect(() => {
    if (!isSpeaking) return
    const watchdog = setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.resume()
      }
    }, 2000)
    return () => clearInterval(watchdog)
  }, [isSpeaking])

  useEffect(() => {
    if (!candidate || !hasStarted || isFinished || allQuestions.length > 0) return
    fetchAllQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, hasStarted, voiceReady])

  useEffect(() => {
    if (!candidate || !hasStarted || isFinished || allQuestions.length === 0) return
    const q = allQuestions[stageIndex]
    if (!q) return
    setCurrentQuestion(q.question)

    if (!isMuted) {
      const textToSpeak = stageIndex === 0
        ? `${greetingRef.current}, ${candidate.name}. ${q.question}`
        : q.question
      setIsSpeaking(true)
      setTtsError('')
      speak(
        textToSpeak,
        selectedVoiceRef.current,
        pitchRef.current,
        () => setIsSpeaking(false),
        (msg) => { setIsSpeaking(false); setTtsError(msg) }
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex, allQuestions, hasStarted])

  useEffect(() => {
    if (!candidate || !hasStarted || isFinished) return
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          finishInterview()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, hasStarted, isFinished])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      stopSpeaking()
    }
  }, [stageIndex])

  useEffect(() => {
    if (!hasStarted || isFinished || violation) return

    const handleViolation = () => {
      if (isFinished || violation) return
      recordViolation()
    }

    const onVisibilityChange = () => {
      if (document.hidden) handleViolation()
    }
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) handleViolation()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    document.addEventListener('fullscreenchange', onFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, isFinished, violation])

  const recordViolation = async () => {
    setViolation(true)
    setIsFinished(true)
    if (isListening) stopListening()
    stopSpeaking()
    await createLock(LOCKOUT_HOURS, 'Left fullscreen or switched tabs during the interview')
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const beginInterview = async () => {
    setStartError('')
    unlockSpeechSynthesis()

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      setStartError('Fullscreen is required to start the interview. Please allow fullscreen and try again.')
      return
    }
    startTimeRef.current = Date.now()
    setHasStarted(true)
  }

  const handleEmotionUpdate = (expressions: Record<string, number>) => {
    emotionSamplesRef.current.push({
      t: Math.round((Date.now() - startTimeRef.current) / 1000),
      expressions,
    })
  }

  const fetchAllQuestions = async () => {
    if (!candidate) return
    setLoadingQuestions(true)
    setQuestionsError('')

    try {
      const response = await fetch(`${API_URL}/api/questions/generate-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: candidate.branch,
          year: candidate.year,
          skills: candidate.skills,
          projects: candidate.projects,
          target_company: candidate.targetCompany,
          resume_text: candidate.resumeText,
        }),
      })

      const rawText = await response.text()
      if (!response.ok) {
        throw new Error(getFriendlyErrorMessage(rawText))
      }

      const data = JSON.parse(rawText)
      setAllQuestions(data.questions || [])
    } catch (err) {
      setQuestionsError(err instanceof Error ? err.message : getFriendlyErrorMessage(''))
    } finally {
      setLoadingQuestions(false)
    }
  }

  const startListening = (isRetry = false) => {
    if (!isVoiceSupported) {
      setVoiceError('Voice input is not supported in this browser. Please type your answer instead.')
      return
    }

    setVoiceError('')
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true

    let finalTranscript = currentAnswer ? currentAnswer + ' ' : ''

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) finalTranscript += transcript + ' '
        else interimTranscript += transcript
      }
      setCurrentAnswer(finalTranscript + interimTranscript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' && !isRetry) {
        setIsListening(false)
        setTimeout(() => startListening(true), 300)
        return
      }
      if (event.error === 'no-speech') {
        setVoiceError("Didn't catch that. Tap the mic and start speaking right away.")
      } else if (event.error === 'not-allowed') {
        setVoiceError('Microphone access was blocked. Please allow microphone access and try again.')
      } else {
        setVoiceError('Voice input error. Try again or type instead.')
      }
      setIsListening(false)
    }

    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsListening(false)
  }

  const handleGetAnswer = async () => {
    if (!candidate || !currentAnswer.trim()) return
    setGettingAnswer(true)

    try {
      const response = await fetch(`${API_URL}/api/questions/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentAnswer,
          target_company: candidate.targetCompany,
          branch: candidate.branch,
          skills: candidate.skills,
        }),
      })

      const rawText = await response.text()
      if (!response.ok) {
        throw new Error(getFriendlyErrorMessage(rawText))
      }

      const data = JSON.parse(rawText)
      setReverseQaAnswer(data.answer)
      setReverseQaAnswered(true)

      if (!isMuted) {
        setIsSpeaking(true)
        speak(
          data.answer,
          selectedVoiceRef.current,
          pitchRef.current,
          () => setIsSpeaking(false),
          (msg) => { setIsSpeaking(false); setTtsError(msg) }
        )
      }
    } catch (err) {
      setReverseQaAnswer(err instanceof Error ? err.message : getFriendlyErrorMessage(''))
      setReverseQaAnswered(true)
    } finally {
      setGettingAnswer(false)
    }
  }

  const handleNext = () => {
    if (isListening) stopListening()

    const record: AnswerRecord = {
      stage: STAGES[stageIndex].key,
      question: currentQuestion,
      answer: currentAnswer,
      score: null,
      feedback: '',
    }
    const updatedAnswers = [...answers, record]
    setAnswers(updatedAnswers)
    setCurrentAnswer('')

    if (stageIndex < STAGES.length - 1) {
      setStageIndex(prev => prev + 1)
    } else {
      finishInterview(updatedAnswers)
    }
  }

  const finishInterview = async (finalAnswers?: AnswerRecord[]) => {
    if (isListening) stopListening()
    let transcript = finalAnswers ?? answers
    setIsFinished(true)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    if (!isMuted) speak(CLOSING_MESSAGE, selectedVoiceRef.current, pitchRef.current)

    if (!candidate) return
    setPreparingReport(true)

    let strengths: string[] = []
    let improvements: string[] = []

    try {
      const scorable = transcript.filter(t => t.stage !== 'reverse_qa')
      const res = await fetch(`${API_URL}/api/questions/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_company: candidate.targetCompany,
          transcript: scorable.map(t => ({ stage: t.stage, question: t.question, answer: t.answer })),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        strengths = data.strengths ?? []
        improvements = data.improvements ?? []
        const scoreMap: Record<string, { score: number; feedback: string }> = {}
        ;(data.scores ?? []).forEach((s: any) => {
          scoreMap[s.stage] = { score: s.score, feedback: s.feedback }
        })
        transcript = transcript.map(t => {
          const match = scoreMap[t.stage]
          return match ? { ...t, score: match.score, feedback: match.feedback } : t
        })
      }
    } catch {
      // keep empty on failure — report still works without scores
    }

    const overallScore = computeOverallScore(transcript)
    const emotionSamples = emotionSamplesRef.current

    const fullReport: {
      id?: string
      targetCompany: string
      candidateName: string
      overallScore: number | null
      transcript: AnswerRecord[]
      emotionSamples: EmotionSample[]
      strengths: string[]
      improvements: string[]
    } = {
      targetCompany: candidate.targetCompany,
      candidateName: candidate.name,
      overallScore,
      transcript,
      emotionSamples,
      strengths,
      improvements,
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user?.id,
          target_company: candidate.targetCompany,
          overall_score: overallScore,
          report_data: fullReport,
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase save failed:', error)
      } else if (data) {
        fullReport.id = data.id
      }
    } catch (err) {
      console.error('Supabase save failed:', err)
    }

    setReportData(fullReport)
    setPreparingReport(false)
  }

  if (!candidate) return null

  if (violation) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">👋</div>
        <p className="text-xl font-medium max-w-md mb-2">
          We'll be ending the interview here. Thank you for your time.
        </p>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          New interviews are locked for {LOCKOUT_HOURS} hours.
        </p>
        <button
          onClick={() => navigate('/form')}
          className="bg-gray-200 dark:bg-gray-800 px-6 py-3 rounded-lg font-medium"
        >
          Back to Form
        </button>
      </div>
    )
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🖥️</div>
        <h1 className="text-2xl font-bold mb-2">Ready to begin?</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-2">
          This interview runs in fullscreen. Your camera will be used to track confidence throughout —
          you can choose to view it, but it stays on either way, just like a real proctored exam.
        </p>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
          Leaving fullscreen or switching tabs/apps will end the session and lock new interviews for {LOCKOUT_HOURS} hours.
        </p>
        {startError && <p className="text-red-500 text-sm mb-4">{startError}</p>}
        <button
          onClick={beginInterview}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition"
        >
          Enter Fullscreen & Begin Interview
        </button>
      </div>
    )
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">👋</div>
        <p className="text-xl font-medium max-w-md">{CLOSING_MESSAGE}</p>
        {preparingReport ? (
          <p className="text-sm text-gray-400 mt-6">Preparing your report...</p>
        ) : (
          <button
            onClick={() => navigate('/report', { state: reportData })}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
          >
            View Report
          </button>
        )}
      </div>
    )
  }

  const avatarLabel = candidate.gender === 'female' ? 'Interviewer (F)' : 'Interviewer (M)'
  const avatarImage = candidate.gender === 'female' ? interviewerFemale : interviewerMale
  const isLowTime = secondsLeft <= 60
  const nextButtonLabel = stageIndex < STAGES.length - 1 ? 'Next Question' : 'Continue'

  const micButton = !loadingQuestions && !questionsError && (
    <button
      type="button"
      onClick={isListening ? stopListening : () => startListening()}
      disabled={reverseQaAnswered}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition disabled:opacity-40
        ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
    >
      🎤 {isListening ? 'Listening... tap to stop' : 'Tap to speak'}
    </button>
  )

  const answerBlock = isReverseQaStage ? (
    <>
      <textarea
        value={currentAnswer}
        onChange={e => setCurrentAnswer(e.target.value)}
        placeholder="Type or speak your question for the interviewer..."
        rows={3}
        disabled={loadingQuestions || !!questionsError || reverseQaAnswered}
        className="w-full p-3 rounded-lg border dark:bg-gray-800 dark:border-gray-700 mb-4 disabled:opacity-50"
      />
      {reverseQaAnswered && (
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 mb-4 text-left">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Interviewer's answer:</p>
          <p className="text-sm">{reverseQaAnswer}</p>
        </div>
      )}
      {!reverseQaAnswered ? (
        <button
          onClick={handleGetAnswer}
          disabled={loadingQuestions || !!questionsError || !currentAnswer.trim() || gettingAnswer}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition"
        >
          {gettingAnswer ? 'Getting answer...' : 'Ask'}
        </button>
      ) : (
        <button
          onClick={() => finishInterview([...answers, { stage: 'reverse_qa', question: currentQuestion, answer: currentAnswer, score: null, feedback: '' }])}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
        >
          Finish Interview
        </button>
      )}
    </>
  ) : (
    <>
      <textarea
        value={currentAnswer}
        onChange={e => setCurrentAnswer(e.target.value)}
        onKeyDown={e => {
          if (isCodingStage && e.key === 'Tab') {
            e.preventDefault()
            const target = e.target as HTMLTextAreaElement
            const start = target.selectionStart
            const end = target.selectionEnd
            const newValue = currentAnswer.slice(0, start) + '  ' + currentAnswer.slice(end)
            setCurrentAnswer(newValue)
            requestAnimationFrame(() => {
              target.selectionStart = target.selectionEnd = start + 2
            })
          }
        }}
        placeholder={isCodingStage ? '// Write your code here...' : 'Type or speak your answer here...'}
        rows={isCodingStage ? 8 : 4}
        disabled={loadingQuestions || !!questionsError}
        spellCheck={!isCodingStage}
        className={`w-full p-3 rounded-lg border mb-4 disabled:opacity-50 ${
          isCodingStage
            ? 'font-mono text-sm bg-gray-900 text-green-300 border-gray-700 text-left'
            : 'dark:bg-gray-800 dark:border-gray-700'
        }`}
      />
      <button
        onClick={handleNext}
        disabled={loadingQuestions || !!questionsError || !currentAnswer.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition"
      >
        {nextButtonLabel}
      </button>
    </>
  )

  const topBar = (
    <div className="px-6 pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>Stage {stageIndex + 1} of {STAGES.length} — {STAGES[stageIndex].label}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowCamera(prev => !prev)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              {showCamera ? '📷 Hide camera' : '📷 Show camera'}
            </button>
            <button
              type="button"
              onClick={() => {
                const newMuted = !isMuted
                setIsMuted(newMuted)
                if (newMuted) stopSpeaking()
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <span className={isLowTime ? 'text-red-500 font-semibold' : ''}>⏱ {formatTime(secondsLeft)} remaining</span>
          </div>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${((stageIndex + 1) / STAGES.length) * 100}%` }} />
        </div>
      </div>
    </div>
  )

  const voiceWarnings = (
    <>
      {noVoicesAvailable && (
        <p className="text-xs text-amber-500 mb-2">
          No text-to-speech voice was found on this device — questions will be shown as text only.
        </p>
      )}
      {ttsError && (
        <p className="text-xs text-red-500 mb-2">{ttsError}</p>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      {topBar}

      <div className={showCamera
        ? 'flex-1 flex flex-col md:flex-row gap-4 px-6 py-6 max-w-5xl mx-auto w-full'
        : 'flex-1 flex flex-col items-center justify-center px-6 py-8'}
      >
        <div className={showCamera ? 'flex-1 min-h-[320px] md:min-h-0' : 'fixed top-0 -left-[9999px] w-40 h-32 pointer-events-none'}>
          <EmotionWebcam size={showCamera ? 'full' : 'small'} showOverlay={showCamera} onEmotionUpdate={handleEmotionUpdate} />
        </div>

        {showCamera ? (
          <div className="w-full md:w-96 flex flex-col justify-center">
            {stageIndex === 0 && !loadingQuestions && !questionsError && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{greetingRef.current}, {candidate.name}.</p>
            )}
            {voiceWarnings}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 min-h-[90px] flex items-center mb-4">
              {loadingQuestions && <p className="text-gray-500 dark:text-gray-400">Preparing your interview questions...</p>}
              {questionsError && <p className="text-red-500 text-sm">{questionsError}</p>}
              {!loadingQuestions && !questionsError && <p className="text-base font-medium">{currentQuestion}</p>}
            </div>
            {!loadingQuestions && !questionsError && <div className="mb-3">{micButton}</div>}
            {voiceError && <p className="text-xs text-red-500 mb-3">{voiceError}</p>}
            {!isVoiceSupported && (
              <p className="text-xs text-gray-400 mb-3">Voice input works best in Chrome or Edge. You can also type your answer below.</p>
            )}
            {answerBlock}
          </div>
        ) : (
          <div className="max-w-2xl w-full text-center">
            <div className="flex flex-col items-center mb-6">
              <img
                src={avatarImage}
                alt="Interviewer"
                className={`w-28 h-28 rounded-full object-cover border-4 ${(loadingQuestions || isSpeaking) ? 'border-blue-400 animate-pulse' : 'border-transparent'}`}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{avatarLabel}</p>
            </div>
            {stageIndex === 0 && !loadingQuestions && !questionsError && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{greetingRef.current}, {candidate.name}.</p>
            )}
            {voiceWarnings}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 min-h-[100px] flex items-center justify-center mb-6">
              {loadingQuestions && <p className="text-gray-500 dark:text-gray-400">Preparing your interview questions...</p>}
              {questionsError && <p className="text-red-500 text-sm">{questionsError}</p>}
              {!loadingQuestions && !questionsError && <p className="text-lg font-medium">{currentQuestion}</p>}
            </div>
            {!loadingQuestions && !questionsError && <div className="flex justify-center mb-3">{micButton}</div>}
            {voiceError && <p className="text-xs text-red-500 mb-3">{voiceError}</p>}
            {!isVoiceSupported && (
              <p className="text-xs text-gray-400 mb-3">Voice input works best in Chrome or Edge. You can also type your answer below.</p>
            )}
            {answerBlock}
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewPage