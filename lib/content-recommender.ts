process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface OMDBMovie {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
  Plot?: string
  imdbRating?: string
  Genre?: string
  Director?: string
  Actors?: string
}

interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: {
    name: string
    images: Array<{ url: string; height: number; width: number }>
  }
  external_urls: {
    spotify: string
  }
  preview_url: string | null
  popularity: number
  duration_ms: number
}

interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publishedDate?: string
    description?: string
    imageLinks?: {
      thumbnail?: string
    }
    categories?: string[]
    pageCount?: number
    averageRating?: number
  }
}

export class ContentRecommender {
  private omdbApiKey: string
  private spotifyClientId: string
  private spotifyClientSecret: string
  private googleBooksApiKey: string
  private spotifyToken: string | null = null

  private emotionMappings = {
    happy: {
      movie_queries: ['happy', 'love', 'adventure', 'joy', 'fun'],
      music_genres: ['pop', 'dance', 'funk', 'reggae'],
      book_queries: ['comedy', 'romance', 'adventure', 'self-help']
    },
    sad: {
      movie_queries: ['sad', 'tears', 'loss', 'grief', 'heart'],
      music_genres: ['acoustic', 'indie', 'blues', 'soul'],
      book_queries: ['drama', 'poetry', 'memoir', 'philosophy']
    },
    angry: {
      movie_queries: ['action', 'fight', 'revenge', 'battle', 'war'],
      music_genres: ['rock', 'metal', 'punk', 'electronic'],
      book_queries: ['thriller', 'crime', 'politics', 'biography']
    },
    surprised: {
      movie_queries: ['mystery', 'twist', 'secret', 'unexpected', 'shock'],
      music_genres: ['experimental', 'electronic', 'world'],
      book_queries: ['mystery', 'science fiction', 'fantasy', 'adventure']
    },
    fear: {
      movie_queries: ['courage', 'brave', 'overcome', 'hope', 'escape'],
      music_genres: ['ambient', 'classical', 'new-age', 'folk'],
      book_queries: ['comfort', 'spirituality', 'meditation', 'healing']
    },
    disgust: {
      movie_queries: ['nature', 'inspire', 'clean', 'pure', 'truth'],
      music_genres: ['classical', 'jazz', 'world', 'folk'],
      book_queries: ['nature', 'travel', 'art', 'culture']
    },
    neutral: {
      movie_queries: ['classic', 'blockbuster', 'famous', 'top', 'movie'],
      music_genres: ['pop', 'rock', 'indie', 'alternative'],
      book_queries: ['bestseller', 'fiction', 'non-fiction', 'contemporary']
    }
  }


  constructor() {
    this.omdbApiKey = process.env.OMDB_API_KEY || process.env.NEXT_PUBLIC_OMDB_API_KEY || ''
    this.spotifyClientId = process.env.SPOTIFY_CLIENT_ID || ''
    this.spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || ''
    this.googleBooksApiKey = process.env.GOOGLE_BOOKS_API_KEY || ''
  }

  private async getSpotifyToken(): Promise<string | null> {
    if (!this.spotifyClientId || !this.spotifyClientSecret) {
      return null
    }

    if (this.spotifyToken) {
      return this.spotifyToken
    }

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${this.spotifyClientId}:${this.spotifyClientSecret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        this.spotifyToken = data.access_token
        return this.spotifyToken
      }
    } catch (error) {
      console.error('Error getting Spotify token:', error)
    }

