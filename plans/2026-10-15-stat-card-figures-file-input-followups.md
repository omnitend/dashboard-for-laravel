# Follow-ups after #224 (stat card fit, tabular figures, DFormFile, typed slots)

Status: OPEN 2026-10-15. PR #224 closes #213, #215, #219 and #221 and needs a
MINOR bump because of its upgrade notes (template refs to the generic
DXDashboard/DXDashboardSidebar; the nullable `navbar-user-menu` user). The
items below were triaged in the same session and deliberately left out of it.

## Decided, ready to build (minor: both change defaults)

- **#217: desktop sidebar open on a first visit.** `defaultHidden` in
  DXDashboard is `!dashboardId`, chosen for the docs site. Decision: default
  to open for every instance; add a `defaultSidebarHidden` prop that the docs
  site sets to keep its look. This changes the server-rendered default, so
  check the docs' inline `sidebar-visible` script and the SSR/hydration tests
  (`DXDashboard.phone-menu.test.ts`). CHANGELOG entry.
- **#220: DXCurrencyInput refuses a third decimal.** It rounds `5.005` to 501
  today. Decision: refuse more places than `decimals` allows. Leave the stored
  value unchanged and show an invalid state with a message (check how DXField
  surfaces a client-side error before choosing the mechanism). CHANGELOG entry.

These two could ship in the same minor release as #224.

## Design pass needed

- **#214: DXTable stacking mode for phones.** `plans/2026-07-23-dxtable-stacked-card-mode.md`
  (PROPOSED) already covers it. The cheaper route to try first is rendering
  DXTable's `<DTable>` inside `DXStackingTable` (reusing its labels, opt-outs
  and hysteresis), if bvn's `table-responsive` wrapper allows it:
  DXStackingTable needs the `<table>` as its direct child. That plan predates
  DXStackingTable, so update it rather than starting fresh.
- **#218: navbar `pageTitle` hidden below `md`.** It is a layout decision on
  the one-row phone navbar. Design it together with #103 (where
  `actionsOnMobile="hide"` content goes on phones).

## Smaller follow-ups

- **`DXField type: 'file'` on DFormFile.** DXField renders `file`/`image` with
  `DFormInput type="file"` today. Swapping in DFormFile is mostly one branch:
  bind the model to `setValue`, read the image preview from the File, keep
  `accept`/`required`/`state`/`disabled`. Check the payload shape useForm
  submits for a File (multipart). This is the field half of
  `plans/2026-07-26-image-upload-field.md` (OPEN, downgraded to a nicety).
- **#222: API reference generator.** DXDashboard's dynamic slot forwarder is
  listed as `originalName`, and the generic components' `navigation` prop
  type shows as `TNavigation`. Both are fixes in `scripts/` (manifest
  generation), not in the components.
- **`scripts/test-linux.sh` runs Linux Chromium in Docker** and its container
  runs `npx -y playwright@<pinned>`. It is opt-in, and the only local way to
  see CI's text layout. Consider moving it into a snib guest, in line with the
  move away from host package managers.
- **ResizeObserver loop noise on CI**, which predates #224: about 30–60
  "ResizeObserver loop completed" lines per run, from `useContainerWidth`
  users (DXForm container layout, DXStackingTable, DXTablePagination). None
  fail a test. The stat card fitter avoids it by refitting in the next frame;
  the same approach may apply there.
- **Stat card fitter, two lows left as they are:** a long value takes up to 7
  bisection rounds on macOS where probing the estimate's neighbour first would
  take 3. At root font sizes other than 16px the result can land up to 0.125px
  short of the largest fit.
- **DFormFile, from the reviews:** a model set programmatically from File A
  to File B updates bvn's file-name text but not the native input (a plain
  submit still posts A). Same family as DIVERGENCES #7. Also, the drag cursor
  over a disabled control may show "copy" before the drop is swallowed;
  changing it needs real Chrome, Safari and Firefox checks.
- **Inside `DInputGroup size="sm"`** neither DFormInput nor DFormFile shrinks.
  This predates #224 and is unrelated to it.
