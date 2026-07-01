# CourtStreak React Prototype

A mobile-first React/Vite prototype for CourtStreak, a basketball training platform with daily drills, streaks, badges, leaderboards, weekly challenges, beta signup UI, and team/trainer growth sections.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to GitHub Pages

1. Push this project to `https://github.com/ShoreCan/courtstreak-site.git`.
2. In GitHub, go to **Settings → Pages**.
3. For a Vite app, the easiest option is deploying with Vercel or Netlify. If you want GitHub Pages specifically, add a GitHub Actions workflow that builds Vite and deploys the `dist` folder.

## Replace founder image placeholder

In `src/main.jsx`, find the `story-image` div. Replace the placeholder with an `<img>` tag after adding your photo to `src/assets/`.
