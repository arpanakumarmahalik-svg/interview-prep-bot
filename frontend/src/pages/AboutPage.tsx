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

function StepCard({ number, title, desc, delay }: { number: number; title: string; desc: string; delay: number }) {
  const { ref, isInView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ animationDelay: isInView ? `${delay}ms` : undefined }}
      className={`relative p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur
        ${isInView ? 'opacity-0 animate-[fadeInUp_0.7s_ease-out_forwards]' : 'opacity-0'}`}
    >
      <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  )
}

function WhyItem({ text, delay }: { text: string; delay: number }) {
  const { ref, isInView } = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ animationDelay: isInView ? `${delay}ms` : undefined }}
      className={`flex items-start gap-3 ${isInView ? 'opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]' : 'opacity-0'}`}
    >
      <span className="text-green-500 mt-0.5">✓</span>
      <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  )
}

function AboutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleStart = () => {
    navigate(user ? '/form' : '/login')
  }

  const { ref: sampleRef, isInView: sampleInView } = useInView<HTMLDivElement>()

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

      {/* ---- Hero ---- */}
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

      {/* ---- How It Works ---- */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">How It Works</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          From resume to report card in one focused session.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          <StepCard number={1} title="Upload Your Resume" desc="Share your resume, skills, and pick a target company." delay={0} />
          <StepCard number={2} title="Take a Live Interview" desc="8 realistic stages, voice-driven, just like the real thing." delay={100} />
          <StepCard number={3} title="Get Instant AI Feedback" desc="Every answer scored on clarity, confidence, and relevance." delay={200} />
          <StepCard number={4} title="Track Your Growth" desc="Revisit past sessions and watch your score improve." delay={300} />
        </div>
      </div>

      {/* ---- Features ---- */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Features</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          Everything you need to walk into your real interview prepared.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          <FeatureCard icon="🎥" title="Live emotion tracking" desc="Runs on-device in your browser. Tracks confidence and expression through every question." delay={0} />
          <FeatureCard icon="🧠" title="AI evaluated answers" desc="Every response is scored on clarity, confidence, and relevance." delay={80} />
          <FeatureCard icon="📊" title="Coach-style reports" desc="Score, strengths, improvements, and an emotion timeline after every session." delay={160} />
          <FeatureCard icon="📄" title="Resume-based questions" desc="Questions are generated from your actual skills and projects — never generic." delay={240} />
          <FeatureCard icon="🎙️" title="Voice-first interaction" desc="Speak your answers naturally, with typing available as a fallback." delay={320} />
          <FeatureCard icon="📈" title="Progress dashboard" desc="Track your score trend across every practice session over time." delay={400} />
        </div>
      </div>

      {/* ---- Sample Report (mock preview) ---- */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">See a Sample Report</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-10 max-w-xl mx-auto">
          Here's a preview of the kind of feedback you'll get after every session.
        </p>

        <div
          ref={sampleRef}
          className={`border border-gray-200 dark:border-gray-800 rounded-2xl p-6 sm:p-8 bg-white/70 dark:bg-gray-900/70 backdrop-blur
            ${sampleInView ? 'opacity-0 animate-[fadeInUp_0.8s_ease-out_forwards]' : 'opacity-0'}`}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Sample Session</p>
              <p className="font-semibold">Infosys — Technical Round</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase">Overall</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                82<span className="text-base text-gray-400">/100</span>
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Emotion Distribution</p>
              <div className="flex items-end gap-2 h-24">
                {[
                  { label: 'Happy', h: '35%', color: 'bg-green-400' },
                  { label: 'Neutral', h: '80%', color: 'bg-indigo-400' },
                  { label: 'Sad', h: '10%', color: 'bg-sky-400' },
                  { label: 'Fearful', h: '20%', color: 'bg-amber-400' },
                  { label: 'Surprised', h: '15%', color: 'bg-cyan-400' },
                ].map(bar => (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full rounded-t ${bar.color}`} style={{ height: bar.h }} />
                    <span className="text-[9px] text-gray-400">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-400 uppercase mb-3">Feedback Highlights</p>
              <ul className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-600 dark:text-gray-300">Clear, structured technical explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-600 dark:text-gray-300">Confident tone through most of the session</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">▲</span>
                  <span className="text-gray-600 dark:text-gray-300">Add more real project examples in answers</span>
                </li>
              </ul>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-6 text-center">Illustrative preview — your real report is generated from your own interview.</p>
        </div>
      </div>

      {/* ---- Why Choose Our AI Interviewer ---- */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Why Choose Our AI Interviewer?</h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          <WhyItem text="Available 24/7 — no scheduling a mock interview with a senior or faculty" delay={0} />
          <WhyItem text="Personalized to your actual resume, not a generic question bank" delay={80} />
          <WhyItem text="Evaluates the way a real recruiter would — clarity, confidence, and relevance" delay={160} />
          <WhyItem text="Practice as many times as you want, completely pressure-free" delay={240} />
          <WhyItem text="Tracks confidence and emotion, not just correctness" delay={320} />
          <WhyItem text="Detailed reports you can revisit anytime from your dashboard" delay={400} />
        </div>
      </div>

      {/* ---- Final CTA ---- */}
      <div className="relative z-10 text-center px-6 pb-28">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          Your next interview could be your best one.
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Practice today. Improve tomorrow.
        </p>
        <button
          onClick={handleStart}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-lg transition hover:scale-105 active:scale-95"
        >
          Start Your AI Interview →
        </button>
      </div>
    </div>
  )
}

export default AboutPage