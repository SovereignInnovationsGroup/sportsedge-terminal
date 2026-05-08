# SportsEdge Coming Soon Page

A modern, responsive coming soon page for SportsEdge sports exchange platform built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 Modern glassmorphism design
- 📱 Fully responsive (mobile, tablet, desktop)
- ⚡ Fast loading with optimized assets
- 📧 Email collection with EmailJS integration
- 🎯 SEO optimized
- 🔒 Production ready

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Build Tool**: Vite
- **Email Service**: EmailJS
- **Fonts**: Roboto Mono

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Add your hero background image:**
   - Place image in `public/images/hero-soccer-futuristic.png`
   - Or update the path in `App.tsx`

3. **Configure EmailJS (optional):**
   - Sign up at emailjs.com
   - Update API keys in `App.tsx`

4. **Start development server:**
```bash
npm run dev
```

5. **Build for production:**
```bash
npm run build
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions including:
- Static hosting (Netlify, Vercel, etc.)
- Linux server setup with Nginx/Apache
- SSL configuration
- Performance optimization

## Project Structure

```
├── components/          # Reusable React components
│   ├── figma/          # Figma-specific components
│   └── ui/             # shadcn/ui components
├── lib/                # Utility functions
├── public/             # Static assets
├── styles/             # Global CSS and Tailwind config
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.html          # HTML template
```

## License

© 2025 SportsEdge. All rights reserved.