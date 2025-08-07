"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Camera, 
  CameraOff, 
  Loader2, 
  Play, 
  AlertCircle, 
  Brain, 
  Cloud, 
  Zap,
  Eye,
  Sparkles,
  Activity,
  Shield,
  Wifi,
  WifiOff
} from "lucide-react"

type Emotion = "happy" | "sad" | "angry" | "surprised" | "neutral" | "disgust" | "fear"

interface EmotionData {
  emotion: Emotion
  confidence: number
  timestamp: number
  allEmotions?: { [key in Emotion]: number }
  faceDetected?: boolean
  serviceMode?: "deepface_ai" | "cloud_ai" | "simulation" | "fallback"
}

interface EnhancedEmotionDetectorProps {
  onEmotionDetected: (emotion: EmotionData) => void
  isDetecting: boolean
  setIsDetecting: (detecting: boolean) => void
}

const emotionEmojis = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  surprised: "😮",
  neutral: "😐",
  disgust: "🤢",
  fear: "😰"
}

const emotionColors = {
  happy: "from-yellow-400 to-orange-500",
  sad: "from-blue-400 to-indigo-600",
  angry: "from-red-400 to-red-600",
  surprised: "from-purple-400 to-pink-500",
  neutral: "from-gray-400 to-gray-600",
  disgust: "from-green-400 to-emerald-600",
  fear: "from-indigo-400 to-purple-600"
}

