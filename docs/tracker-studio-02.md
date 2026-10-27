# CourtStreak Tracker Studio 02

A focused interface for youth, teenage and college players. Built on CHECK 09,
including Studio 01's presenter separation. This is a presentation update;
it makes no additional counting-accuracy claims.

## Implemented

- Dark navy and orange by default; optional light surfaces with navy text.
- An Appearance preference in Settings and the tracker header. Applies to AI
  training and its drill card, persists on this browser/device, and responds
  to changes in another tab. Other CourtStreak screens retain their current
  designs; this is not a complete app-wide theme conversion.
- One setup instruction and one camera action. Camera tips and build details
  stay collapsed. The demonstration is behind a closed “Need a visual?”
  section, with no mandatory viewing or dismissal step.
- A paused illustrated placeholder with optional playback. The shared
  `DRILL_VIDEOS['right-hand-pound']` URL supplies the future player recording
  in the same slot, opened only on request. This map already feeds drill
  guides. No player demonstration URL is currently configured.
- Clear camera checks and countdown, with count and time outside the image.
- A compact result card, per-rep seeking, and half-speed/normal-speed replay.
- Short save/share controls. Original-video fallback and downloadable test
  details remain available under expandable sections.
- Subtle completion animation, reduced-motion support, keyboard focus styles,
  and 44px or larger main controls and rep markers.

No new models, dependencies, inference loops or camera requirements were added.
The camera video and overlay remain mounted when their container is hidden.
The controller, detector, counter and export engine are unchanged from Studio 01.

## Design references reviewed on October 27, 2026

- HomeCourt describes interactive drills and immediate feedback:
  https://www.homecourt.ai/
  Applied as visible training feedback and easy review of counted reps.
- Nike Training Club describes guided video workouts:
  https://www.nike.com/help/a/ntc-info
  Applied as an optional slot for Trey's recorded demonstration.
- Duolingo reports positive early results for its milestone celebration update:
  https://blog.duolingo.com/streak-milestone-design-animation/
  Applied conservatively as a brief round-completion reveal.

These are design precedents. Their results do not establish engagement or
retention gains for CourtStreak. No invented personal best, XP, streak reward,
leaderboard result or improvement metric is displayed.

## Validation

- All 1,761 existing tracker tests pass.
- Production build passes (existing chunk-size and hero-image warnings remain).
- Detector/counter/export sources and IPhonePoundTest controller are unchanged
  from Studio 01 (`2cfad63`).
- Cloud Chrome: phone, tablet, desktop and landscape layouts reviewed; measured
  layouts have no horizontal page overflow.
- Exact-rep selection and 0.5x playback verified on the sample recording.
- Export-ready UI keeps replay position, selected rep and speed intact.
- Theme preference survives reload. The real customer-preview Settings page
  includes the functioning Appearance control.
- Optional visual opens/closes and can be skipped when starting a sample round.

Sample illustrations and scores are design fixtures, not tracker measurements.
Real player-demo playback awaits a supplied video. A real iPhone/iPad Safari
camera, countdown and export check remains necessary after deployment.

## Preview and patch

The single-file HTML preview contains the actual presenter and clearly labeled
sample data. It opens offline and never accesses the camera or detection models.

`CourtStreak-Tracker-Studio-02.patch` is cumulative from CHECK 09 (`d4f1443`). It
includes Studio 01, so apply this patch alone to the current deployed CHECK 09
branch. Do not also apply the older Studio 01 patch.

After saving the patch in Downloads on Trey's Mac:

```bash
cd ~/Downloads/CourtStreak-Tracker-Lock-02-Review &&
git fetch origin main &&
git switch -c "deploy/tracker-studio-02-$(date +%Y%m%d-%H%M%S)" origin/main &&
git am --3way "$HOME/Downloads/CourtStreak-Tracker-Studio-02.patch" &&
npm run test:tracker &&
npm run build &&
git push origin HEAD:main
```

No database migration is needed. Build details should show CHECK 09 · STUDIO 02.
This work is packaged for review; it has not been pushed or deployed.
