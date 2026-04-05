import http from 'http';

const port = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'ok',
    ts: new Date().toISOString(),
    port,
    node: process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'MISSING',
      ADMIN_API_KEY: process.env.ADMIN_API_KEY ? 'set' : 'MISSING',
      INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET ? 'set' : 'MISSING',
    }
  }));
});

server.listen(port, () => {
  console.log(`Test server running on port ${port}`);
});
