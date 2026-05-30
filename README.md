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

## Notes

- The starter includes a simple player onboarding flow and game state stub.
- The backend now supports ship placement, hit detection, turn order, and win resolution.
- The frontend now renders your fleet, enemy waters, and placement UI for auto-placing ships.
