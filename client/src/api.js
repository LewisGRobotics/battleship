const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || error.message || 'API request failed')
  }

  return res.json()
}

export function registerPlayer(player) {
  return request('/player', { method: 'POST', body: player })
}

export function createGame(player) {
  return request('/game', { method: 'POST', body: player })
}

export function joinGame(gameId, player) {
  return request(`/game/${gameId}/join`, { method: 'POST', body: player })
}

export function placeShips(gameId, playerId, ships) {
  return request(`/game/${gameId}/place`, { method: 'POST', body: { playerId, ships } })
}

export function fireMove(gameId, playerId, x, y) {
  return request(`/game/${gameId}/move`, { method: 'POST', body: { playerId, x, y } })
}

export function getGame(gameId) {
  return request(`/game/${gameId}`)
}
