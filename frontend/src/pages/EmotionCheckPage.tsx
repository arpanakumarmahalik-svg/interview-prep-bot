import { useLocation, useNavigate } from 'react-router-dom'
import EmotionWebcam from '../components/EmotionWebcam'

function EmotionCheckPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const candidate = location.state

  if (!candidate) {
    navigate('/form')
    return null
  }

  const goToInterview = () => {
    navigate('/interview', { state: candidate })
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Camera & Emotion Check</h1>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
        See how you look on camera and practice a confident expression before we start.
        This step is optional — skip it anytime.
      </p>

      <EmotionWebcam size="large" />

      <div className="flex gap-4 mt-8">
        <button
          onClick={goToInterview}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-6 py-3"
        >
          Skip
        </button>
        <button
          onClick={goToInterview}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition"
        >
          Continue to Interview
        </button>
      </div>
    </div>
  )
}

export default EmotionCheckPage