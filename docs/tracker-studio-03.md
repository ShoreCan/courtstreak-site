# CourtStreak Studio 03

Keeps the approved Studio 02 layout, with three requested changes:

- Countdown preview runs 5 → 4 → 3 → 2 → 1 → Go and starts the sample round.
  Choosing Countdown again restarts it. Pause/resume retains its current digit.
- Appearance controls leave the tracker header. The design preview has one
  small settings gear; the product choice lives in Settings → Appearance.
- Dark/light appearance now applies throughout CourtStreak, including player
  pages, navigation, the Lab, account screens and the parent/coach Hub. Navy and
  orange remain the default. The choice persists on this browser/device.

The optional demonstration stays closed until requested. Existing final scores,
rep seeking, half-speed playback, export progress and sharing remain available.

## Verification

- All 1,767 automated checks pass: 1,761 existing tracker checks and six new
  appearance checks for contrast, persistence, blocked storage, cross-tab
  updates, legacy stylesheet handling and media preservation.
- Production and standalone preview builds pass.
- Browser inspection of the full 5/4/3/2/1/Go sequence; pause retained its digit
  before resuming to Go.
- Settings choice carries into Dashboard, Training, Progress, Achievements,
  Training Circles, Profile, Membership and the Family Hub. Settings and Hub
  inspected in both appearances; the choice survives page loading/navigation.
- Changing appearance in a second tab preserved replay position, selected rep
  and 0.5x playback in the tracker preview.
- The tracker controller, detector/counter, recording/export workers and replay
  implementation are unchanged from Studio 02. Tracking remains CHECK 09.

Cloud Chrome and sample data were used for layout and interaction review.
This does not claim a new real-device camera or counting-accuracy result.

## Implementation

`src/theme.css` supplies the shared palette. Appearance initializes at app start
and before first paint. Existing stylesheets use the palette through a PostCSS
adapter in `scripts/appearance-css.mjs`; stylesheet order, layout properties and
existing `!important` declarations are retained. The adapter runs in development
and builds, not during camera tracking. New styles can use the semantic tokens
directly. Tracker styles already have their own paired palettes and are kept.

No screen inversion, runtime DOM scanning, extra inference loops or added
dependencies are used. Camera/video pixels, export drawing colors, SVG image
URLs and the user's selected Circle colors are preserved. No SQL migration is
required. Preferences are local to the browser/device, not synced to accounts.

## Preview

Open `CourtStreak-Tracker-Studio-03.html` in a browser. Try Countdown, then the
small gear for Settings. The preview has sample footage and never opens a real
camera. Its Appearance section uses the same component as actual Settings.

To rebuild the portable preview:

```sh
node design/tracker-studio/build-preview.mjs /absolute/output/Studio-03.html
```

## Install on Trey's Mac

`CourtStreak-Tracker-Studio-03.patch` is cumulative from deployed CHECK 09
(`d4f1443`). It includes Studios 01 and 02. Apply this patch alone; do not also
apply the previous design patches. The live branch was still CHECK 09 when
this package was prepared.

Download the patch into Downloads, then run:

```bash
cd ~/Downloads/CourtStreak-Tracker-Lock-02-Review &&
git fetch origin main &&
git switch -c "deploy/tracker-studio-03-$(date +%Y%m%d-%H%M%S)" origin/main &&
git am --3way "$HOME/Downloads/CourtStreak-Tracker-Studio-03.patch" &&
npm run test:tracker &&
npm run build &&
git push origin HEAD:main
```

After deployment, Build details should show CHECK 09 · STUDIO 03. Check the
appearance choice from the real Settings page and one camera round on iPhone.
The design package has not been pushed or deployed from this environment.
