const express = require('express')
const Game = require('../models/game')

let nanoid
async function getNanoid() {
  if (!nanoid) {
    const mod = await import('nanoid')
    nanoid = mod.nanoid
  }
  return nanoid
}

const router = express.Router()

const SHIP_DEFINITIONS = {
  Carrier: 5,
  Battleship: 4,
  Cruiser: 3,
  Submarine: 3,
  Destroyer: 2
}

const VALID_SHIP_TYPES = Object.keys(SHIP_DEFINITIONS)
const GRID_SIZE = 10

const withinBounds = (x, y) => Number.isInteger(x) && x >= 0 && x < GRID_SIZE && Number.isInteger(y) && y >= 0 && y < GRID_SIZE
const coordsKey = (x, y) => `${x},${y}`

async function validatePlacement(ships) {
  if (!Array.isArray(ships) || ships.length !== VALID_SHIP_TYPES.length) {
    throw new Error(`Must place ${VALID_SHIP_TYPES.length} ships.`)
  }

  const used = new Set()

  const nanoidFn = await getNanoid()
  return ships.map((ship) => {
    const { type, positions } = ship
    if (!VALID_SHIP_TYPES.includes(type)) {
      throw new Error(`Invalid ship type: ${type}`)
    }

    const expectedSize = SHIP_DEFINITIONS[type]
    if (!Array.isArray(positions) || positions.length !== expectedSize) {
      throw new Error(`${type} requires ${expectedSize} positions.`)
    }

    const normalized = positions.map((position) => {
      const x = Number(position.x)
      const y = Number(position.y)

      if (!withinBounds(x, y)) {
        throw new Error(`Invalid position for ${type}: (${position.x}, ${position.y})`)
      }

      return { x, y }
    })

    const uniquePositions = new Set(normalized.map(({ x, y }) => coordsKey(x, y)))
    if (uniquePositions.size !== normalized.length) {
      throw new Error(`Duplicate positions inside ${type}.`)
    }

    const sameRow = normalized.every((position) => position.y === normalized[0].y)
    const sameCol = normalized.every((position) => position.x === normalized[0].x)
    if (!sameRow && !sameCol) {
      throw new Error(`${type} must be placed in a straight line.`)
    }

    const sorted = [...normalized].sort((a, b) => (sameRow ? a.x - b.x : a.y - b.y))
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]
      const next = sorted[i]
      if (sameRow && next.x !== prev.x + 1) {
        throw new Error(`${type} positions must be contiguous.`)
      }
      if (sameCol && next.y !== prev.y + 1) {
        throw new Error(`${type} positions must be contiguous.`)
      }
    }

    normalized.forEach((position) => {
      const key = coordsKey(position.x, position.y)
      if (used.has(key)) {
        throw new Error('Ships cannot overlap.')
      }
      used.add(key)
    })

    return {
      shipId: `${type}-${nanoidFn(6)}`,
      type,
      size: expectedSize,
      positions: normalized.map((position) => ({ ...position, hit: false }))
    }
  })
}

function findPlayer(game, playerId) {
  return game.players.find((player) => player.playerId === playerId)
}

function getOpponent(game, playerId) {
  return game.players.find((player) => player.playerId !== playerId)
}

router.post('/', async (req, res) => {
  const { playerId, name } = req.body
  if (!playerId || !name) {
    return res.status(400).json({ error: 'playerId and name are required.' })
  }

  const nanoidFn = await getNanoid()
  const gameId = nanoidFn(8).toUpperCase()
  const game = await Game.create({
    gameId,
    players: [{ playerId, name }],
    currentTurn: playerId,
    status: 'waiting'
  })

  res.json(game)
})

router.get('/:gameId', async (req, res) => {
  const game = await Game.findOne({ gameId: req.params.gameId })
  if (!game) {
    return res.status(404).json({ error: 'Game not found.' })
  }
  res.json(game)
})

