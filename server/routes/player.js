const express = require('express')
const Player = require('../models/player')

const router = express.Router()

router.post('/', async (req, res) => {
  const { name, playerId } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Player name is required.' })
  }

  const id = playerId || (await import('nanoid')).nanoid(10)

  const player = await Player.findOneAndUpdate(
    { playerId: id },
    { playerId: id, name },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.json({ playerId: player.playerId, name: player.name })
})

module.exports = router
