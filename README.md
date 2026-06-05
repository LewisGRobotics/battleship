# Battleship Game Starter

A browser-native Battleship game built with React for the client and Node.js + Express for the backend.
URL: https://battleship-nine-rho.vercel.app/

## Structure

- `client/` — React + Vite frontend
- `server/` — Node.js + Express backend
- `vercel.json` — Vercel deployment configuration

## Vercel Deployment

The frontend is configured as a static build and the backend is exposed on `/api/*`.

## Notes

- The backend now supports ship placement, hit detection, turn order, and win resolution.
- The frontend now renders your fleet, enemy waters, and placement UI for auto-placing ships.
