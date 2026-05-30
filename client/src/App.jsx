import { useEffect, useMemo, useState } from 'react'
import { createGame, getGame, joinGame, placeShips, fireMove, registerPlayer } from './api'
import { generateShipPlacements, getBoardsForGame, getPlacementGrid, SHIP_TYPES } from './gameLogic'

const STORAGE_KEY = 'battleship_player'

function App() {
  const [player, setPlayer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [playerName, setPlayerName] = useState('')
  const [gameId, setGameId] = useState('')
  const [game, setGame] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [placementShips, setPlacementShips] = useState([])

  useEffect(() => {
    if (player && gameId) {
      refreshGame()
    }
  }, [player, gameId])

  const savePlayer = async () => {
    if (!playerName.trim()) return
    setStatus('saving')
    try {
      const saved = await registerPlayer({ name: playerName.trim(), playerId: player?.playerId })
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
      setPlayer(saved)
      setPlayerName('')
      setError('')
    } catch (err) {
      setError(err.message || 'Player save failed')
    } finally {
      setStatus('idle')
    }
  }

  const startGame = async () => {
    if (!player) return
    setStatus('creating')
    try {
      const newGame = await createGame(player)
      setGame(newGame)
      setGameId(newGame.gameId)
      setError('')
      setPlacementShips([])
    } catch (err) {
      setError(err.message || 'Create game failed')
    } finally {
      setStatus('idle')
    }
  }

  const joinExistingGame = async () => {
    if (!player || !gameId.trim()) return
    setStatus('joining')
    try {
      const joined = await joinGame(gameId.trim(), player)
      setGame(joined)
      setError('')
      setPlacementShips([])
    } catch (err) {
      setError(err.message || 'Join game failed')
    } finally {
      setStatus('idle')
    }
  }

  const refreshGame = async () => {
    if (!gameId) return
    setStatus('loading')
    try {
      const latest = await getGame(gameId)
      setGame(latest)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to refresh game')
    } finally {
      setStatus('idle')
    }
  }

  const handleAutoPlace = () => {
    setPlacementShips(generateShipPlacements())
    setError('')
  }

  const submitPlacement = async () => {
    if (!player || !game) return
    if (placementShips.length !== SHIP_TYPES.length) {
      setError('Place all ships before submitting.')
      return
    }

    setStatus('placing')
    try {
      const updated = await placeShips(game.gameId, player.playerId, placementShips)
      setGame(updated)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to place ships')
    } finally {
      setStatus('idle')
    }
  }

  const handleFire = async (x, y) => {
    if (!player || !game) return
    if (status !== 'idle') return
    setStatus('firing')
    try {
      const updated = await fireMove(game.gameId, player.playerId, x, y)
      setGame(updated)
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to fire')
    } finally {
      setStatus('idle')
    }
  }

  const currentPlayerId = player?.playerId
  const me = game?.players?.find((p) => p.playerId === currentPlayerId)
  const opponent = game?.players?.find((p) => p.playerId !== currentPlayerId)
  const isYourTurn = game?.status === 'active' && game?.currentTurn === currentPlayerId
  const { ownBoard, enemyBoard } = useMemo(() => getBoardsForGame(game, currentPlayerId), [game, currentPlayerId])
  const placementGrid = useMemo(() => getPlacementGrid(placementShips), [placementShips])
  const playerLabel = player?.name ?? 'Player'

  const renderBoard = (cells, isEnemy = false) => {
    return (
      <div className="board-grid">
        {cells.map((cell, index) => {
          const isClickable = isEnemy && cell.type === 'unknown' && isYourTurn && status === 'idle' && game?.status === 'active'
          return (
            <button
              type="button"
              key={`${cell.x}-${cell.y}`}
              className={`cell cell-${cell.type}${isClickable ? ' cell-current' : ''}`}
              disabled={!isClickable}
              onClick={() => isClickable && handleFire(cell.x, cell.y)}
              title={`(${cell.x + 1}, ${cell.y + 1})`}
            >
              {cell.label}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Battleship</h1>
        <p>Build a turn-based battleship game with ship placement and hit tracking.</p>
      </header>

      {!player ? (
        <section className="card">
          <h2>Who are you?</h2>
          <label>
            Your name
            <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter a player name" />
          </label>
          <button onClick={savePlayer} disabled={status !== 'idle'}>
            Save player
          </button>
        </section>
      ) : (
        <section className="card">
          <h2>Welcome back, {playerLabel}</h2>
          <div className="field-group">
            <label>
              Game ID
              <input value={gameId} onChange={(e) => setGameId(e.target.value)} placeholder="Enter a game ID" />
            </label>
            <button onClick={joinExistingGame} disabled={status !== 'idle'}>
              Join game
            </button>
          </div>
          <div className="divider">or</div>
          <button onClick={startGame} disabled={status !== 'idle'}>
            Create new game
          </button>
        </section>
      )}

      {game && (
        <section className="card game-card">
          <h2>Game {game.gameId}</h2>
          <p>Status: <strong>{game.status}</strong></p>
          <p>Players: {game.players.map((p) => `${p.name}${p.playerId === currentPlayerId ? ' (you)' : ''}`).join(' vs ')}</p>
          {game.status === 'waiting' && <p>Waiting for an opponent to join.</p>}
          {game.status === 'placing' && (
            <div>
              <p>{me?.ready ? 'Waiting for your opponent to place ships.' : 'Place your fleet to begin the battle.'}</p>
              {!me?.ready && (
                <div className="placement-panel">
                  <div className="placement-actions">
                    <button onClick={handleAutoPlace} disabled={status !== 'idle'}>
                      Auto place ships
                    </button>
                    <button onClick={submitPlacement} disabled={status !== 'idle' || placementShips.length !== SHIP_TYPES.length}>
                      Submit placement
                    </button>
                  </div>
                  <div className="ship-list">
                    {SHIP_TYPES.map((ship) => {
                      const placed = placementShips.some((entry) => entry.type === ship.type)
                      return (
                        <div key={ship.type} className="ship-row">
                          <span>{ship.type}</span>
                          <span>{placed ? 'Placed' : `Size ${ship.size}`}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="board-panel">
                    <h3>Your placement</h3>
                    {renderBoard(placementGrid)}
                  </div>
                </div>
              )}
            </div>
          )}

          {game.status === 'active' && (
            <p>{isYourTurn ? 'It is your turn. Fire on the enemy board.' : 'Waiting for opponent turn.'}</p>
          )}

          {game.status === 'finished' && (
            <p>{game.winner === currentPlayerId ? 'You won the game!' : 'You lost. Better luck next time.'}</p>
          )}

          <button onClick={refreshGame} disabled={status !== 'idle'}>
            Refresh game
          </button>

          {(game.status === 'active' || game.status === 'finished') && (
            <div className="boards-row">
              <div className="board-panel">
                <h3>Your fleet</h3>
                {renderBoard(ownBoard)}
              </div>
              <div className="board-panel">
                <h3>Enemy waters</h3>
                {renderBoard(enemyBoard, true)}
              </div>
            </div>
          )}

          {(game.moves || []).length > 0 && (
            <div className="moves-log">
              <h3>Recent moves</h3>
              <ul>
                {[...game.moves].slice(-6).reverse().map((move, index) => {
                  const shooter = game.players.find((p) => p.playerId === move.playerId)
                  const label = shooter ? shooter.name : 'Unknown'
                  const resultText = move.result === 'miss' ? 'missed' : move.result === 'hit' ? 'hit' : 'sunk'
                  return (
                    <li key={`${move.x}-${move.y}-${index}`}>
                      {label} fired at ({move.x + 1}, {move.y + 1}) and {resultText} {move.sunkShipType ? ` ${move.sunkShipType}` : ''}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {error && <div className="error-box">{error}</div>}
    </div>
  )
}

export default App
