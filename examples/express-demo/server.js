import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import { mountMnexiumRoutes } from '@mnexium/chat/server';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Serve the browser bundle from the npm package
app.get('/mnexium-chat.js', (req, res) => {
  res.sendFile(require.resolve('@mnexium/chat/browser'));
});

// Mount Mnexium routes at /api/mnx
mountMnexiumRoutes(app, '/api/mnx', {
  cookiePrefix: 'mnx',
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Express server running at http://localhost:${PORT}`);
});
