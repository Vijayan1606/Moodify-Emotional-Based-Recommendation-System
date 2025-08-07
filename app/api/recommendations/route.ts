import { type NextRequest, NextResponse } from "next/server"
import { spotifyClient } from "@/lib/spotify-client"
import { contentRecommender } from "@/lib/content-recommender"

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

// Enhanced emotion-based queries and genres for Spotify
const emotionConfig = {
  happy: {
    movies: ["comedy", "feel good", "uplifting", "musical", "adventure"],
    songs: {
      queries: ["happy", "upbeat", "celebration", "dance", "feel good", "party", "joy", "sunshine", "positive"],
      genres: ["pop", "dance", "funk", "disco", "happy", "party"],
      audioFeatures: {
        valence: 0.8, // High positivity
        energy: 0.7, // High energy
        danceability: 0.7,
      },
    },
    books: ["humor", "romance", "adventure", "self help", "inspiration"],
  },
  sad: {
    movies: ["drama", "inspiring", "hope", "healing", "uplifting"],
    songs: {
      queries: ["sad", "melancholy", "emotional", "heartbreak", "comfort", "healing", "slow", "ballad"],
      genres: ["acoustic", "indie", "folk", "blues", "soul", "sad"],
      audioFeatures: {
        valence: 0.3, // Low positivity
        energy: 0.4, // Lower energy
        acousticness: 0.6,
      },
    },
    books: ["healing", "memoir", "philosophy", "comfort", "hope"],
  },
  angry: {
    movies: ["action", "martial arts", "sports", "comedy", "peaceful"],
    songs: {
      queries: ["rock", "metal", "aggressive", "intense", "powerful", "energy", "strong"],
      genres: ["rock", "metal", "punk", "alternative", "hard-rock"],
      audioFeatures: {
        valence: 0.4,
        energy: 0.8, // High energy for release
        loudness: -5,
      },
    },
    books: ["mindfulness", "anger management", "philosophy", "meditation", "psychology"],
  },
  surprised: {
    movies: ["thriller", "mystery", "sci-fi", "plot twist", "suspense"],
    songs: {
      queries: ["experimental", "electronic", "unique", "unexpected", "innovative", "weird", "unusual"],
      genres: ["electronic", "experimental", "progressive", "indie", "alternative"],
      audioFeatures: {
        valence: 0.6,
        energy: 0.6,
        instrumentalness: 0.3,
      },
    },
    books: ["mystery", "thriller", "science fiction", "plot twist", "suspense"],
  },
  neutral: {
    movies: ["popular", "top rated", "classic", "award winning", "drama"],
    songs: {
      queries: ["popular", "top hits", "classic", "mainstream", "trending", "chill", "relaxed"],
      genres: ["pop", "rock", "indie", "alternative", "folk"],
      audioFeatures: {
        valence: 0.5,
        energy: 0.5,
        popularity: 70,
      },
    },
    books: ["bestseller", "classic", "award winning", "popular", "fiction"],
  },
  disgust: {
    movies: ["wholesome", "family", "animation", "nature", "clean"],
    songs: {
      queries: ["peaceful", "nature", "instrumental", "clean", "wholesome", "pure", "calm"],
      genres: ["classical", "ambient", "new-age", "instrumental", "world"],
      audioFeatures: {
        valence: 0.7,
        energy: 0.3,
        acousticness: 0.8,
      },
    },
    books: ["wholesome", "nature", "poetry", "philosophy", "clean fiction"],
  },
  fear: {
    movies: ["inspiring", "courage", "adventure", "feel good", "motivational"],
    songs: {
      queries: ["motivational", "empowering", "courage", "strength", "uplifting", "brave", "confident"],
      genres: ["pop", "rock", "inspirational", "gospel", "motivational"],
      audioFeatures: {
        valence: 0.7,
        energy: 0.6,
        speechiness: 0.1,
      },
    },
    books: ["courage", "self help", "motivational", "overcoming fear", "empowerment"],
  },
}

