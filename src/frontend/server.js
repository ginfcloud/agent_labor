import { createServer } from 'https';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { handler } from './build/handler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir = join(__dirname, 'certs');

const PORT = process.env.PORT || 443;

const server = createServer(
    {
        key: readFileSync(join(certsDir, 'file.key')),
        cert: readFileSync(join(certsDir, 'file.cert')),
        ca: readFileSync(join(certsDir, 'file.ca-bundle')),
    },
    handler
);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Frontend] HTTPS server running on https://0.0.0.0:${PORT}`);
});
