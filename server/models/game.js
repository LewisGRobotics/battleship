const mongoose = require('mongoose')

const shipPositionSchema = new mongoose.Schema(
  {
    x: Number,
    y: Number,
    hit: { type: Boolean, default: false }
  },
  { _id: false }
)

const shipSchema = new mongoose.Schema(
  {
    shipId: String,
    type: String,
    size: Number,
    positions: [shipPositionSchema]
  },
  { _id: false }
)

const playerSlotSchema = new mongoose.Schema(
  {
    playerId: String,
    name: String,
    ships: { type: [shipSchema], default: [] },
    ready: { type: Boolean, default: false }
  },
  { _id: false }
)

const moveSchema = new mongoose.Schema(
  {
    playerId: String,
    x: Number,
    y: Number,
    result: { type: String, enum: ['pending', 'miss', 'hit', 'sunk'], default: 'pending' },
    shipType: { type: String, default: null },
    sunkShipType: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const gameSchema = new mongoose.Schema(
  {
    gameId: { type: String, required: true, unique: true },
    players: [playerSlotSchema],
    moves: { type: [moveSchema], default: [] },
    currentTurn: String,
    winner: String,
    status: {
      type: String,
      enum: ['waiting', 'placing', 'active', 'finished'],
      default: 'waiting'
    }
  },
  { timestamps: true }
)

module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema)