async function fetchMovies(emotion: Emotion): Promise<Recommendation[]> {
  try {
    const queries = emotionConfig[emotion].movies
    const randomQuery = queries[Math.floor(Math.random() * queries.length)]

    // Check for both environment variables
    const apiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY

    if (!apiKey || apiKey === "demo" || apiKey === "your_omdb_api_key" || apiKey === "your_actual_omdb_api_key_here") {
      return getFallbackMovies(emotion)
    }

    const response = await fetch(
      `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(randomQuery)}&type=movie&page=1`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10000),
      },
    )

    if (!response.ok) {
      if (response.status === 401) {
        console.error(`❌ OMDB API key invalid (401): ${apiKey.substring(0, 8)}...`)
        return getFallbackMovies(emotion)
      }
      throw new Error(`OMDB API responded with status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.Search || data.Search.length === 0) {
      return getFallbackMovies(emotion)
    }

    // Get detailed information for the first few movies
    const moviePromises = data.Search.slice(0, 3).map(async (movie: any) => {
      try {
        const detailResponse = await fetch(
          `https://www.omdbapi.com/?apikey=${apiKey}&i=${movie.imdbID}&plot=short`,
          {
            signal: AbortSignal.timeout(8000),
          }
        )

        if (detailResponse.ok) {
          const detail = await detailResponse.json()
          if (detail.Response === 'True') {
            return {
              id: detail.imdbID,
              title: detail.Title,
              description: detail.Plot !== 'N/A' ? detail.Plot?.substring(0, 100) + "..." : "No description available",
              image: detail.Poster !== 'N/A' ? detail.Poster : "/placeholder.svg?height=200&width=150&text=Movie",
              link: `https://www.imdb.com/title/${detail.imdbID}`,
              rating: detail.imdbRating !== 'N/A' ? parseFloat(detail.imdbRating) : 0,
            }
          }
        }
      } catch (error) {
        console.error("Error fetching movie details:", error)
      }

      // Fallback to basic info if detailed fetch fails
      return {
        id: movie.imdbID,
        title: movie.Title,
        description: "No description available",
        image: movie.Poster !== 'N/A' ? movie.Poster : "/placeholder.svg?height=200&width=150&text=Movie",
        link: `https://www.imdb.com/title/${movie.imdbID}`,
        rating: 0,
      }
    })

    const movies = await Promise.all(moviePromises)
    return movies.filter(movie => movie !== null)
  } catch (error) {
    console.error("❌ Error fetching movies:", error)
    return getFallbackMovies(emotion)
  }
}

async function fetchSpotifySongs(emotion: Emotion): Promise<Recommendation[]> {
  try {
    const config = emotionConfig[emotion].songs
    const songs: Recommendation[] = []



    // Check if Spotify is available
    if (!spotifyClient.isSpotifyAvailable()) {

      return getFallbackSongs(emotion)
    }

    // Try Spotify recommendations first (best quality)
    try {
      const spotifyTracks = await spotifyClient.getRecommendations(config.genres, 5)
      if (spotifyTracks.length > 0) {
        const spotifyRecommendations = spotifyTracks
          .slice(0, 3)
          .map((track) => spotifyClient.formatTrackForRecommendation(track))
        songs.push(...spotifyRecommendations)

      }
    } catch (error) {

    }

    // If we don't have enough songs, try Spotify search
    if (songs.length < 3) {
      try {
        const randomQuery = config.queries[Math.floor(Math.random() * config.queries.length)]
        const searchTracks = await spotifyClient.searchTracks(randomQuery, 5)

        if (searchTracks.length > 0) {
          const searchRecommendations = searchTracks
            .slice(0, 3 - songs.length)
            .map((track) => spotifyClient.formatTrackForRecommendation(track))
          songs.push(...searchRecommendations)

        }
      } catch (error) {

      }
    }

    // If we still don't have enough, use fallback
    if (songs.length === 0) {

      return getFallbackSongs(emotion)
    }

    return songs
  } catch (error) {
    console.error("❌ Error fetching Spotify songs:", error)
    return getFallbackSongs(emotion)
  }
}

async function fetchBooks(emotion: Emotion): Promise<Recommendation[]> {
  try {
    const queries = emotionConfig[emotion].books
    const randomQuery = queries[Math.floor(Math.random() * queries.length)]



    // Since Goodreads doesn't have a public API, we'll use enhanced fallback books
    // that are curated like Goodreads recommendations with better descriptions and ratings
    return getGoodreadsStyleBooks(emotion)
  } catch (error) {
    console.error("❌ Error fetching books:", error)
    return getFallbackBooks(emotion)
  }
}

