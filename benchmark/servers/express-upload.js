'use strict';

const path = require('path');
const express = require('express');

// In pnpm strict mode multer is not directly accessible — resolve from the
// pnpm virtual store where it lives as a transitive dep of @nestjs/platform-express.
let multer;
try {
    multer = require('multer');
} catch {
    // Walk the pnpm store to find the multer package folder
    const storeDir = path.join(__dirname, '..', 'node_modules', '.pnpm');
    const fs = require('fs');
    const multerEntry = fs.readdirSync(storeDir).find((d) => d.startsWith('multer@'));
    if (!multerEntry) throw new Error('multer not found in pnpm store — run pnpm install in benchmark/');
    multer = require(path.join(storeDir, multerEntry, 'node_modules', 'multer'));
}

const app = express();
const port = parseInt(process.env.PORT || '4007');

const upload = multer({ storage: multer.memoryStorage() });

app.get('/ping', (_req, res) => {
    res.json({ message: 'pong' });
});

app.post('/upload/single', upload.single('file'), (req, res) => {
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: 'No file received' });
    }
    res.json({
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
    });
});

app.listen(port, () => {
    if (process.send) process.send('ready');
});
