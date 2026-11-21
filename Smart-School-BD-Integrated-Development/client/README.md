# Smart School BD — Client

React + Vite + Tailwind CSS starter for the Smart School BD attendance platform.

## Requirements
- Node.js 20 LTS (recommended)
- The existing Express API running separately

## Setup
```bash
npm install
copy .env.example .env
npm run dev
```
On PowerShell, `Copy-Item .env.example .env` can be used instead of `copy`.

Vite normally prints the local URL, commonly `http://localhost:5173`.

## Build check
```bash
npm run build
npm run preview
```

## Current state
- Responsive Bengali-first UI foundation.
- Central monitoring, school admin and teacher screens with illustrative demo data.
- Role selector is for UI preview only and is **not authentication**.
- API client reads `VITE_API_BASE_URL`, but endpoints are not yet wired to real data.
- No real SMS, face descriptor, guardian phone or student biometric data is included.
- Central government officer API/role and scoped access must be implemented and verified on the backend before production integration.

## Security notes
- Never put JWT secrets, MongoDB credentials or other private server secrets in `VITE_*` variables.
- Frontend role-based navigation is for usability only. Every protected operation must be authorized by the server.
- Demo values must not be represented as live school data in production.