// Enhanced fallback functions with better content
function getFallbackMovies(emotion: Emotion): Recommendation[] {
  const fallbacks = {
    happy: [
      {
        id: "1",
        title: "The Grand Budapest Hotel",
        description:
          "A whimsical comedy-drama that will keep your spirits high with its colorful visuals and witty dialogue.",
        image: "https://image.tmdb.org/t/p/w300/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
        link: "https://www.themoviedb.org/movie/120467",
        rating: 8.1,
      },
      {
        id: "2",
        title: "Paddington 2",
        description: "Heartwarming family film that spreads joy and positivity with every scene.",
        image: "https://image.tmdb.org/t/p/w300/2Hd6rNaSBT5Hf3wqQz47p9PipGh.jpg",
        link: "https://www.themoviedb.org/movie/346648",
        rating: 8.2,
      },
      {
        id: "3",
        title: "The Princess Bride",
        description: "A timeless adventure filled with romance, humor, and unforgettable characters.",
        image: "https://image.tmdb.org/t/p/w300/gpxjoP0yvRiCNHLbJukbEZnJmJv.jpg",
        link: "https://www.themoviedb.org/movie/2493",
        rating: 8.0,
      },
    ],
    sad: [
      {
        id: "1",
        title: "Inside Out",
        description: "Pixar masterpiece that helps understand and process complex emotions with empathy and wisdom.",
        image: "https://image.tmdb.org/t/p/w300/aAmfIX3TT40zUHGcCKrlOZRKC7u.jpg",
        link: "https://www.themoviedb.org/movie/150540",
        rating: 8.1,
      },
      {
        id: "2",
        title: "A Monster Calls",
        description: "Beautiful story about dealing with grief and finding strength in difficult times.",
        image: "https://image.tmdb.org/t/p/w300/2DJvLTApaNMnAdZRFH4DWlhf3S5.jpg",
        link: "https://www.themoviedb.org/movie/258230",
        rating: 7.5,
      },
      {
        id: "3",
        title: "Good Will Hunting",
        description: "Inspiring drama about healing, friendship, and discovering your potential.",
        image: "https://image.tmdb.org/t/p/w300/bABCBKYBK7A5G1x0FzoeoNfuj2.jpg",
        link: "https://www.themoviedb.org/movie/2268",
        rating: 8.3,
      },
    ],
    neutral: [
      {
        id: "1",
        title: "The Shawshank Redemption",
        description: "Timeless drama about hope, friendship, and the resilience of the human spirit.",
        image: "https://image.tmdb.org/t/p/w300/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg",
        link: "https://www.themoviedb.org/movie/278",
        rating: 9.3,
      },
      {
        id: "2",
        title: "Forrest Gump",
        description: "Heartwarming story of an extraordinary life lived with simplicity and kindness.",
        image: "https://image.tmdb.org/t/p/w300/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
        link: "https://www.themoviedb.org/movie/13",
        rating: 8.8,
      },
      {
        id: "3",
        title: "The Pursuit of Happyness",
        description: "Inspiring true story about perseverance and the pursuit of the American Dream.",
        image: "https://image.tmdb.org/t/p/w300/acaFriusFRGJ7riCamTh2mrjJdq.jpg",
        link: "https://www.themoviedb.org/movie/1402",
        rating: 8.0,
      },
    ],
    angry: [
      {
        id: "1",
        title: "The Karate Kid",
        description:
          "Classic film about channeling anger into discipline and finding inner strength through martial arts.",
        image: "https://image.tmdb.org/t/p/w300/9mG4BMqk9gQMpJoNjF0cHTAdPDK.jpg",
        link: "https://www.themoviedb.org/movie/1885",
        rating: 7.2,
      },
      {
        id: "2",
        title: "Rocky",
        description: "Inspiring underdog story about determination, hard work, and never giving up.",
        image: "https://image.tmdb.org/t/p/w300/i5xiwqQIjX8RM20Tf4UB4gcXGNk.jpg",
        link: "https://www.themoviedb.org/movie/1366",
        rating: 8.1,
      },
      {
        id: "3",
        title: "Peaceful Warrior",
        description: "Philosophical drama about finding inner peace and transforming anger into wisdom.",
        image: "https://image.tmdb.org/t/p/w300/9eQ4wKW2LzOVuubQVFdJhgxXGo.jpg",
        link: "https://www.themoviedb.org/movie/13155",
        rating: 7.2,
      },
    ],
    surprised: [
      {
        id: "1",
        title: "Inception",
        description: "Mind-bending sci-fi masterpiece that will keep you guessing and surprised until the very end.",
        image: "https://image.tmdb.org/t/p/w300/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg",
        link: "https://www.themoviedb.org/movie/27205",
        rating: 8.8,
      },
      {
        id: "2",
        title: "The Sixth Sense",
        description: "Supernatural thriller with one of cinema's most shocking and memorable plot twists.",
        image: "https://image.tmdb.org/t/p/w300/fIssD3w3SvIhPPmVo4WMgZDVLID.jpg",
        link: "https://www.themoviedb.org/movie/745",
        rating: 8.1,
      },
      {
        id: "3",
        title: "Shutter Island",
        description: "Psychological thriller that will leave you questioning reality until the final revelation.",
        image: "https://image.tmdb.org/t/p/w300/4GDy0PHYX3VRXUtwK5ysFbg3kEx.jpg",
        link: "https://www.themoviedb.org/movie/11324",
        rating: 8.2,
      },
    ],
    disgust: [
      {
        id: "1",
        title: "WALL-E",
        description: "Beautiful Pixar film about environmental consciousness and finding beauty in unexpected places.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/10681",
        rating: 8.4,
      },
      {
        id: "2",
        title: "My Neighbor Totoro",
        description: "Wholesome Studio Ghibli film that celebrates nature, family, and childhood wonder.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/8392",
        rating: 8.2,
      },
      {
        id: "3",
        title: "The Secret Garden",
        description: "Uplifting story about healing, growth, and the transformative power of nature.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/3078",
        rating: 7.3,
      },
    ],
    fear: [
      {
        id: "1",
        title: "Finding Nemo",
        description: "Inspiring Pixar film about overcoming fears, anxiety, and finding courage in the face of danger.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/12",
        rating: 8.2,
      },
      {
        id: "2",
        title: "The Lion King",
        description: "Epic tale about facing your fears, accepting responsibility, and finding your courage.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/8587",
        rating: 8.5,
      },
      {
        id: "3",
        title: "Brave",
        description: "Pixar adventure about a young princess who must overcome her fears to save her kingdom.",
        image: "/placeholder.svg?height=200&width=150&text=🎬",
        link: "https://www.themoviedb.org/movie/62177",
        rating: 7.1,
      },
    ],
  }

  return fallbacks[emotion] || fallbacks.neutral
}

