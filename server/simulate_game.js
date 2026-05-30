(async () => {
  const base = 'http://localhost:4000/api'
  const headers = { 'Content-Type': 'application/json' }

  const reg = async (name, id) => {
    const res = await fetch(`${base}/player`, { method: 'POST', headers, body: JSON.stringify({ name, playerId: id }) })
    return res.json()
  }

  const createGame = async (player) => {
    const res = await fetch(`${base}/game`, { method: 'POST', headers, body: JSON.stringify(player) })
    return res.json()
  }

  const joinGame = async (gameId, player) => {
    const res = await fetch(`${base}/game/${gameId}/join`, { method: 'POST', headers, body: JSON.stringify(player) })
    return res.json()
  }

  const place = async (gameId, playerId, ships) => {
    const res = await fetch(`${base}/game/${gameId}/place`, { method: 'POST', headers, body: JSON.stringify({ playerId, ships }) })
    return res.json()
  }

  const move = async (gameId, playerId, x, y) => {
    const res = await fetch(`${base}/game/${gameId}/move`, { method: 'POST', headers, body: JSON.stringify({ playerId, x, y }) })
    return res.json()
  }

  // simple placements
  const makePlacementsTop = () => ([
    { type: 'Carrier', positions: Array.from({ length: 5 }).map((_, i) => ({ x: i, y: 0 })) },
    { type: 'Battleship', positions: Array.from({ length: 4 }).map((_, i) => ({ x: i, y: 1 })) },
    { type: 'Cruiser', positions: Array.from({ length: 3 }).map((_, i) => ({ x: i, y: 2 })) },
    { type: 'Submarine', positions: Array.from({ length: 3 }).map((_, i) => ({ x: i, y: 3 })) },
    { type: 'Destroyer', positions: Array.from({ length: 2 }).map((_, i) => ({ x: i, y: 4 })) }
  ])

  const makePlacementsBottom = () => ([
    { type: 'Carrier', positions: Array.from({ length: 5 }).map((_, i) => ({ x: 5 + i, y: 9 })) },
    { type: 'Battleship', positions: Array.from({ length: 4 }).map((_, i) => ({ x: 6 + i, y: 8 })) },
    { type: 'Cruiser', positions: Array.from({ length: 3 }).map((_, i) => ({ x: 7 + i, y: 7 })) },
    { type: 'Submarine', positions: Array.from({ length: 3 }).map((_, i) => ({ x: 7 + i, y: 6 })) },
    { type: 'Destroyer', positions: Array.from({ length: 2 }).map((_, i) => ({ x: 8 + i, y: 5 })) }
  ])

  try {
    console.log('Registering players...')
    await reg('Alice', 'p_alice')
    await reg('Bob', 'p_bob')

    console.log('Creating game...')
    const game = await createGame({ playerId: 'p_alice', name: 'Alice' })
    console.log('Game created:', game.gameId)

    console.log('Player Bob joining...')
    await joinGame(game.gameId, { playerId: 'p_bob', name: 'Bob' })

    console.log('Placing ships for Alice...')
    await place(game.gameId, 'p_alice', makePlacementsTop())

    console.log('Placing ships for Bob...')
    await place(game.gameId, 'p_bob', makePlacementsBottom())

    // play sequence: Alice fires to hit Bob's carrier and others
    const shots = [
      { x: 5, y: 9 },
      { x: 6, y: 9 },
      { x: 7, y: 9 },
      { x: 8, y: 9 },
      { x: 9, y: 9 }, // should sink Carrier
      { x: 6, y: 8 },
      { x: 7, y: 8 },
      { x: 8, y: 8 },
      { x: 9, y: 8 }, // sink Battleship
    ]

    let latest = null
    for (const s of shots) {
      latest = await move(game.gameId, 'p_alice', s.x, s.y)
      const lastA = latest?.moves?.slice(-1)[0]
      console.log('Shot by Alice:', s, '->', lastA ? lastA.result : JSON.stringify(latest))

      // now Bob fires at (0,0)
      if (latest.status === 'active') {
        const resp = await move(game.gameId, 'p_bob', 0, 0) // Bob fires at Alice's carrier first cell
        const lastB = resp?.moves?.slice(-1)[0]
        console.log('Shot by Bob: (0,0) ->', lastB ? lastB.result : JSON.stringify(resp))
      } else {
        break
      }
    }

    console.log('Final game state:')
    console.log(JSON.stringify(latest, null, 2))
  } catch (err) {
    console.error('Simulation failed', err)
  }
})()
