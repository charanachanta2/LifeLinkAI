# LifeLink app — new look (black / green / red)

The app now uses the same design as the LifeLink website: near-black surfaces,
green as the main accent, red for emergencies, amber for warnings.

- **All colours live in one file:** `constants/lifelink-theme.ts` (`LL.accent`, `LL.danger`, `LL.surface` ...).
  Change a value there and every screen follows.
- App is **dark-only** now (`app.json` -> `userInterfaceStyle: "dark"`, splash/adaptive icon background `#050605`, status bar light).
- **Inter font** (same as the website): `assets/fonts/` + `components/ll-text.tsx`. Screens import `Text` / `TextInput` from there; fontWeight in styles picks the Inter weight.
- **Website glow** (soft green at the top, faint red bottom-right): `components/LLGlow.tsx`, applied to every screen from the navigators (`screenLayout`).
- **App icon, adaptive icon and splash** now use the website's LifeLink pulse logo (`assets/images/`).
- Tab bars (civilian + agency) restyled with rounded tops; maps use the same dark tile filter as the website control room.
- Role colours: Police = blue, Hospital = red, Fire = orange, Pharmacy = green.
- No logic, API, routing or Firebase code was changed.
- Also fixed: the bottom-tab icons for Map / Analytics / Blood Bank / Emergency were missing on Android and web
  (`components/ui/icon-symbol.tsx` had no mapping for them).
- `.env` was added to `.gitignore`. It was committed in the repo with real Firebase and Geoapify keys. Remove it from git
  history and rotate those keys.

Run it the same way as before: `npm install` then `npx expo start`. Copy your own `.env` into this folder first (it is not included).