function getFallbackSongs(emotion: Emotion): Recommendation[] {
  const fallbacks = {
    happy: [
      {
        id: "1",
        title: "Happy - Pharrell Williams",
        description: "Upbeat anthem that spreads pure joy and infectious positivity • 3:53",
        image: "https://i.scdn.co/image/ab67616d0000b273e0c8c2de09d1d134c6783b18",
        link: "https://open.spotify.com/search/happy%20pharrell",
        rating: 4.8,
      },
      {
        id: "2",
        title: "Good as Hell - Lizzo",
        description: "Empowering pop hit that boosts confidence and self-love • 2:39",
        image: "https://i.scdn.co/image/ab67616d0000b273c9b6a4b8aba734b8b2f7afc6",
        link: "https://open.spotify.com/search/good%20as%20hell%20lizzo",
        rating: 4.7,
      },
      {
        id: "3",
        title: "Walking on Sunshine - Katrina and the Waves",
        description: "Classic feel-good song that never gets old and always lifts spirits • 3:58",
        image: "https://i.scdn.co/image/ab67616d0000b273ecb9b3c4f5e1ba15a38fb667",
        link: "https://open.spotify.com/search/walking%20on%20sunshine",
        rating: 4.6,
      },
    ],
    sad: [
      {
        id: "1",
        title: "Here Comes the Sun - The Beatles",
        description: "Gentle reminder that difficult times will pass and brighter days are ahead • 3:05",
        image: "https://i.scdn.co/image/ab67616d0000b273dc30583ba717007b00cceb25",
        link: "https://open.spotify.com/search/here%20comes%20the%20sun%20beatles",
        rating: 4.9,
      },
      {
        id: "2",
        title: "Three Little Birds - Bob Marley",
        description: "Soothing reggae song about not worrying and trusting that everything will be alright • 3:00",
        image: "https://i.scdn.co/image/ab67616d0000b273e4e3c3b3b85c6b2b4b2bc2b1",
        link: "https://open.spotify.com/search/three%20little%20birds%20marley",
        rating: 4.8,
      },
      {
        id: "3",
        title: "Lean on Me - Bill Withers",
        description: "Comforting song about friendship, support, and being there for each other • 4:17",
        image: "https://i.scdn.co/image/ab67616d0000b2734bb80f29cf4b72ef7c4c6b7e",
        link: "https://open.spotify.com/search/lean%20on%20me%20withers",
        rating: 4.7,
      },
    ],
    neutral: [
      {
        id: "1",
        title: "Hotel California - Eagles",
        description: "Iconic rock song with mysterious lyrics and timeless appeal • 6:30",
        image: "https://i.scdn.co/image/ab67616d0000b2734637341b9f507521afa9a778",
        link: "https://open.spotify.com/search/hotel%20california%20eagles",
        rating: 4.8,
      },
      {
        id: "2",
        title: "Bohemian Rhapsody - Queen",
        description: "Epic masterpiece with unexpected musical journey and dramatic changes • 5:55",
        image: "https://i.scdn.co/image/ab67616d0000b273e319baafd16e84f0408c5153",
        link: "https://open.spotify.com/search/bohemian%20rhapsody%20queen",
        rating: 4.9,
      },
      {
        id: "3",
        title: "Imagine - John Lennon",
        description: "Timeless anthem of peace and hope that resonates across generations • 3:07",
        image: "https://i.scdn.co/image/ab67616d0000b2738b662db62ee3d5b85d394ebb",
        link: "https://open.spotify.com/search/imagine%20john%20lennon",
        rating: 4.8,
      },
    ],
    angry: [
      {
        id: "1",
        title: "Eye of the Tiger - Survivor",
        description: "Powerful rock anthem for channeling anger into determination and strength • 4:04",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/eye%20of%20the%20tiger%20survivor",
        rating: 4.6,
      },
      {
        id: "2",
        title: "Breathe Me - Sia",
        description: "Emotional song for processing anger and finding inner peace • 4:31",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/breathe%20me%20sia",
        rating: 4.5,
      },
      {
        id: "3",
        title: "Stronger - Kelly Clarkson",
        description: "Empowering anthem about resilience and turning pain into strength • 3:42",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/stronger%20kelly%20clarkson",
        rating: 4.4,
      },
    ],
    surprised: [
      {
        id: "1",
        title: "Bohemian Rhapsody - Queen",
        description: "Epic song with unexpected musical journey and dramatic changes • 5:55",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/bohemian%20rhapsody%20queen",
        rating: 4.9,
      },
      {
        id: "2",
        title: "Thunderstruck - AC/DC",
        description: "High-energy rock anthem with electrifying surprises and powerful vocals • 4:52",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/thunderstruck%20acdc",
        rating: 4.7,
      },
      {
        id: "3",
        title: "Mr. Blue Sky - Electric Light Orchestra",
        description: "Uplifting orchestral pop with unexpected arrangements and joyful surprises • 5:03",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/mr%20blue%20sky%20elo",
        rating: 4.6,
      },
    ],
    disgust: [
      {
        id: "1",
        title: "What a Wonderful World - Louis Armstrong",
        description: "Beautiful song that restores faith in goodness and beauty • 2:21",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/wonderful%20world%20armstrong",
        rating: 4.8,
      },
      {
        id: "2",
        title: "Over the Rainbow - Judy Garland",
        description: "Timeless classic about hope, dreams, and finding beauty beyond troubles • 2:42",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/over%20the%20rainbow%20judy%20garland",
        rating: 4.7,
      },
      {
        id: "3",
        title: "Pure Imagination - Gene Wilder",
        description: "Whimsical song that celebrates creativity and the power of positive thinking • 3:15",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/pure%20imagination%20gene%20wilder",
        rating: 4.5,
      },
    ],
    fear: [
      {
        id: "1",
        title: "Brave - Sara Bareilles",
        description: "Empowering anthem about finding courage and speaking your truth • 4:20",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/brave%20sara%20bareilles",
        rating: 4.6,
      },
      {
        id: "2",
        title: "Fight Song - Rachel Platten",
        description: "Inspiring anthem about inner strength and overcoming fear with determination • 3:23",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/fight%20song%20rachel%20platten",
        rating: 4.4,
      },
      {
        id: "3",
        title: "Roar - Katy Perry",
        description: "Uplifting pop anthem about finding your voice and conquering your fears • 3:43",
        image: "/placeholder.svg?height=200&width=200&text=🎵",
        link: "https://open.spotify.com/search/roar%20katy%20perry",
        rating: 4.3,
      },
    ],
  }

  return fallbacks[emotion] || fallbacks.neutral
}

