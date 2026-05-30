(async () => {
  try {
    const res = await fetch('http://localhost:4000/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'auto-test', name: 'AutoTester' })
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('request failed', err)
    process.exit(1)
  }
})()
