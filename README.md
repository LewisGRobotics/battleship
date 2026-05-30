# Battleship Game Starter

A browser-native Battleship game built with React for the client and Node.js + Express for the backend.

## Structure

- `client/` — React + Vite frontend
- `server/` — Node.js + Express backend
- `vercel.json` — Vercel deployment configuration

## Setup

1. Open a terminal in `C:\Users\Luis\battleship-game`
2. Install dependencies:
   - `cd client && npm install`
   - `cd ../server && npm install`
3. Configure MongoDB:
   - create a local or Atlas database
   - copy `server/.env.example` to `server/.env`
   - set `MONGODB_URI`
4. Run locally:
   - `cd server && npm run dev`
   - `cd ../client && npm run dev`

## Vercel Deployment

The frontend is configured as a static build and the backend is exposed on `/api/*`.

### Hide credentials on Vercel

1. Push your code without `server/.env` — it is already ignored by `.gitignore`.
2. In your Vercel dashboard, open the project and go to Settings → Environment Variables.
3. Add a new variable:
   - Name: `MONGODB_URI`
   - Value: your Atlas connection string
   - Environment: `Production` and `Preview` (and `Development` if you want local builds to also use it)
4. Ensure your Vercel project output directory is `client/dist` if prompted.
5. Redeploy the project.

Your server code will use `process.env.MONGODB_URI` from Vercel instead of a checked-in file.

## Notes

- The starter includes a simple player onboarding flow and game state stub.
- The backend now supports ship placement, hit detection, turn order, and win resolution.
- The frontend now renders your fleet, enemy waters, and placement UI for auto-placing ships.
