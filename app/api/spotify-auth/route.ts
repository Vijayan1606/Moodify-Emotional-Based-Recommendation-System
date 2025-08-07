import { type NextRequest, NextResponse } from "next/server"

// Spotify Web API credentials from environment variables
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

let cachedToken: {
  access_token: string
  expires_at: number
} | null = null

export async function POST(request: NextRequest) {
  try {
    // Check if we have a valid cached token
    if (cachedToken && cachedToken.expires_at > Date.now()) {
      return NextResponse.json({
        access_token: cachedToken.access_token,
        cached: true,
      })
    }

    // Check if credentials are configured
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {

      return NextResponse.json(
        {
          error: "Spotify credentials not configured",
          fallback: true,
        },
        { status: 400 },
      )
    }



    // Get new token using Client Credentials flow
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Spotify auth failed: ${response.status} - ${errorText}`)
      throw new Error(`Spotify auth failed: ${response.status}`)
    }

    const data: SpotifyTokenResponse = await response.json()

    // Cache the token (expires in 1 hour, we'll refresh 5 minutes early)
    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in - 300) * 1000, // 5 minutes early
    }



    return NextResponse.json({
      access_token: data.access_token,
      expires_in: data.expires_in,
      cached: false,
    })
  } catch (error) {
    console.error("❌ Spotify auth error:", error)
    return NextResponse.json(
      {
        error: "Failed to authenticate with Spotify",
        details: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      },
      { status: 500 },
    )
  }
}
