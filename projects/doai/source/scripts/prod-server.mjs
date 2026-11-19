/** 静态构建预览：/doai/ 网站和根路径 /api 同源代理。 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import proxy from '../server.js';
const app = express();
app.use('/doai', proxy);
app.use(proxy);
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use('/doai', express.static(dist));
app.get('/doai/*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
app.listen(3210, () => console.log('prod preview on :3210'));
