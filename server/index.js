require('dotenv').config()
const app = require('./app')

const port = process.env.PORT || 4000

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Battleship API running on http://localhost:${port}`)
  })
}

module.exports = app
