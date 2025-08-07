# 🧠✨ Moodify - Emotion-Based Content Recommendation System



**Discover a new way to explore content—Moodify understands your emotions in real time to suggest the perfect movies, music, and books that resonate with how you feel.**

&#x20;  &#x20;

[🚀 Live Demo](https://0e5cdbd55a0f4b078c0979b58112f527-5aa8748bedc048bd803af61f0.fly.dev/) | [📖 Documentation](#documentation) | [🤝 Contributing](#contributing)

---

## 🌟 Overview

Moodify is an innovative application that transforms how users discover content by detecting their emotions in real-time. Leveraging facial recognition technology, it offers deeply personalized recommendations for movies, music, and books tailored to the user's current mood.

### ✨ Key Features

- **🎭 Real-time Emotion Detection** - Facial expression analysis via Face++ API
- **🎬 Smart Movie Suggestions** - Curated results from OMDB
- **🎵 Personalized Music Discovery** - Mood-based Spotify playlists
- **📚 Book Recommendations** - Powered by Google Books API
- **💬 Intelligent Chatbot** - Emotion-aware conversations via Chatbase
- **📱 Fully Responsive** - Works on all devices
- **🎨 Elegant UI** - Glassmorphism with smooth animations

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion

### Backend & APIs

- **Emotion Detection**: Face++ API
- **Movies**: OMDB
- **Music**: Spotify Web API
- **Books**: Google Books API
- **Chatbot**: Chatbase

### Development Tools

- **Code Quality**: ESLint, Prettier
- **Version Control**: Git
- **Deployment**: Vercel / Fly.io
- **IDE**: VS Code with custom configurations

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Git
- API keys (see [Environment Setup](#environment-setup))

### Installation

```bash
git clone https://github.com/Vijayan1606/Moodify-The-Emotional-Based-Recommendation.git
cd Moodify-The-Emotional-Based-Recommendation
npm install
cp .env.local.template .env.local
```

Edit `.env.local` and fill in your API keys.

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## ⚙️ Environment Setup

Set up the following environment variables in your `.env.local` file:

```env
OMDB_API_KEY=your_omdb_api_key_here
NEXT_PUBLIC_OMDB_API_KEY=your_omdb_api_key_here
FACEPLUS_API_KEY=your_faceplus_api_key
FACEPLUS_API_SECRET=your_faceplus_api_secret
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Setup guides for each API are available in the README.

---

## 📱 Usage Guide

1. **Start Camera**: Enable access and begin emotion detection.
2. **Analyze Emotion**: Click to detect and process your mood.
3. **Get Recommendations**: Movies, music, and books based on emotion.
4. **Interact**: Use chatbot or click items for more info.

---

## 🏗️ Project Structure

```
moodify/
├── app/
│   ├── api/
│   │   ├── emotion-detection/
│   │   ├── recommendations/
│   │   └── spotify-auth/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── enhanced-emotion-detector.tsx
│   └── enhanced-recommendation-card.tsx
├── lib/
│   ├── content-recommender.ts
│   └── spotify-client.ts
├── docs/
├── public/
```

---

## 🎨 Features in Detail

### Emotion Detection

- Real-time facial analysis (happy, sad, angry, etc.)
- Confidence scores
- Fallback behavior if API fails

### Recommendation System

- Emotion-to-content mapping
- Integrates with OMDB, Spotify, Google Books
- Quality filtering and personalized suggestions

### UI/UX

- Responsive across devices
- Accessible & WCAG compliant
- Glassmorphism and animation with Framer Motion

---

## 🧪 Development Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build production
npm run start      # Start production
npm run lint       # Run ESLint
npm run type-check # TypeScript checks
```

---

## 🚀 Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in dashboard.

### Manual

```bash
npm run build
npm start
```

---

## 🛡️ Security & Privacy

- No data is stored permanently
- API keys stay server-side
- Local camera processing only
- All communication over HTTPS

---

## 🤝 Contributing

1. Fork & clone
2. Create a feature branch
3. Commit & push your changes
4. Open a Pull Request

### Guidelines

- Type-safe code
- Add documentation
- Follow code style
- Write tests if applicable

---

## 📖 Documentation

- `/docs/API.md`
- `/docs/COMPONENTS.md`
- `/docs/VSCODE_SETUP.md`
- `/docs/DEPLOYMENT.md`

---

## 🔧 Troubleshooting

### Camera Not Working?

- Use HTTPS
- Check permissions

### API Issues?

- Verify keys in `.env.local`
- Check usage quota

### Build Failures?

- Delete `.next` and rebuild
- Use Node.js v18+

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🎯 Roadmap

-

---

## 👨‍💼 Author

**M. Muthu Vijayan**\
GitHub: [@Vijayan1606](https://github.com/Vijayan1606)\
LinkedIn: [Connect](https://linkedin.com/in/your-profile)

---

## 🙏 Acknowledgments

- [Face++](https://www.faceplusplus.com/) - Emotion Detection
- [OMDB](https://www.omdbapi.com/) - Movies
- [Spotify](https://developer.spotify.com/) - Music
- [Google Books](https://developers.google.com/books) - Books
- [Chatbase](https://www.chatbase.co/) - Chatbot

---

**⭐ Star this repo if you like it!**\
Made with ❤️ and built for next-gen content discovery

[🔝 Back to Top](#-moodify---emotion-based-content-recommendation-system)

