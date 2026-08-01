import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInView } from '../hooks/useInView'
import logo from '../assets/logo.png'

function FeatureCard({ icon, title, desc, delay }: { icon: string; title: string; desc: string; delay: number }) {
  const { ref, isInView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ animationDelay: isInView ? `${delay}ms` : undefined }}
      className={`p-6 border border-gray-200 dark:border-gray-800 rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur
        ${isInView ? 'opacity-0 animate-[fadeInUp_0.7s_ease-out_forwards]' : 'opacity-0'}`}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  )
}

function AboutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleStart = () => {
    navigate(user ? '/form' : '/login')
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/30 dark:bg-blue-600/20 rounded-full blur-3xl animate-[floatBlob_11s_ease-in-out_infinite]" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/20 rounded-full blur-3xl animate-[floatBlob_13s_ease-in-out_infinite]" />

      <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
        <img src={logo} alt="HireReady AI" className="h-8 w-auto" />
      </div>

      {user && (
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="relative z-20 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
          >
            Dashboard →
          </button>
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
        <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 mb-6 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]">
          ✨ AI + Computer Vision · For engineering campuses
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-4 max-w-2xl opacity-0 animate-[fadeInUp_0.6s_ease-out_0.1s_forwards]">
          Practice interviews like it's <span className="text-blue-600 dark:text-blue-400">placement day.</span> Every day.
        </h1>

        <p className="text-gray-500 dark:text-gray-400 max-w-xl mb-8 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.2s_forwards]">
          Mock technical interviews with an AI interviewer that watches your webcam, tracks
          your confidence in real time, and grades every answer like a real hiring panel.
        </p>

        <button
          onClick={handleStart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition
                     hover:scale-105 active:scale-95 opacity-0 animate-[fadeInUp_0.6s_ease-out_0.3s_forwards]"
        >
          {user ? 'Start Practicing →' : 'Sign in to Start →'}
        </button>
      </div>

      <div className="relative z-10 grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto px-6 pb-24">
        <FeatureCard icon="🎥" title="Live emotion tracking" desc="Runs on-device in your browser. Tracks confidence and expression through every question." delay={0} />
        <FeatureCard icon="🧠" title="AI evaluated answers" desc="Every response is scored on clarity, confidence, and relevance." delay={120} />
        <FeatureCard icon="📊" title="Coach-style reports" desc="Score, strengths, improvements, and an emotion timeline after every session." delay={240} />
      </div>
    </div>
  )
}

export default AboutPage