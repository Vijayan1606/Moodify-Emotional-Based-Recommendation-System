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

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[]
  }
}

interface SpotifyRecommendationsResponse {
  tracks: SpotifyTrack[]
}

interface SpotifyAuthResponse {
  access_token?: string
  error?: string
  fallback?: boolean
  cached?: boolean
}

export class SpotifyClient {
  private accessToken: string | null = null
  private isAvailable = true
  private lastCheck = 0

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token and service is available
    if (this.accessToken && this.isAvailable) {
      return this.accessToken
    }

    // Don't retry too frequently if service is unavailable
    const now = Date.now()
    if (!this.isAvailable && now - this.lastCheck < 60000) {
      // 1 minute cooldown
      throw new Error("Spotify service temporarily unavailable")
    }

    try {


      const response = await fetch("/api/spotify-auth", {
        method: "POST",
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      const data: SpotifyAuthResponse = await response.json()

      if (data.fallback) {

        this.isAvailable = false
        this.lastCheck = now
        throw new Error("Spotify credentials not configured")
      }

      if (!response.ok || !data.access_token) {
        console.error("❌ Failed to get Spotify access token:", data.error)
        this.isAvailable = false
        this.lastCheck = now
        throw new Error(data.error || "Failed to get access token")
      }

      this.accessToken = data.access_token
      this.isAvailable = true
      this.lastCheck = now


      return this.accessToken
    } catch (error) {
      console.error("❌ Error getting Spotify access token:", error)
      this.isAvailable = false
      this.lastCheck = now
      throw error
    }
  }

  async searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken()



      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}&market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it and retry once
          this.accessToken = null
          return this.searchTracks(query, limit)
        }
        throw new Error(`Spotify search failed: ${response.status}`)
      }

      const data: SpotifySearchResponse = await response.json()

      return data.tracks.items
    } catch (error) {
      console.error("❌ Spotify search error:", error)
      return []
    }
  }

  async getRecommendations(seedGenres: string[], limit = 10): Promise<SpotifyTrack[]> {
    try {
      const token = await this.getAccessToken()

      // Limit to 5 seed genres (Spotify API limitation)
      const genres = seedGenres.slice(0, 5).join(",")


      const response = await fetch(
        `https://api.spotify.com/v1/recommendations?seed_genres=${genres}&limit=${limit}&market=US`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, clear it and retry once
          this.accessToken = null
          return this.getRecommendations(seedGenres, limit)
        }
        throw new Error(`Spotify recommendations failed: ${response.status}`)
      }

      const data: SpotifyRecommendationsResponse = await response.json()

      return data.tracks
    } catch (error) {
      console.error("❌ Spotify recommendations error:", error)
      return []
    }
  }

  async getAvailableGenres(): Promise<string[]> {
    try {
      const token = await this.getAccessToken()

      const response = await fetch("https://api.spotify.com/v1/recommendations/available-genre-seeds", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to get genres: ${response.status}`)
      }

      const data = await response.json()

      return data.genres
    } catch (error) {
      console.error("❌ Error getting Spotify genres:", error)
      return []
    }
  }

  formatTrackForRecommendation(track: SpotifyTrack) {
    return {
      id: track.id,
      title: `${track.name} - ${track.artists.map((a) => a.name).join(", ")}`,
      description: `${track.album.name} • ${Math.floor(track.duration_ms / 60000)}:${Math.floor(
        (track.duration_ms % 60000) / 1000,
      )
        .toString()
        .padStart(2, "0")}`,
      image: track.album.images[0]?.url || "/placeholder.svg?height=200&width=200&text=Song",
      link: track.external_urls.spotify,
      rating: track.popularity / 20, // Convert 0-100 to 0-5 scale
      preview_url: track.preview_url,
    }
  }

  // Check if Spotify is available
  isSpotifyAvailable(): boolean {
    return this.isAvailable
  }

  // Reset availability status (for manual retry)
  resetAvailability(): void {
    this.isAvailable = true
    this.lastCheck = 0
    this.accessToken = null
  }
}

export const spotifyClient = new SpotifyClient()