export function EnhancedEmotionDetector({
  onEmotionDetected,
  isDetecting,
  setIsDetecting,
}: EnhancedEmotionDetectorProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [serviceMode, setServiceMode] = useState<"checking" | "online" | "simulation">("checking")
  const [detectionError, setDetectionError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [detectionCount, setDetectionCount] = useState(0)
  const [faceDetectionActive, setFaceDetectionActive] = useState(false)
  const [forceRealDetection, setForceRealDetection] = useState(false)
  const [realApiConfigured, setRealApiConfigured] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsClient(true)
    checkServiceStatus()
  }, [])

  const checkServiceStatus = useCallback(async () => {
    try {
      // Test with a small image to check service availability
      const response = await fetch("/api/emotion-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==",
          forceRealDetection: true
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Real API detection succeeded
        setServiceMode("online")
        setRealApiConfigured(true)
      } else if (result.service_mode === "error" || result.service_mode === "faceplus_error" || result.service_mode === "no_real_service") {
        // Real API not configured or failed
        setServiceMode("simulation")
        setRealApiConfigured(false)
        if (forceRealDetection) {
          setDetectionError(result.error || "Real emotion detection service not available")
        }
      } else {
        setServiceMode("simulation")
        setRealApiConfigured(false)
      }
    } catch (error) {
      setServiceMode("simulation")
      setRealApiConfigured(false)
    }
  }, [forceRealDetection])

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraActive(true)
        
        // Start continuous face detection indication
        setFaceDetectionActive(true)
      }
    } catch (error) {
      setCameraError(
        "Unable to access camera. Please grant camera permissions and ensure your camera is available."
      )
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    setIsCameraActive(false)
    setFaceDetectionActive(false)
    setCameraError(null)
  }, [])

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return null

    const videoWidth = video.videoWidth || 640
    const videoHeight = video.videoHeight || 480

    let targetWidth = Math.min(videoWidth, 800)
    let targetHeight = Math.min(videoHeight, 600)

    // Maintain aspect ratio
    const aspectRatio = videoWidth / videoHeight
    if (targetWidth / targetHeight > aspectRatio) {
      targetWidth = targetHeight * aspectRatio
    } else {
      targetHeight = targetWidth / aspectRatio
    }

    canvas.width = targetWidth
    canvas.height = targetHeight

    ctx.clearRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)

    return canvas.toDataURL("image/jpeg", 0.85)
  }, [])

  const detectEmotion = useCallback(async () => {
    if (!isCameraActive || isDetecting) return

    setIsDetecting(true)
    setDetectionError(null)

    try {
      const frameData = captureFrame()
      if (!frameData) {
        throw new Error("Failed to capture video frame")
      }

      const response = await fetch("/api/emotion-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameData,
          forceRealDetection: forceRealDetection
        }),
      })

      const result = await response.json()

      if (!result.success && result.error) {
        setDetectionError(result.error)
      }

      const emotionData: EmotionData = {
        emotion: result.emotion as Emotion,
        confidence: result.confidence || 0.5,
        timestamp: Date.now(),
        allEmotions: result.all_emotions,
        faceDetected: result.face_detected,
        serviceMode: result.service_mode || "simulation",
      }

      setCurrentEmotion(emotionData)
      onEmotionDetected(emotionData)
      setDetectionCount(prev => prev + 1)
      
      // Update service mode based on response
      if (result.service_mode) {
        setServiceMode(result.service_mode === "simulation" ? "simulation" : "online")
      }

    } catch (error) {
      setDetectionError(error instanceof Error ? error.message : "Detection failed")
    } finally {
      setIsDetecting(false)
    }
  }, [isCameraActive, isDetecting, captureFrame, onEmotionDetected, setIsDetecting])

  const getServiceIcon = () => {
    if (forceRealDetection && !realApiConfigured) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }

    switch (serviceMode) {
      case "online":
        return <Cloud className="w-4 h-4 text-green-500" />
      case "simulation":
        return forceRealDetection ? <AlertCircle className="w-4 h-4 text-orange-500" /> : <Brain className="w-4 h-4 text-blue-500" />
      default:
        return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
    }
  }

  const getServiceText = () => {
    if (forceRealDetection && !realApiConfigured) {
      return "Real API Required"
    }

    switch (serviceMode) {
      case "online":
        return realApiConfigured ? "Face++ API Active" : "Cloud AI Active"
      case "simulation":
        return forceRealDetection ? "Real API Unavailable" : "Demo Mode"
      default:
        return "Connecting..."
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Card className="card-glass-strong shadow-2xl">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Camera Section */}
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center">
                  <motion.h3
                    className="text-xl sm:text-2xl font-bold text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    Live Emotion Detection
                  </motion.h3>

                </div>

                {/* Camera Feed */}
                <motion.div
                  className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-inner"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.3 }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Face Detection Overlay */}
                  {isCameraActive && faceDetectionActive && (
                    <motion.div
                      className="absolute inset-0 border-2 border-green-400/50 rounded-2xl"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(34, 197, 94, 0.4)",
                          "0 0 0 20px rgba(34, 197, 94, 0)",
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Camera Inactive Overlay */}
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <motion.div
                        className="text-center text-white"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Camera className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                        </motion.div>
                        <p className="text-base sm:text-lg font-medium">Camera Ready</p>
                        <p className="text-xs sm:text-sm opacity-75 mt-1">
                          Click start to begin emotion analysis
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {/* Detection Processing Overlay */}
                  <AnimatePresence>
                    {isDetecting && (
                      <motion.div
                        className="absolute inset-0 bg-black/50 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          className="text-center text-white"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Brain className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-blue-400" />
                          </motion.div>
                          <p className="text-base sm:text-lg font-medium">Analyzing Emotions</p>
                          <p className="text-xs sm:text-sm opacity-75">AI processing your facial expressions...</p>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>

                {/* Camera Controls */}
                <div className="flex justify-center gap-4">
                  <AnimatePresence mode="wait">
                    {!isCameraActive ? (
                      <motion.div
                        key="start"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Button
                          onClick={startCamera}
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg"
                          disabled={!isClient || serviceMode === "checking"}
                        >
                          <Camera className="w-5 h-5 mr-2" />
                          Start Camera
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="controls"
                        className="flex gap-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Button
                          onClick={detectEmotion}
                          disabled={isDetecting}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg"
                        >
                          {isDetecting ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <Zap className="w-5 h-5 mr-2" />
                          )}
                          {isDetecting ? "Analyzing..." : "Detect Emotion"}
                        </Button>
                        <Button
                          onClick={stopCamera}
                          variant="outline"
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20 px-6 py-3 rounded-xl font-medium"
                        >
                          <CameraOff className="w-5 h-5 mr-2" />
                          Stop
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error Display */}
                <AnimatePresence>
                  {(cameraError || detectionError) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Alert className="bg-red-500/10 border-red-500/20 text-white">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {cameraError || detectionError}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Face++ Configuration Guide */}
                <AnimatePresence>
                  {forceRealDetection && !realApiConfigured && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4"
                    >
                      <div className="text-orange-300 text-sm">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Face++ API Configuration Required
                        </h4>
                        <div className="space-y-2 text-xs">
                          <p>To use real emotion detection, configure your Face++ API credentials:</p>
                          <ol className="list-decimal list-inside space-y-1 ml-4">
                            <li>Get API keys from <a href="https://www.faceplusplus.com/" target="_blank" className="text-orange-200 underline">Face++ Console</a></li>
                            <li>Set environment variables:</li>
                            <div className="bg-black/30 rounded p-2 font-mono text-xs mt-1">
                              FACEPLUS_API_KEY=your_api_key<br/>
                              FACEPLUS_API_SECRET=your_api_secret
                            </div>
                            <li>Restart your application</li>
                          </ol>
                          <p className="text-orange-200">
                            💡 Until configured, demo mode provides realistic simulation.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Results Section */}
              <div className="space-y-6">
                <div className="text-center">
                  <motion.h3
                    className="text-2xl font-bold text-white mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Emotion Analysis
                  </motion.h3>
                  <div className="flex items-center justify-center gap-2 text-white/70">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">{detectionCount} analyses completed</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {currentEmotion ? (
                    <motion.div
                      key="results"
                      className="space-y-6"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.5 }}
                    >
                      {/* Primary Emotion */}
                      <div className="text-center">
                        <motion.div
                          className={`inline-flex items-center gap-3 bg-gradient-to-r ${emotionColors[currentEmotion.emotion]} p-6 rounded-2xl text-white shadow-2xl`}
                          whileHover={{ scale: 1.05 }}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <span className="text-4xl">
                            {emotionEmojis[currentEmotion.emotion]}
                          </span>
                          <div className="text-left">
                            <h4 className="text-2xl font-bold capitalize">
                              {currentEmotion.emotion}
                            </h4>
                            <p className="text-white/90">
                              {Math.round(currentEmotion.confidence * 100)}% confidence
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Emotion Distribution */}
                      {currentEmotion.allEmotions && (
                        <motion.div
                          className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Detailed Analysis
                          </h4>
                          <div className="space-y-3">
                            {Object.entries(currentEmotion.allEmotions)
                              .sort(([, a], [, b]) => b - a)
                              .map(([emotion, confidence], index) => (
                                <motion.div
                                  key={emotion}
                                  className="space-y-2"
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.1 * index }}
                                >
                                  <div className="flex justify-between text-white">
                                    <span className="capitalize flex items-center gap-2">
                                      <span>{emotionEmojis[emotion as Emotion]}</span>
                                      {emotion}
                                    </span>
                                    <span className="font-medium">
                                      {Math.round(confidence * 100)}%
                                    </span>
                                  </div>
                                  <div className="relative">
                                    <Progress 
                                      value={confidence * 100} 
                                      className="h-2 bg-white/10"
                                    />
                                  </div>
                                </motion.div>
                              ))}
                          </div>


                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="waiting"
                      className="text-center py-12"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Brain className="w-16 h-16 mx-auto mb-4 text-white/50" />
                      </motion.div>
                      <h4 className="text-xl font-semibold text-white mb-2">
                        Ready for Analysis
                      </h4>
                      <p className="text-white/70">
                        Start your camera and click "Detect Emotion" to begin
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
