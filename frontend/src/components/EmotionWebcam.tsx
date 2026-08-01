import { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models'

interface EmotionWebcamProps {
  size?: 'large' | 'small' | 'full'
  showOverlay?: boolean
  onEmotionUpdate?: (emotions: Record<string, number>) => void
}

function EmotionWebcam({ size = 'large', showOverlay = false, onEmotionUpdate }: EmotionWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [topEmotion, setTopEmotion] = useState('')
  const [topValue, setTopValue] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let stream: MediaStream | null = null

    const setup = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        setModelsLoaded(true)

        stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (err) {
        setCameraError('Could not access camera. Check permissions, or your DroidCam connection.')
      }
    }

    setup()

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!modelsLoaded) return

    // Smaller inputSize + 1s interval instead of 700ms — noticeably lighter on weaker CPUs,
    // while still frequent enough for a smooth confidence trend in the report.
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })

    const interval = window.setInterval(async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || video.readyState !== 4) return

      const detection = await faceapi
        .detectSingleFace(video, detectorOptions)
        .withFaceExpressions()

      if (!canvas) return
      const displaySize = { width: video.videoWidth, height: video.videoHeight }
      faceapi.matchDimensions(canvas, displaySize)
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)

      if (detection) {
        const resized = faceapi.resizeResults(detection, displaySize)
        if (showOverlay) {
          faceapi.draw.drawDetections(canvas, [resized])
          faceapi.draw.drawFaceExpressions(canvas, [resized])
        }

        const expressions = detection.expressions as unknown as Record<string, number>
        const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1])
        setTopEmotion(sorted[0][0])
        setTopValue(sorted[0][1])
        onEmotionUpdate?.(expressions)
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [modelsLoaded, onEmotionUpdate, showOverlay])

  useEffect(() => {
    if (!showOverlay) return
    const timer = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [showOverlay])

  const formatElapsed = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const sizeClasses =
    size === 'large' ? 'w-full max-w-md h-80 rounded-xl' :
    size === 'small' ? 'w-40 h-32 rounded-xl' :
    'w-full h-full'

  return (
    <div className={`relative overflow-hidden bg-black ${sizeClasses}`}>
      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs p-4 text-center">
          {cameraError}
        </div>
      )}
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />

      {showOverlay && (
        <>
          <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            REC · {formatElapsed(elapsedSeconds)}
          </div>
          {topEmotion && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1 capitalize">
              <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              {topEmotion} {Math.round(topValue * 100)}%
            </div>
          )}
        </>
      )}

      {topEmotion && size === 'large' && !showOverlay && (
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded capitalize">
          {topEmotion}
        </div>
      )}
    </div>
  )
}

export default EmotionWebcam