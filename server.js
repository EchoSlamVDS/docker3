const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function waitForDb() {
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('DB is ready');
      return;
    } catch (e) {
      console.log('Waiting for DB...', e.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('DB is not available');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.url === '/health') {
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url === '/api/data') {
      const r = await pool.query('SELECT NOW() AS now');
      res.end(JSON.stringify({ ok: true, dbTime: r.rows[0].now }));
      return;
    }

    if (req.url === '/api/items/count') {
      const r = await pool.query('SELECT COUNT(*)::int AS count FROM items');
      res.end(JSON.stringify({ count: r.rows[0].count }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'not found' }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});

waitForDb()
  .then(() => {
    const port = Number(process.env.APP_PORT || 3000);
    server.listen(port, () => console.log(`App listening on ${port}`));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });