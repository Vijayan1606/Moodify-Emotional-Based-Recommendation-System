"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Sparkles, Heart, Brain, Music, Book, Film, Camera, Zap, Star } from "lucide-react"

import { EnhancedRecommendationCard } from "@/components/enhanced-recommendation-card"
import { EnhancedEmotionDetector } from "@/components/enhanced-emotion-detector"

type Emotion = "happy" | "sad" | "angry" | "surprised" | "neutral" | "disgust" | "fear"

interface Recommendation {
  id: string
  title: string
  description: string
  image: string
  link: string
  rating?: number
  preview_url?: string
}

interface EmotionData {
  emotion: Emotion
  confidence: number
  timestamp: number
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

export default function MoodifyApp() {
  const [isDetecting, setIsDetecting] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<EmotionData | null>(null)
  const [recommendations, setRecommendations] = useState<{
    movies: Recommendation[]
    songs: Recommendation[]
    books: Recommendation[]
  }>({ movies: [], songs: [], books: [] })
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const fetchRecommendations = async (emotion: Emotion) => {
    setIsLoadingRecommendations(true)

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emotion }),
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data)
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const backgroundGradient = currentEmotion 
    ? `bg-gradient-to-br ${emotionColors[currentEmotion.emotion]}`
    : "bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"

  return (
    <div className={`min-h-screen ${backgroundGradient} transition-all duration-1000 relative overflow-hidden`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-float"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 -right-10 w-96 h-96 bg-white/5 rounded-full blur-2xl animate-float"
          animate={{
            x: [0, -80, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-10 left-1/3 w-80 h-80 bg-white/10 rounded-full blur-xl animate-float"
          animate={{
            x: [0, 150, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Welcome Animation */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center text-white p-8"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🧠✨
              </motion.div>
              <h1 className="text-4xl font-bold mb-2">Welcome to Moodify</h1>
              <p className="text-xl text-white/80">Emotion-Based Recognition & Personalized Content Discovery</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto container-padding section-padding relative z-10">
        {/* Header Section */}
        <motion.div
          className="text-center mb-8 sm:mb-12 lg:mb-16"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Brain className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              Mood
              <span className="text-gradient-secondary">
                ify
              </span>
            </h1>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-10 h-10 text-yellow-400" />
            </motion.div>
          </div>
          
          <motion.p
            className="text-base sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Discover a new way to explore content—Moodify understands your emotions in real time to suggest the perfect movies, music, and books that resonate with how you feel.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-6 sm:mt-8 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { icon: Camera, text: "Real-time Face Detection", color: "bg-blue-500/20 text-blue-300" },
              { icon: Star, text: "Personalized Recommendations", color: "bg-purple-500/20 text-purple-300" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full ${feature.color} backdrop-blur-sm border border-white/20`}
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                <feature.icon className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Current Emotion Display */}
        <AnimatePresence>
          {currentEmotion && (
            <motion.div
              className="text-center mb-6 sm:mb-8 px-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-3 sm:gap-4 card-glass-strong rounded-2xl px-4 sm:px-8 py-3 sm:py-4 animate-pulse-glow">
                <motion.div
                  className="text-3xl sm:text-4xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  {emotionEmojis[currentEmotion.emotion]}
                </motion.div>
                <div className="text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-white capitalize">
                    {currentEmotion.emotion}
                  </h3>
                  <p className="text-sm sm:text-base text-white/70">
                    {Math.round(currentEmotion.confidence * 100)}% confidence
                  </p>
                </div>
                <motion.div
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-white/20 to-white/10 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Heart className="w-8 h-8 text-pink-300" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Emotion Detection */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <EnhancedEmotionDetector
            onEmotionDetected={(emotionData) => {
              setCurrentEmotion(emotionData)
              fetchRecommendations(emotionData.emotion)
            }}
            isDetecting={isDetecting}
            setIsDetecting={setIsDetecting}
          />
        </motion.div>

        {/* Recommendations Section */}
        <AnimatePresence>
          {currentEmotion && (
            <motion.div
              className="space-y-6 sm:space-y-8 mt-8 sm:mt-12 px-4"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-center">
                <motion.h2
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Perfect for your {" "}
                  <span className={`bg-gradient-to-r ${emotionColors[currentEmotion.emotion]} bg-clip-text text-transparent`}>
                    {currentEmotion.emotion}
                  </span>
                  {" "} mood
                </motion.h2>
                <motion.p
                  className="text-base sm:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto px-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Our AI has curated these personalized recommendations just for you, 
                  using advanced emotion recognition and content matching algorithms.
                </motion.p>
              </div>

              {isLoadingRecommendations ? (
                <motion.div
                  className="flex flex-col items-center justify-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-12 h-12 text-white/70 mb-4" />
                  </motion.div>
                  <p className="text-white/70 text-lg">Crafting perfect recommendations...</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Film className="w-5 h-5 text-blue-400" />
                    <Music className="w-5 h-5 text-green-400" />
                    <Book className="w-5 h-5 text-orange-400" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, staggerChildren: 0.2 }}
                >
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                  >
                    <EnhancedRecommendationCard 
                      title="🎬 Movies" 
                      items={recommendations.movies} 
                      type="movie"
                      gradient="from-red-500/20 to-pink-500/20"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                  >
                    <EnhancedRecommendationCard 
                      title="🎵 Songs" 
                      items={recommendations.songs} 
                      type="song"
                      gradient="from-green-500/20 to-emerald-500/20"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <EnhancedRecommendationCard 
                      title="📚 Books" 
                      items={recommendations.books} 
                      type="book"
                      gradient="from-blue-500/20 to-indigo-500/20"
                    />
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call to Action */}
        {!currentEmotion && !isDetecting && (
          <motion.div
            className="text-center mt-12 sm:mt-16 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 text-white/80 text-base sm:text-lg"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Camera className="w-6 h-6" />
              <span>Click the camera above to start your emotion analysis</span>
              <Sparkles className="w-6 h-6" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <motion.footer
        className="text-center py-6 sm:py-8 mt-12 sm:mt-16 border-t border-white/10 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <p className="text-sm sm:text-base text-white/60">
          Driven by smart technology • Crafted with ❤️ to make content discovery more meaningful
        </p>
      </motion.footer>

    </div>
  )
}