function getGoodreadsStyleBooks(emotion: Emotion): Recommendation[] {
  const goodreadsBooks = {
    happy: [
      {
        id: "1",
        title: "The Seven Husbands of Evelyn Hugo",
        description: "A reclusive Hollywood icon finally tells her story - filled with ambition, love, and secrets that will captivate you until the very last page.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1618329605i/32620332.jpg",
        link: "https://www.goodreads.com/book/show/32620332-the-seven-husbands-of-evelyn-hugo",
        rating: 4.4,
      },
      {
        id: "2",
        title: "Beach Read",
        description: "Two rival writers who end up stuck next to each other in beach houses challenge each other to write outside their comfort zones.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1577910950i/52867387.jpg",
        link: "https://www.goodreads.com/book/show/52867387-beach-read",
        rating: 4.1,
      },
      {
        id: "3",
        title: "The House in the Cerulean Sea",
        description: "A magical and uplifting story about found family, second chances, and the power of choosing love over fear.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1575927555i/45047384.jpg",
        link: "https://www.goodreads.com/book/show/45047384-the-house-in-the-cerulean-sea",
        rating: 4.3,
      },
    ],
    sad: [
      {
        id: "1",
        title: "A Man Called Ove",
        description: "A heartbreaking and hilarious story about grief, love, and the importance of human connection that will restore your faith in humanity.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1405259930i/18774964.jpg",
        link: "https://www.goodreads.com/book/show/18774964-a-man-called-ove",
        rating: 4.4,
      },
      {
        id: "2",
        title: "The Book Thief",
        description: "A devastating, beautiful story about the power of words and books to sustain us through the darkest times.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1522157426i/19063.jpg",
        link: "https://www.goodreads.com/book/show/19063.The_Book_Thief",
        rating: 4.4,
      },
      {
        id: "3",
        title: "Me Before You",
        description: "A heart-wrenching love story that will make you laugh, cry, and think about what it means to truly live.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1396366690i/15507958.jpg",
        link: "https://www.goodreads.com/book/show/15507958-me-before-you",
        rating: 4.3,
      },
    ],
    neutral: [
      {
        id: "1",
        title: "Educated",
        description: "A powerful memoir about education, family, and the fierce power of knowledge to transform a life.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
        link: "https://www.goodreads.com/book/show/35133922-educated",
        rating: 4.4,
      },
      {
        id: "2",
        title: "Atomic Habits",
        description: "A practical guide to building good habits and breaking bad ones, with actionable strategies for lasting change.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1535115320i/40121378.jpg",
        link: "https://www.goodreads.com/book/show/40121378-atomic-habits",
        rating: 4.4,
      },
      {
        id: "3",
        title: "Where the Crawdads Sing",
        description: "A mystery and coming-of-age story set in the atmospheric North Carolina marshlands.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582135294i/36809135.jpg",
        link: "https://www.goodreads.com/book/show/36809135-where-the-crawdads-sing",
        rating: 4.4,
      },
    ],
    angry: [
      {
        id: "1",
        title: "The Power",
        description: "A provocative exploration of power, gender, and society that will challenge your perspective on the world.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1465761687i/29751398.jpg",
        link: "https://www.goodreads.com/book/show/29751398-the-power",
        rating: 3.9,
      },
      {
        id: "2",
        title: "The Rage of Dragons",
        description: "Epic fantasy filled with intense action, political intrigue, and a protagonist driven by the need for revenge.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1548356842i/41952489.jpg",
        link: "https://www.goodreads.com/book/show/41952489-the-rage-of-dragons",
        rating: 4.3,
      },
      {
        id: "3",
        title: "The Power of Now",
        description: "A spiritual guide to finding peace and presence, perfect for channeling intense emotions into mindfulness.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1386925471i/6708.jpg",
        link: "https://www.goodreads.com/book/show/6708.The_Power_of_Now",
        rating: 4.1,
      },
    ],
    surprised: [
      {
        id: "1",
        title: "The Silent Patient",
        description: "A shocking psychological thriller with a twist ending that will leave you speechless and questioning everything.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1547731548i/40097951.jpg",
        link: "https://www.goodreads.com/book/show/40097951-the-silent-patient",
        rating: 4.1,
      },
      {
        id: "2",
        title: "Gone Girl",
        description: "A twisted psychological thriller that will keep you guessing until the very last page with shocking revelations.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1554086139i/19288043.jpg",
        link: "https://www.goodreads.com/book/show/19288043-gone-girl",
        rating: 4.0,
      },
      {
        id: "3",
        title: "The Midnight Library",
        description: "A thought-provoking exploration of life's infinite possibilities that will surprise you with its depth and wisdom.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1602190253i/52578297.jpg",
        link: "https://www.goodreads.com/book/show/52578297-the-midnight-library",
        rating: 4.1,
      },
    ],
    disgust: [
      {
        id: "1",
        title: "The Alchemist",
        description: "A beautiful, inspiring tale about following your dreams and listening to your heart that will restore your faith in goodness.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1654371463i/18144590.jpg",
        link: "https://www.goodreads.com/book/show/18144590-the-alchemist",
        rating: 3.9,
      },
      {
        id: "2",
        title: "A Good Girl's Guide to Murder",
        description: "A gripping mystery that will cleanse your palate with its engaging plot and likeable characters.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1556134336i/43306540.jpg",
        link: "https://www.goodreads.com/book/show/43306540-a-good-girl-s-guide-to-murder",
        rating: 4.4,
      },
      {
        id: "3",
        title: "The Thursday Murder Club",
        description: "A delightful cozy mystery with charming characters that will restore your faith in humanity and justice.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1585242967i/46000520.jpg",
        link: "https://www.goodreads.com/book/show/46000520-the-thursday-murder-club",
        rating: 4.2,
      },
    ],
    fear: [
      {
        id: "1",
        title: "Anxious People",
        description: "A heartwarming story about human connection and understanding that will help you feel less alone in your fears.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1597937463i/49127718.jpg",
        link: "https://www.goodreads.com/book/show/49127718-anxious-people",
        rating: 4.2,
      },
      {
        id: "2",
        title: "The Cozy Life",
        description: "A gentle guide to finding comfort and contentment in life's simple pleasures, perfect for anxious moments.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1569258914i/46819737.jpg",
        link: "https://www.goodreads.com/book/show/46819737-the-cozy-life",
        rating: 4.0,
      },
      {
        id: "3",
        title: "Maybe You Should Talk to Someone",
        description: "A therapist's own journey through therapy - honest, funny, and deeply reassuring about facing our fears.",
        image: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1549042097i/37570546.jpg",
        link: "https://www.goodreads.com/book/show/37570546-maybe-you-should-talk-to-someone",
        rating: 4.4,
      },
    ],
  }

  return goodreadsBooks[emotion] || goodreadsBooks.neutral
}

