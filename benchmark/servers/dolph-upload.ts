import express from 'express';
import { fileUploader, memoryStorage } from '../../packages/uploader/file_uploader';

const app = express();
const port = parseInt(process.env.PORT || '4006');

const storage = memoryStorage();

const upload = fileUploader({
    type: 'single',
    fieldname: 'file',
    storage,
}) as express.RequestHandler;

app.get('/ping', (_req, res) => {
    res.json({ message: 'pong' });
});

app.post('/upload/single', upload, (req: any, res: any) => {
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
