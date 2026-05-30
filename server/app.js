const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const gameRoutes = require('./routes/game')
const playerRoutes = require('./routes/player')

const app = express()
app.use(express.json())
app.use(cors())

app.use('/api/game', gameRoutes)
app.use('/api/player', playerRoutes)
app.get('/api/health', (req, res) => res.json({ ok: true }))

const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/battleship'

mongoose
  .connect(dbUri)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err))

// Error handler to surface unexpected errors in logs and return JSON
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err)
  res.status(500).json({ error: err && err.message ? err.message : 'Internal server error' })
})

module.exports = app