function getFallbackBooks(emotion: Emotion): Recommendation[] {
  const fallbacks = {
    happy: [
      {
        id: "1",
        title: "The Alchemist",
        description: "Inspiring tale about following your dreams and listening to your heart",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/865.The_Alchemist",
        rating: 4.2,
      },
      {
        id: "2",
        title: "The Happiness Project",
        description: "Practical guide to finding joy and contentment in everyday life",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/6398634",
        rating: 3.9,
      },
      {
        id: "3",
        title: "Yes Please",
        description: "Amy Poehler's hilarious and heartfelt memoir about life, love, and laughter",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/20910157",
        rating: 4.1,
      },
    ],
    sad: [
      {
        id: "1",
        title: "The Book Thief",
        description: "Beautiful story about finding hope in dark times through the power of words",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/19063.The_Book_Thief",
        rating: 4.4,
      },
      {
        id: "2",
        title: "A Man Called Ove",
        description: "Heartwarming story about grief, love, and the importance of human connection",
        image: "/placeholder.svg?height=250&width=180&text=���",
        link: "https://www.goodreads.com/book/show/18774964",
        rating: 4.4,
      },
      {
        id: "3",
        title: "The Light We Lost",
        description: "Moving story about love, loss, and the choices that shape our lives",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/29430584",
        rating: 4.0,
      },
    ],
    neutral: [
      {
        id: "1",
        title: "To Kill a Mockingbird",
        description: "Classic novel about justice, morality, and growing up in the American South",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/2657.To_Kill_a_Mockingbird",
        rating: 4.3,
      },
      {
        id: "2",
        title: "The Great Gatsby",
        description: "Timeless American classic about dreams, wealth, and the pursuit of happiness",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/4671.The_Great_Gatsby",
        rating: 3.9,
      },
      {
        id: "3",
        title: "1984",
        description: "Dystopian masterpiece about freedom, truth, and the power of independent thought",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/5470.1984",
        rating: 4.2,
      },
    ],
    angry: [
      {
        id: "1",
        title: "The Power of Now",
        description: "Guide to mindfulness and emotional control for managing anger and frustration",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/6708.The_Power_of_Now",
        rating: 4.1,
      },
      {
        id: "2",
        title: "Anger: Wisdom for Cooling the Flames",
        description: "Buddhist approach to understanding and transforming anger into compassion",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/95747.Anger",
        rating: 4.3,
      },
      {
        id: "3",
        title: "The Gifts of Imperfection",
        description: "Brené Brown's guide to letting go of perfectionism and embracing authenticity",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/7015403",
        rating: 4.2,
      },
    ],
    surprised: [
      {
        id: "1",
        title: "Gone Girl",
        description: "Psychological thriller with shocking plot twists that will keep you surprised",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/19288043",
        rating: 4.0,
      },
      {
        id: "2",
        title: "The Girl with the Dragon Tattoo",
        description: "Gripping mystery with unexpected revelations and complex characters",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/2429135",
        rating: 4.1,
      },
      {
        id: "3",
        title: "Big Little Lies",
        description: "Domestic drama with surprising twists about secrets, lies, and friendship",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/19486412",
        rating: 4.3,
      },
    ],
    disgust: [
      {
        id: "1",
        title: "The Little Prince",
        description: "Innocent tale that restores wonder and purity to the world",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/157993.The_Little_Prince",
        rating: 4.3,
      },
      {
        id: "2",
        title: "Charlotte's Web",
        description: "Timeless story of friendship, loyalty, and the beauty of simple kindness",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/24178.Charlotte_s_Web",
        rating: 4.2,
      },
      {
        id: "3",
        title: "The Secret Garden",
        description: "Classic tale about healing, growth, and the transformative power of nature",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/2998.The_Secret_Garden",
        rating: 4.1,
      },
    ],
    fear: [
      {
        id: "1",
        title: "Feel the Fear and Do It Anyway",
        description: "Self-help guide to overcoming anxiety and fear with practical strategies",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/9457.Feel_the_Fear_and_Do_It_Anyway",
        rating: 4.0,
      },
      {
        id: "2",
        title: "The Confidence Code",
        description: "Research-based guide to building confidence and overcoming self-doubt",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/18693653",
        rating: 3.9,
      },
      {
        id: "3",
        title: "Daring Greatly",
        description: "Brené Brown's powerful book about vulnerability, courage, and overcoming fear",
        image: "/placeholder.svg?height=250&width=180&text=📚",
        link: "https://www.goodreads.com/book/show/13588356",
        rating: 4.3,
      },
    ],
  }

  return fallbacks[emotion] || fallbacks.neutral
}

