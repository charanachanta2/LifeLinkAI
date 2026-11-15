# LifeLink fixes — what changed

## Update 2 — reverted to plain full-screen maps everywhere
The box-shaped map card (on either account type) wasn't working out, so
per your request I reverted it entirely:

- **`components/AgencyMapScreen.tsx`** (police/hospital/fire/pharmacy):
  back to a plain full-screen map (`StyleSheet.absoluteFill`), no box.
- **`app/(tabs)/map-activity.tsx`** (civilian Map tab): back to a plain
  full-screen map too. I also removed the scrollable "nearby places" list
  panel that used to sit below the map, per your confirmation — the map
  now fills the whole tab. Filter chips (Hospitals/Police/Fire/Pharmacy)
  still float over the map, and tapping a marker still opens the same
  call/details popup it always did. The SOS flow is untouched.

## Update 1 (previous pass, now superseded by Update 2)

### A. Box-shaped map swapped to public service accounts
You'd asked for the box-shaped map on public service (police/hospital/
fire/pharmacy) accounts, not civilian accounts. This was fixed, then
superseded by Update 2 above (box removed entirely, both are plain
full-screen now).

### B. iOS "tab icon not visible" bug — STILL BLOCKED, need one more file
This is the same blocker as last time: the zip doesn't include
**`app/(tabs)/_layout.tsx`** — the file that actually defines the
citizen-facing tab bar (icons, colors, `tabBarActiveTintColor`, etc.) for
the `find-emergency` / `map-activity` tabs. It's simply not in either zip
you've sent me, so there's nothing for me to edit here.

Please upload:
1. `app/(tabs)/_layout.tsx`
2. `components/haptic-tab.tsx` if you have a custom one (it's imported by
   `AgencyTabLayout.tsx`, so it exists somewhere in your project — I just
   don't have it)

Once I have those, this is a quick fix. The two most common causes of
"active tab's icon disappears on iOS only" are:
- `tabBarActiveTintColor` (or the icon's own hardcoded color) matching the
  tab bar background color, so the icon is technically there but invisible
- the "focused" icon name passed to `tabBarIcon` being a typo/invalid
  Ionicon name, which iOS fails on silently instead of showing a fallback

---


Only the files that changed are listed. Everything else in the zip is untouched, carried over as-is from your upload.

## 1. Android "spinner" console warning — FIXED
**File:** `app/_layout.tsx`
`<Stack.Screen name="spinner" />` was registering a route called `spinner`
with no matching `app/spinner.tsx` file, which is exactly the warning in
your screenshot. Removed it — the app already shows a full-screen
`ActivityIndicator` inline while auth is loading, so nothing depended on it.
Also set `animation: "slide_from_right"` on the stack for a smoother,
more consistent screen-transition feel app-wide.

## 2. iPhone "can't see current tab's icon" — NOT FIXED YET
I couldn't find the file that actually defines your citizen-facing tab bar
(`app/(tabs)/_layout.tsx`, and likely `components/haptic-tab.tsx`) in the
zip you sent — the zip only included `find-emergency.tsx` and
`map-activity.tsx` from that folder. I checked `AgencyTabLayout.tsx`
(used by the police/hospital/fire/pharmacy staff views) and that one
already looks correct — it sets distinct active/inactive tint colors and
swaps to filled icon variants on focus.

**Please send `app/(tabs)/_layout.tsx`** (and `haptic-tab.tsx` if you have
a custom one) and I'll fix this directly. The usual causes for "active
tab icon disappears on iOS" are: the active tint color matching the tab
bar background, or the filled ("focused") icon name being invalid so iOS
silently renders nothing.

## 3. Map Activity tab — reworked
**File:** `app/(tabs)/map-activity.tsx`
- The map now sits inside a rounded, shadowed **box** instead of filling
  the whole screen.
- Added a **details panel below the box** — a scrollable list of nearby
  places (name, address, distance, "Nearest" flag, call button) — this is
  the "situation around the map" you asked for.
- The nearest marker on the map is now tagged with a readable label like
  **"Police near you"**, "Hospitals near you", "Fire Dept near you",
  "Pharmacy near you" (driven by whichever filter chip is active),
  replacing the old plain, unlabeled pins.
- Animations: the map box fades/scales in, the details panel slides up,
  list rows stagger in one after another, and the SOS button has a
  gentle continuous pulse so it reads as "always live".

## 4. Agency map screen ("Your station" label) — fixed for consistency
**File:** `components/AgencyMapScreen.tsx`
This is the map shown to police/hospital/fire/pharmacy staff, marking
their *own* station. It had a hardcoded "Your station" tag regardless of
role. Changed it to use the role's actual label (e.g. "Police Station",
"Hospital", "Fire Station", "Pharmacy") instead of the generic text.
Also added the same staggered entrance animation to its incident cards.

## 5. Find Emergency (public responder list) — animation polish
**File:** `app/(tabs)/find-emergency.tsx`
Added a fade-in for the header and staggered fade+rise entrance for each
responder card as the list loads.

---

## Assumption I made
You referred to a "public services tab" with a map. The zip doesn't
include a screen literally named that, so I applied the map-box +
details-panel + marker-label changes to `map-activity.tsx`, since that's
the screen with the actual interactive map, filters (Police/Hospital/Fire/
Pharmacy), and SOS flow. If you actually meant a different screen, let me
know which file and I'll move the changes over.

## Sanity-checked, not runtime-tested
I parsed all four edited files with a TypeScript/JSX parser and they're
syntactically valid, but I don't have your `package.json` / `node_modules`
in this session, so I couldn't run a real Metro bundle or type-check
against your actual dependency versions. Please build it locally before
shipping, especially the `map-activity.tsx` restructure (it's the
biggest change).

## 6. SDK 56 crash — "expo-router is no longer compatible with react-navigation" — FIXED
**File:** `components/AgencyMapScreen.tsx`
This file already imported `useIsFocused` from `@react-navigation/native` in
your original upload (unrelated to my earlier edits). Your project is on
Expo SDK 56+, where Expo Router forked away from React Navigation and no
longer allows importing `@react-navigation/*` packages directly in app
code — that's the exact error you hit. Fixed by importing `useIsFocused`
from `expo-router/react-navigation` instead, per Expo's official SDK 55→56
migration guide (https://docs.expo.dev/router/migrate/sdk-55-to-56/).

I grepped the rest of the files in your uploaded zip and this was the only
remaining `@react-navigation/*` import — but I only have the subset of
files you uploaded, not your full repo, so **run this in your project
root to be sure nothing else needs the same fix**:

    npx expo-codemod sdk-56-expo-router-react-navigation-replace src