    return null
  }


  async getMovieRecommendations(emotion: keyof typeof this.emotionMappings): Promise<any[]> {
    if (!this.omdbApiKey || this.omdbApiKey === 'your_actual_omdb_api_key_here') {
      console.error('❌ OMDB API key not configured properly:', this.omdbApiKey)
      throw new Error('OMDB API key missing or invalid')
    }

    console.log('Using OMDB API key:', this.omdbApiKey ? this.omdbApiKey.substring(0, 8) + '...' : 'Not set')

    try {
      const mapping = this.emotionMappings[emotion] || this.emotionMappings.neutral
      const queries = mapping.movie_queries

      const movies: any[] = []

      // Search for movies using different emotion-based queries
      for (const query of queries.slice(0, 3)) {
        try {
          const url = 'https://www.omdbapi.com/'
          const params = new URLSearchParams({
            apikey: this.omdbApiKey,
            s: query,
            type: 'movie',
            page: '1'
          })

          const response = await fetch(`${url}?${params}`, {
            signal: AbortSignal.timeout(10000)
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`OMDB search response for "${query}":`, JSON.stringify(data, null, 2))

            if (data.Search && Array.isArray(data.Search)) {
              // Get detailed info for each movie
              for (const movie of data.Search.slice(0, 4)) {
                try {
                  const detailParams = new URLSearchParams({
                    apikey: this.omdbApiKey,
                    i: movie.imdbID,
                    plot: 'short'
                  })

                  const detailResponse = await fetch(`${url}?${detailParams}`, {
                    signal: AbortSignal.timeout(8000)
                  })

                  if (detailResponse.ok) {
                    const detailData = await detailResponse.json()

                    if (detailData.Response === 'True') {
                      movies.push({
                        id: detailData.imdbID,
                        title: detailData.Title || 'Unknown Title',
                        year: detailData.Year || '',
                        rating: detailData.imdbRating !== 'N/A' ? parseFloat(detailData.imdbRating) || 0 : 0,
                        overview: detailData.Plot !== 'N/A' ? detailData.Plot : 'No description available.',
                        poster_url: detailData.Poster !== 'N/A' ? detailData.Poster : null,
                        genres: detailData.Genre !== 'N/A' ? detailData.Genre.split(', ') : [],
                        director: detailData.Director !== 'N/A' ? detailData.Director : 'Unknown',
                        actors: detailData.Actors !== 'N/A' ? detailData.Actors : 'Unknown',
                        imdb_url: `https://www.imdb.com/title/${detailData.imdbID}`
                      })
                    } else {
                      console.warn('OMDB detailData.Response not True:', detailData)
                    }
                  } else {
                    console.error('OMDB detail fetch failed:', detailResponse.status)
                  }
                } catch (detailError) {
                  console.error('Error fetching movie details:', detailError)
                }
              }
            } else {
              console.warn(`No movies found for query "${query}":`, data)
            }
          } else {
            console.error('OMDB search fetch failed:', response.status)
          }
        } catch (error) {
          console.error(`Error searching for ${query} movies:`, error)
        }
      }

      // Remove duplicates and shuffle
      const uniqueMovies = []
      const seenIds = new Set()
      for (const movie of movies) {
        if (!seenIds.has(movie.id)) {
          uniqueMovies.push(movie)
          seenIds.add(movie.id)
        }
      }

      // Shuffle results for variety
      for (let i = uniqueMovies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueMovies[i], uniqueMovies[j]] = [uniqueMovies[j], uniqueMovies[i]]
      }

      console.log('OMDB uniqueMovies:', uniqueMovies.length, uniqueMovies.map(m => m.title))

      return uniqueMovies.slice(0, 10)
    } catch (error) {
      console.error('Error fetching movies:', error)
      throw error
    }
  }

  async getMusicRecommendations(emotion: keyof typeof this.emotionMappings): Promise<any[]> {
    const token = await this.getSpotifyToken()
    if (!token) {
      return []
    }

    try {
      const mapping = this.emotionMappings[emotion] || this.emotionMappings.neutral
      const genres = mapping.music_genres

      const songs: any[] = []
      const headers = { 'Authorization': `Bearer ${token}` }

      // Get tracks from multiple genres
      for (const genre of genres.slice(0, 2)) {
        try {
          const url = 'https://api.spotify.com/v1/search'
          const params = new URLSearchParams({
            q: `genre:${genre}`,
            type: 'track',
            limit: '25'
          })

          const response = await fetch(`${url}?${params}`, {
            headers,
            signal: AbortSignal.timeout(10000)
          })

          if (response.ok) {
            const data = await response.json()
            const tracks: SpotifyTrack[] = data.tracks?.items || []

            for (const track of tracks) {
              const duration = track.duration_ms || 0
              const durationStr = `${Math.floor(duration / 60000)}:${Math.floor((duration % 60000) / 1000).toString().padStart(2, '0')}`

              songs.push({
                name: track.name || 'Unknown Track',
                artist: track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
                album: track.album?.name || 'Unknown Album',
                duration: durationStr,
                preview_url: track.preview_url,
                image_url: track.album?.images?.[0]?.url,
                external_url: track.external_urls?.spotify
              })
            }
          }
        } catch (error) {
          console.error(`Error fetching ${genre} music:`, error)
        }
      }

      // Remove duplicates and shuffle
      const uniqueSongs = []
      const seenNames = new Set()
      for (const song of songs) {
        if (!seenNames.has(song.name)) {
          uniqueSongs.push(song)
          seenNames.add(song.name)
        }
      }

      // Shuffle and return top 15
      for (let i = uniqueSongs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueSongs[i], uniqueSongs[j]] = [uniqueSongs[j], uniqueSongs[i]]
      }

      return uniqueSongs.slice(0, 15)
    } catch (error) {
      console.error('Error fetching music:', error)
    }

    return []
  }

  async getBookRecommendations(emotion: keyof typeof this.emotionMappings): Promise<any[]> {
    try {
      const mapping = this.emotionMappings[emotion] || this.emotionMappings.neutral
      const queries = mapping.book_queries

      const books: any[] = []

      for (const query of queries.slice(0, 2)) {
        try {
          const url = 'https://www.googleapis.com/books/v1/volumes'
          const params = new URLSearchParams({
            q: query,
            orderBy: 'relevance',
            maxResults: '20'
          })

          if (this.googleBooksApiKey) {
            params.set('key', this.googleBooksApiKey)
          }

          const response = await fetch(`${url}?${params}`, {
            signal: AbortSignal.timeout(10000)
          })

          if (response.ok) {
            const data = await response.json()
            const items: GoogleBook[] = data.items || []

            for (const item of items) {
              const volumeInfo = item.volumeInfo || {}

              if (!volumeInfo.title) continue

              let description = volumeInfo.description || ''
              if (description.length > 500) {
                description = description.substring(0, 500) + '...'
              }

              books.push({
                title: volumeInfo.title || 'Unknown Title',
                authors: volumeInfo.authors || ['Unknown Author'],
                published_date: volumeInfo.publishedDate || 'Unknown',
                description: description,
                thumbnail: volumeInfo.imageLinks?.thumbnail,
                categories: volumeInfo.categories || [],
                page_count: volumeInfo.pageCount,
                rating: volumeInfo.averageRating
              })
            }
          }
        } catch (error) {
          console.error(`Error fetching ${query} books:`, error)
        }
      }

      // Remove duplicates and shuffle
      const uniqueBooks = []
      const seenTitles = new Set()
      for (const book of books) {
        if (!seenTitles.has(book.title)) {
          uniqueBooks.push(book)
          seenTitles.add(book.title)
        }
      }

      // Shuffle and return top 10
      for (let i = uniqueBooks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [uniqueBooks[i], uniqueBooks[j]] = [uniqueBooks[j], uniqueBooks[i]]
      }

      return uniqueBooks.slice(0, 10)
    } catch (error) {
      console.error('Error fetching books:', error)
    }

    return []
  }

  async getRecommendations(emotion: string) {
    const normalizedEmotion = emotion as keyof typeof this.emotionMappings

    const [movies, music, books] = await Promise.allSettled([
      this.getMovieRecommendations(normalizedEmotion),
      this.getMusicRecommendations(normalizedEmotion),
      this.getBookRecommendations(normalizedEmotion)
    ])

    return {
      movies: movies.status === 'fulfilled' ? movies.value : [],
      music: music.status === 'fulfilled' ? music.value : [],
      books: books.status === 'fulfilled' ? books.value : []
    }
  }
}

export const contentRecommender = new ContentRecommender()
