import { type NextRequest, NextResponse } from "next/server"
interface EmotionData {
  emotion: string
  confidence: number
  timestamp: number
}

interface EmotionAnalytics {
  totalDetections: number
  averageConfidence: number
  emotionDistribution: { [key: string]: number }
  moodTrend: string
  recommendations: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { history } = await request.json()

    if (!history || !Array.isArray(history)) {
      return NextResponse.json({ error: "Invalid history data" }, { status: 400 })
    }

    const analytics = analyzeEmotionHistory(history)
    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Error analyzing emotions:", error)
    return NextResponse.json({ error: "Failed to analyze emotions" }, { status: 500 })
  }
}

function analyzeEmotionHistory(history: EmotionData[]): EmotionAnalytics {
  if (history.length === 0) {
    return {
      totalDetections: 0,
      averageConfidence: 0,
      emotionDistribution: {},
      moodTrend: "neutral",
      recommendations: [],
    }
  }

  // Calculate emotion distribution
  const emotionCounts: { [key: string]: number } = {}
  let totalConfidence = 0

  history.forEach((detection) => {
    emotionCounts[detection.emotion] = (emotionCounts[detection.emotion] || 0) + 1
    totalConfidence += detection.confidence
  })

  // Convert counts to percentages
  const emotionDistribution: { [key: string]: number } = {}
  Object.keys(emotionCounts).forEach((emotion) => {
    emotionDistribution[emotion] = (emotionCounts[emotion] / history.length) * 100
  })

  // Determine mood trend
  const recentEmotions = history.slice(-3).map((d) => d.emotion)
  const moodTrend = determineMoodTrend(recentEmotions)

  // Generate recommendations
  const recommendations = generateRecommendations(emotionDistribution, moodTrend)

  return {
    totalDetections: history.length,
    averageConfidence: totalConfidence / history.length,
    emotionDistribution,
    moodTrend,
    recommendations,
  }
}

function determineMoodTrend(recentEmotions: string[]): string {
  const positiveEmotions = ["happy", "surprised"]
  const negativeEmotions = ["sad", "angry", "fear", "disgust"]

  const positiveCount = recentEmotions.filter((e) => positiveEmotions.includes(e)).length
  const negativeCount = recentEmotions.filter((e) => negativeEmotions.includes(e)).length

  if (positiveCount > negativeCount) return "improving"
  if (negativeCount > positiveCount) return "declining"
  return "stable"
}

function generateRecommendations(distribution: { [key: string]: number }, trend: string): string[] {
  const recommendations: string[] = []

  // Dominant emotion recommendations
  const dominantEmotion = Object.keys(distribution).reduce((a, b) => (distribution[a] > distribution[b] ? a : b))

  const emotionRecommendations = {
    happy: "Keep up the positive energy! Consider sharing your joy with others.",
    sad: "It's okay to feel down sometimes. Consider talking to someone or engaging in self-care.",
    angry: "Try some breathing exercises or physical activity to manage frustration.",
    surprised: "Embrace the unexpected! New experiences can lead to growth.",
    neutral: "A balanced emotional state is healthy. Consider exploring new activities.",
    disgust: "Focus on positive experiences and environments that make you feel good.",
    fear: "Acknowledge your fears and consider gradual exposure to build confidence.",
  }

  if (emotionRecommendations[dominantEmotion as keyof typeof emotionRecommendations]) {
    recommendations.push(emotionRecommendations[dominantEmotion as keyof typeof emotionRecommendations])
  }

  // Trend-based recommendations
  const trendRecommendations = {
    improving: "Your mood seems to be getting better! Keep doing what's working.",
    declining: "Consider reaching out for support or trying mood-boosting activities.",
    stable: "Your emotions are well-balanced. Maintain your current routine.",
  }

  recommendations.push(trendRecommendations[trend as keyof typeof trendRecommendations])

  return recommendations
}
