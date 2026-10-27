# CourtStreak Tracker Studio 01

Visual update based on CHECK 09 (`d4f1443`). The tracking check remains CHECK 09;
the new interface is separately labeled STUDIO 01, including in exported JSON.

## What changed

- Redesigned the right-hand-pound AI entrance and the entire camera-session view.
- Warm paper, navy and CourtStreak orange; consistent typography, spacing,
  clearer buttons, visible keyboard focus and reduced-motion support.
- Three-step session progress, floor-level setup directions, individual framing
  checks, and explicit countdown-pause feedback.
- Live scores sit outside the camera picture. Compact landscape training puts
  the camera and score side by side so the count remains visible.
- Results have a score summary, synchronized replay, horizontally scrollable
  rep markers, MP4 progress, save/share actions, original-file fallback,
  interruption reasons and expandable test details.
- The video/canvas refs stay mounted. Finishing the shareable MP4 does not
  replace or remount the immediate replay.
- No new AI inference, processing loops, camera requirements or dependencies.

## Validation

- All 1,761 tracker tests pass.
- Production build passes.
- Controller code before the render is identical to CHECK 09 after excluding
  presentation-only variables and the new JSON presentation-revision field.
- Detector, counter, camera/recording/export implementation and replay observer
  sources are unchanged.
- Cloud Chrome review with the actual presenter at desktop, 768px tablet,
  390px phone and 844px landscape widths. Phone and tablet results have no
  horizontal page overflow. Rep buttons have 44px touch targets.
- Sample replay: rep seeking works; accepted counts advance during playback;
  final playback shows 30/30; MP4 readiness keeps the selected rep and playback;
  original-file selection, share feedback, evidence disclosure and restart work.
- Countdown pause and the portrait/landscape presentation were inspected.

The design preview uses a generated illustration and an explicit sample
timeline. It never opens the camera or loads detection models, and its sample
scores are not accuracy measurements. Layout review in cloud Chrome does not
replace a live iPhone/iPad Safari check after deployment.

## Preview

With the existing Vite development server, open
`/courtstreak-site/design/tracker-studio/index.html`.

Create a single HTML file that works offline:

```sh
node design/tracker-studio/build-preview.mjs /absolute/output/Tracker-Studio-01.html
```

The design entry and sample clip are separate from the production build.
No user videos or session JSON are included in the preview.

## Deploy on Trey's Mac

Download `CourtStreak-Tracker-Studio-01.patch` into Downloads first, then:

```sh
cd ~/Downloads/CourtStreak-Tracker-Lock-02-Review &&
git fetch origin main &&
git switch -c "deploy/tracker-studio-01-$(date +%Y%m%d-%H%M%S)" origin/main &&
git am --3way "$HOME/Downloads/CourtStreak-Tracker-Studio-01.patch" &&
npm run test:tracker &&
npm run build &&
git push origin HEAD:main
```

No database migration is needed. After GitHub Pages deployment succeeds, the
session footer should show CHECK 09 · STUDIO 01. On a real phone, verify enabling
the camera, framing/countdown, one normal round, a replay marker and saving the
counted video. This release makes no additional counting-accuracy claims.
