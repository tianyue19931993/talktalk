const http = require('http');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');
const port = +((process.argv[2] || '').replace('--port=', '')) || 8080;

const mime = {
  '.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.json':'application/json',
};

const indexHtml = fs.readFileSync(path.join(dist, 'index.html'));

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';
  let filePath = path.join(dist, url);
  
  try {
    if (fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
      return res.end(fs.readFileSync(filePath));
    }
  } catch(e) {}
  
  // SPA fallback
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(indexHtml);
}).listen(port, '0.0.0.0', () => {
  console.log('TalkTalk running at:');
  console.log(`  http://localhost:${port}/`);
  console.log(`  http://localhost:${port}/admin`);
  console.log(`  http://192.168.1.81:${port}/`);
  console.log('按 Ctrl+C 停止');
});
