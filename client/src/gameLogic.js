export const GRID_SIZE = 10

export const SHIP_TYPES = [
  { type: 'Carrier', size: 5 },
  { type: 'Battleship', size: 4 },
  { type: 'Cruiser', size: 3 },
  { type: 'Submarine', size: 3 },
  { type: 'Destroyer', size: 2 }
]

const coordsKey = (x, y) => `${x},${y}`

const getOrthogonalNeighbors = (x, y) => [
  [x - 1, y],
  [x + 1, y],
  [x, y - 1],
  [x, y + 1]
]

export function generateShipPlacements() {
  const ships = []
  const occupied = new Set()
  const forbidden = new Set()

  for (const shipType of SHIP_TYPES) {
    let attempt = 0
    while (attempt < 2000) {
      const vertical = Math.random() > 0.5
      const maxX = vertical ? GRID_SIZE - 1 : GRID_SIZE - shipType.size
      const maxY = vertical ? GRID_SIZE - shipType.size : GRID_SIZE - 1

      const x = Math.floor(Math.random() * (maxX + 1))
      const y = Math.floor(Math.random() * (maxY + 1))
      const positions = []
      let overlap = false

      for (let step = 0; step < shipType.size; step += 1) {
        const posX = x + (vertical ? 0 : step)
        const posY = y + (vertical ? step : 0)
        const key = coordsKey(posX, posY)
        if (occupied.has(key) || forbidden.has(key)) {
          overlap = true
          break
        }
        positions.push({ x: posX, y: posY, hit: false })
      }

      if (!overlap) {
        positions.forEach((pos) => occupied.add(coordsKey(pos.x, pos.y)))
        positions.forEach((pos) => {
          getOrthogonalNeighbors(pos.x, pos.y).forEach(([nx, ny]) => {
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              forbidden.add(coordsKey(nx, ny))
            }
          })
        })
        ships.push({ shipId: `${shipType.type}-${Date.now()}-${attempt}`, type: shipType.type, size: shipType.size, positions })
        break
      }
      attempt += 1
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
  me?.ships?.forEach((ship) => {
    ship.positions.forEach((pos) => {
      shipMap.set(coordsKey(pos.x, pos.y), pos)
    })
  })

  const myShots = new Map()
  const opponentShots = new Map()

  ;(game.moves || []).forEach((move) => {
    const key = coordsKey(move.x, move.y)
    if (move.playerId === playerId) {
      myShots.set(key, move)
    } else {
      opponentShots.set(key, move)
    }
  })

  const ownBoard = emptyOwn.map((cell) => {
    const key = coordsKey(cell.x, cell.y)
    const shipPos = shipMap.get(key)
    const opponentShot = opponentShots.get(key)

    if (shipPos) {
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
    const shot = myShots.get(key)
    if (!shot) return cell

    if (shot.result === 'miss') {
      return { ...cell, type: 'miss', label: '•' }
    }

    return { ...cell, type: 'hit', label: '🔥' }
  })

  return { ownBoard, enemyBoard }
}