export async function POST(request: NextRequest) {
  try {
    const { emotion } = await request.json()

    if (!emotion || !emotionConfig[emotion as Emotion]) {
      return NextResponse.json({ error: "Invalid emotion provided" }, { status: 400 })
    }

    console.log(`🎭 Getting recommendations for emotion: ${emotion}`)
    // Log OMDB API key for debugging
    const omdbApiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY;
    console.log('OMDB API Key used:', omdbApiKey ? omdbApiKey.substring(0, 8) + '...' : 'Not set');
    try {
      // Use enhanced content recommender with comprehensive API integration
      const recommendations = await contentRecommender.getRecommendations(emotion)

      // Transform the data to match existing frontend expectations
      const transformedMovies = recommendations.movies.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        description: movie.overview?.substring(0, 100) + "..." || "No description available",
        image: movie.poster_url || "/placeholder.svg?height=200&width=150&text=Movie",
        link: movie.imdb_url || `https://www.imdb.com/title/${movie.id}`,
        rating: movie.rating
      }))

      const transformedSongs = recommendations.music.map((song: any) => ({
        id: Math.random().toString(36).substr(2, 9), // Generate random ID
        title: `${song.name} - ${song.artist}`,
        description: `${song.album} • ${song.duration}`,
        image: song.image_url || "/placeholder.svg?height=200&width=200&text=Song",
        link: song.external_url || `https://open.spotify.com/search/${encodeURIComponent(song.name + ' ' + song.artist)}`,
        rating: Math.random() * 5, // Random rating since Spotify doesn't provide this
        preview_url: song.preview_url
      }))

      const transformedBooks = recommendations.books.map((book: any) => ({
        id: Math.random().toString(36).substr(2, 9), // Generate random ID
        title: book.title,
        description: book.description?.substring(0, 100) + "..." || "No description available",
        image: book.thumbnail || "/placeholder.svg?height=250&width=180&text=Book",
        link: `https://www.google.com/search?q=${encodeURIComponent(book.title + ' book')}`,
        rating: book.rating || Math.random() * 5
      }))

      // Always use OMDB movies if present, fallback only if empty
      const moviesToReturn = transformedMovies.length > 0 ? transformedMovies : getFallbackMovies(emotion as Emotion);
      const songsToReturn = transformedSongs.length > 0 ? transformedSongs : getFallbackSongs(emotion as Emotion);
      const booksToReturn = transformedBooks.length > 0 ? transformedBooks : getGoodreadsStyleBooks(emotion as Emotion);

      if (moviesToReturn.length > 0 || songsToReturn.length > 0 || booksToReturn.length > 0) {
        console.log(`✅ Enhanced recommendations successful: ${moviesToReturn.length} movies, ${songsToReturn.length} songs, ${booksToReturn.length} books`)
        return NextResponse.json({
          movies: moviesToReturn,
          songs: songsToReturn,
          books: booksToReturn,
          spotify_available: spotifyClient.isSpotifyAvailable(),
          omdb_configured: !!omdbApiKey,
          enhanced_backend: true
        })
      }
    } catch (enhancedError) {
      console.error("❌ Enhanced recommender failed, falling back to original logic:", enhancedError)
    }

    // Fallback to original logic if enhanced recommender fails
    const [movies, songs, books] = await Promise.allSettled([
      fetchMovies(emotion as Emotion),
      fetchSpotifySongs(emotion as Emotion),
      fetchBooks(emotion as Emotion),
    ])

    // Extract results, using fallbacks if any promise was rejected
    const moviesResult = movies.status === "fulfilled" ? movies.value : getFallbackMovies(emotion as Emotion)
    const songsResult = songs.status === "fulfilled" ? songs.value : getFallbackSongs(emotion as Emotion)
    const booksResult = books.status === "fulfilled" ? books.value : getFallbackBooks(emotion as Emotion)

    console.log(`✅ Fallback recommendations: ${moviesResult.length} movies, ${songsResult.length} songs, ${booksResult.length} books`)

    return NextResponse.json({
      movies: moviesResult,
      songs: songsResult,
      books: booksResult,
      spotify_available: spotifyClient.isSpotifyAvailable(),
      omdb_configured: !!(process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY),
      enhanced_backend: false
    })
  } catch (error) {
    console.error("❌ Error in recommendations API:", error)

    // Return fallback recommendations for all categories
    const emotion = "neutral" as Emotion
    return NextResponse.json({
      movies: getFallbackMovies(emotion),
      songs: getFallbackSongs(emotion),
      books: getFallbackBooks(emotion),
      spotify_available: false,
      omdb_configured: false,
      enhanced_backend: false,
      error: "Using fallback recommendations",
    })
  }
}
