const mongoose = require('mongoose')

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  name: String,
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.models.Player || mongoose.model('Player', playerSchema)
