# Retail POS & Inventory Management – Frontend Scaffold

This repository contains a production-ready frontend scaffold for a Retail POS & Inventory Management System with two projects:

- `web/` – React (Vite + TypeScript) with TailwindCSS
- `app/` – React Native (Expo + TypeScript) with React Native Paper

Both projects include modern folder structures, reusable UI components, theming, navigation, and placeholders for charts and API integration.

---

## Prerequisites

- Node.js >= 18
- npm or yarn or pnpm
- For mobile (Expo): Expo CLI

```bash
npm i -g expo-cli
```

---

## Web (React + Vite + Tailwind)

### Install

```bash
cd "web"
npm install
```

### Run (Dev)

```bash
npm run dev
```

### Build & Preview

```bash
npm run build
npm run preview
```

---

## Mobile (React Native + Expo)

### Install

```bash
cd "app"
npm install
```

### Run (Expo)

```bash
npm run start
# or
npm run android
npm run ios
```

> iOS requires macOS/Xcode. For Android, install Android Studio or use a real device with Expo Go.

---

## Structure Overview

```
web/
  src/
    api/axios.ts          # Axios base instance
    components/           # Reusable UI + layout + charts
    pages/                # Login, Register, Dashboard (role-based)
    router/               # React Router setup
    styles/               # Tailwind index + theme/colors helpers
    hooks/                # useAuth placeholder
    types/                # shared types

app/
  src/
    navigation/           # React Navigation (Stack + Tabs)
    screens/              # Login, Register, Dashboard
    components/           # Reusable UI + layout + charts
    theme/                # Paper theme + colors
    storage/              # AsyncStorage scaffold for tokens
```

---

## Notes

- No backend integration yet. All data is placeholder.
- Ready to plug in API endpoints via `web/src/api/axios.ts` and mobile screens.
- Recharts/ApexCharts placeholder in web; simple placeholder chart in mobile using SVG.
- Consistent, modern UI with soft shadows, rounded corners, and loading states.

---

## Next Steps

- Connect authentication endpoints in `useAuth` hooks.
- Wire real data to dashboard cards and charts.
- Add role-based routes and permissions.

---

## License

MIT
