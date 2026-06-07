export const GRID_SIZE = 10

export const SHIP_TYPES = [
  { type: 'Carrier', size: 5, count: 2 },
  { type: 'Battleship', size: 4, count: 2 },
  { type: 'Cruiser', size: 3, count: 3 },
  { type: 'Destroyer', size: 2, count: 2 }
]

export const SHIP_PLACEMENT_LIST = SHIP_TYPES.flatMap((ship) =>
  Array.from({ length: ship.count }, () => ({ type: ship.type, size: ship.size }))
)

export const SHIP_COUNTS_BY_TYPE = Object.fromEntries(SHIP_TYPES.map((ship) => [ship.type, ship.count]))
export const TOTAL_SHIP_COUNT = SHIP_PLACEMENT_LIST.length

const coordsKey = (x, y) => `${x},${y}`

const getOrthogonalNeighbors = (x, y) => [
  [x - 1, y],
  [x + 1, y],
  [x, y - 1],
  [x, y + 1]
]

export function generateShipPlacements() {
  const ships = []
  const occupied = new Map()

  for (const shipType of SHIP_PLACEMENT_LIST) {
    let attempt = 0
    while (attempt < 2000) {
      const vertical = Math.random() > 0.5
      const maxX = vertical ? GRID_SIZE - 1 : GRID_SIZE - shipType.size
      const maxY = vertical ? GRID_SIZE - shipType.size : GRID_SIZE - 1

      const x = Math.floor(Math.random() * (maxX + 1))
      const y = Math.floor(Math.random() * (maxY + 1))
      const positions = []
      const adjacencyCounts = new Map()
      let invalidPlacement = false

      for (let step = 0; step < shipType.size; step += 1) {
        const posX = x + (vertical ? 0 : step)
        const posY = y + (vertical ? step : 0)
        const key = coordsKey(posX, posY)
        if (occupied.has(key)) {
          invalidPlacement = true
          break
        }

        getOrthogonalNeighbors(posX, posY).forEach(([nx, ny]) => {
          const neighborKey = coordsKey(nx, ny)
          const neighborShipIndex = occupied.get(neighborKey)
          if (neighborShipIndex != null) {
            const count = adjacencyCounts.get(neighborShipIndex) || 0
            if (count >= 1) {
              invalidPlacement = true
            } else {
              adjacencyCounts.set(neighborShipIndex, count + 1)
            }
          }
        })

        if (invalidPlacement) break
        positions.push({ x: posX, y: posY, hit: false })
      }

      if (!invalidPlacement) {
        positions.forEach((pos) => occupied.set(coordsKey(pos.x, pos.y), ships.length))
        ships.push({ shipId: `${shipType.type}-${Date.now()}-${attempt}`, type: shipType.type, size: shipType.size, positions })
        break
      }
      attempt += 1
    }
  }

  const generatedCounts = ships.reduce((acc, ship) => {
    acc[ship.type] = (acc[ship.type] || 0) + 1
    return acc
  }, {})

  for (const ship of SHIP_TYPES) {
    if (generatedCounts[ship.type] !== ship.count) {
      throw new Error(`generateShipPlacements produced wrong number of ${ship.type} ships.`)
    }
  }

  return ships
}

export function getPlacementGrid(ships) {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE
    const y = Math.floor(index / GRID_SIZE)
    const hasShip = ships.some((ship) => ship.positions.some((pos) => pos.x === x && pos.y === y))
    return {
      x,
      y,
      type: hasShip ? 'ship' : 'water'
    }
  })
}

export function getBoardsForGame(game, playerId) {
  const emptyOwn = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE
    const y = Math.floor(index / GRID_SIZE)
    return { x, y, type: 'water', label: '' }
  })

  const emptyEnemy = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE
    const y = Math.floor(index / GRID_SIZE)
    return { x, y, type: 'unknown', label: '' }
  })

  if (!game || !playerId) {
    return { ownBoard: emptyOwn, enemyBoard: emptyEnemy }
  }

  const me = game.players.find((player) => player.playerId === playerId)
  const opponent = game.players.find((player) => player.playerId !== playerId)

  const shipMap = new Map()
  const sunkOwnPositions = new Set()
  me?.ships?.forEach((ship) => {
    const shipSunk = ship.positions.every((pos) => pos.hit)
    ship.positions.forEach((pos) => {
      shipMap.set(coordsKey(pos.x, pos.y), { ...pos, shipSunk })
      if (shipSunk) {
        sunkOwnPositions.add(coordsKey(pos.x, pos.y))
      }
    })
  })

  const myShots = []
  const opponentShots = new Map()
  const hitShotsByType = {}
  const sunkShotCoordinates = new Set()

  ;(game.moves || []).forEach((move) => {
    const key = coordsKey(move.x, move.y)
    if (move.playerId === playerId) {
      myShots.push({ ...move, key })
      if (move.shipType && move.result === 'hit') {
        hitShotsByType[move.shipType] = hitShotsByType[move.shipType] || []
        hitShotsByType[move.shipType].push(key)
      }
      if (move.shipType && move.result === 'sunk') {
        hitShotsByType[move.shipType] = hitShotsByType[move.shipType] || []
        hitShotsByType[move.shipType].forEach((shotKey) => {
          sunkShotCoordinates.add(shotKey)
        })
        sunkShotCoordinates.add(key)
        hitShotsByType[move.shipType] = []
      }
    } else {
      opponentShots.set(key, move)
    }
  })

  const ownBoard = emptyOwn.map((cell) => {
    const key = coordsKey(cell.x, cell.y)
    const shipPos = shipMap.get(key)
    const opponentShot = opponentShots.get(key)

    if (shipPos) {
      if (sunkOwnPositions.has(key)) {
        return { ...cell, type: 'hit', label: '💀' }
      }
      if (shipPos.hit) {
        return { ...cell, type: 'hit', label: '💥' }
      }
      return { ...cell, type: 'ship', label: '⛵' }
    }

    if (opponentShot) {
      return { ...cell, type: 'miss', label: '•' }
    }

    return cell
  })

  const enemyBoard = emptyEnemy.map((cell) => {
    const key = coordsKey(cell.x, cell.y)
    const shot = myShots.find((move) => move.key === key)
    if (!shot) return cell

    if (shot.result === 'miss') {
      return { ...cell, type: 'miss', label: '•' }
    }

    if (sunkShotCoordinates.has(key)) {
      return { ...cell, type: 'hit', label: '💀' }
    }

    return { ...cell, type: 'hit', label: '🔥' }
  })

  return { ownBoard, enemyBoard }
}
