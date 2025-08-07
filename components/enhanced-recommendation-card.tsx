"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ExternalLink, 
  Star, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Film, 
  Music, 
  Book,
  Heart,
  Download,
  Share2,
  Sparkles
} from "lucide-react"

interface Recommendation {
  id: string
  title: string
  description: string
  image: string
  link: string
  rating?: number
  preview_url?: string
}

interface EnhancedRecommendationCardProps {
  title: string
  items: Recommendation[]
  type: "movie" | "song" | "book"
  gradient?: string
}

const typeIcons = {
  movie: Film,
  song: Music,
  book: Book
}

const typeColors = {
  movie: "from-red-500/20 to-pink-500/20",
  song: "from-green-500/20 to-emerald-500/20", 
  book: "from-blue-500/20 to-indigo-500/20"
}

export function EnhancedRecommendationCard({ 
  title, 
  items, 
  type, 
  gradient 
}: EnhancedRecommendationCardProps) {
  const [playingPreview, setPlayingPreview] = useState<string | null>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set())

  const TypeIcon = typeIcons[type]
  const cardGradient = gradient || typeColors[type]

  const handlePreviewPlay = (previewUrl: string, itemId: string) => {
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
    }

    if (playingPreview === itemId) {
      setPlayingPreview(null)
      setAudioElement(null)
      return
    }

    const audio = new Audio(previewUrl)
    audio.volume = 0.3
    audio.play()

    audio.onended = () => {
      setPlayingPreview(null)
      setAudioElement(null)
    }

    audio.onerror = () => {
      setPlayingPreview(null)
      setAudioElement(null)
    }

    setAudioElement(audio)
    setPlayingPreview(itemId)
  }

  const toggleLike = (itemId: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="card-glass shadow-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <TypeIcon className="w-6 h-6" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TypeIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
              </motion.div>
              <p className="text-white/60">No recommendations available</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="h-full"
    >
      <Card className="card-glass shadow-xl h-full flex flex-col">
        <CardHeader className="pb-3 sm:pb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <CardTitle className="text-white flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <motion.div
                whileHover={{ rotate: 12, scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <TypeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </motion.div>
              {title}
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              </motion.div>
            </CardTitle>
          </motion.div>
        </CardHeader>
        
        <CardContent className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto max-h-[500px] sm:max-h-[600px]">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onHoverStart={() => setHoveredItem(item.id)}
                onHoverEnd={() => setHoveredItem(null)}
                className={`relative p-3 sm:p-4 rounded-xl border border-white/10 bg-gradient-to-r ${cardGradient} backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/20`}
              >
                <div className="flex gap-3 sm:gap-4">
                  {/* Image with hover effects */}
                  <motion.div 
                    className="relative flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shadow-lg">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/placeholder.svg?height=80&width=80&text=${type}`
                        }}
                      />
                      
                      {/* Overlay effects */}
                      <AnimatePresence>
                        {hoveredItem === item.id && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center"
                          >
                            {type === "song" && item.preview_url && (
                              <motion.button
                                onClick={() => handlePreviewPlay(item.preview_url!, item.id)}
                                className="text-white"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                {playingPreview === item.id ? (
                                  <Pause className="w-8 h-8" />
                                ) : (
                                  <Play className="w-8 h-8" />
                                )}
                              </motion.button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Playing indicator */}
                    {playingPreview === item.id && (
                      <motion.div
                        className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Volume2 className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <motion.h4 
                      className="font-semibold text-white text-sm line-clamp-2 mb-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      {item.title}
                    </motion.h4>
                    
                    <motion.p 
                      className="text-white/70 text-xs line-clamp-2 mb-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      {item.description}
                    </motion.p>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mb-3">
                      {item.rating && (
                        <motion.div 
                          className="flex items-center gap-1"
                          whileHover={{ scale: 1.1 }}
                        >
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-yellow-300 font-medium">
                            {item.rating.toFixed(1)}
                          </span>
                        </motion.div>
                      )}
                      
                      {type === "song" && item.preview_url && (
                        <div className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-300">Preview Available</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40"
                        onClick={() => window.open(item.link, "_blank")}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        {type === "song" ? "Spotify" : "View"}
                      </Button>

                      {type === "song" && item.preview_url && (
                        <Button
                          size="sm"
                          variant={playingPreview === item.id ? "default" : "outline"}
                          className="h-8 text-xs bg-green-500/20 border-green-400/30 text-green-300 hover:bg-green-500/30"
                          onClick={() => handlePreviewPlay(item.preview_url!, item.id)}
                        >
                          {playingPreview === item.id ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Play
                            </>
                          )}
                        </Button>
                      )}

                      {/* Like button */}
                      <motion.button
                        onClick={() => toggleLike(item.id)}
                        className={`p-1.5 rounded-full transition-colors ${
                          likedItems.has(item.id) 
                            ? "bg-pink-500/20 text-pink-300" 
                            : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80"
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart 
                          className={`w-3.5 h-3.5 ${likedItems.has(item.id) ? "fill-current" : ""}`} 
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Floating interaction indicators */}
                <AnimatePresence>
                  {hoveredItem === item.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute top-2 right-2 flex gap-1"
                    >
                      <motion.div 
                        className="w-2 h-2 bg-white/40 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div 
                        className="w-2 h-2 bg-white/40 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div 
                        className="w-2 h-2 bg-white/40 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}