router.post('/:gameId/join', async (req, res) => {
  const { playerId, name } = req.body
  if (!playerId || !name) {
    return res.status(400).json({ error: 'playerId and name are required.' })
  }

  const game = await Game.findOne({ gameId: req.params.gameId })
  if (!game) {
    return res.status(404).json({ error: 'Game not found.' })
  }

  const alreadyJoined = game.players.some((player) => player.playerId === playerId)
  if (!alreadyJoined) {
    if (game.players.length >= 2) {
      return res.status(400).json({ error: 'Game already has two players.' })
    }

    game.players.push({ playerId, name, ready: false, ships: [] })
    game.status = 'placing'
    game.currentTurn = game.currentTurn || game.players[0].playerId
    await game.save()
  }

  res.json(game)
})

router.post('/:gameId/place', async (req, res) => {
  const { playerId, ships } = req.body
  if (!playerId || !Array.isArray(ships)) {
    return res.status(400).json({ error: 'playerId and ships are required.' })
  }

  const game = await Game.findOne({ gameId: req.params.gameId })
  if (!game) {
    return res.status(404).json({ error: 'Game not found.' })
  }

  if (game.status === 'finished') {
    return res.status(400).json({ error: 'Game already finished.' })
  }

  if (game.players.length !== 2) {
    return res.status(400).json({ error: 'Both players must join before placing ships.' })
  }

  const player = findPlayer(game, playerId)
  if (!player) {
    return res.status(404).json({ error: 'Player not found in this game.' })
  }

  try {
    const normalizedShips = await validatePlacement(ships)
    player.ships = normalizedShips
    player.ready = true

    if (game.players.every((playerSlot) => playerSlot.ready)) {
      game.status = 'active'
      game.currentTurn = game.currentTurn || game.players[0].playerId
    }

    await game.save()
    res.json(game)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/:gameId/move', async (req, res) => {
  const { playerId, x, y } = req.body
  if (!playerId || x == null || y == null) {
    return res.status(400).json({ error: 'playerId, x and y are required.' })
  }

  const game = await Game.findOne({ gameId: req.params.gameId })
  if (!game) {
    return res.status(404).json({ error: 'Game not found.' })
  }

  if (game.status !== 'active') {
    return res.status(400).json({ error: 'Game is not active.' })
  }

  if (game.currentTurn !== playerId) {
    return res.status(400).json({ error: 'It is not your turn.' })
  }

  const shooter = findPlayer(game, playerId)
  const target = getOpponent(game, playerId)
  if (!shooter || !target) {
    return res.status(400).json({ error: 'Invalid player.' })
  }

  const shotX = Number(x)
  const shotY = Number(y)
  if (!withinBounds(shotX, shotY)) {
    return res.status(400).json({ error: 'Invalid move coordinates.' })
  }

  const shotKey = coordsKey(shotX, shotY)
  const alreadyShot = game.moves.some(
    (move) => move.playerId === playerId && coordsKey(move.x, move.y) === shotKey
  )
  if (alreadyShot) {
    return res.status(400).json({ error: 'You already fired at that coordinate.' })
  }

  let result = 'miss'
  let sunkShipType = null

  for (const ship of target.ships || []) {
    const position = ship.positions.find((pos) => coordsKey(pos.x, pos.y) === shotKey)
    if (position) {
      position.hit = true
      result = ship.positions.every((pos) => pos.hit) ? 'sunk' : 'hit'
      if (result === 'sunk') {
        sunkShipType = ship.type
      }
      break
    }
  }

  game.moves.push({ playerId, x: shotX, y: shotY, result, sunkShipType })

  const opponentStillAlive = (target.ships || []).some((ship) =>
    ship.positions.some((position) => !position.hit)
  )

  if (!opponentStillAlive) {
    game.status = 'finished'
    game.winner = playerId
    game.currentTurn = null
  } else if (result === 'miss') {
    game.currentTurn = target.playerId
  }

  await game.save()
  res.json(game)
})

module.exports = router
