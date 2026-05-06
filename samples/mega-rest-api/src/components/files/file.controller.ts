import { DolphControllerHandler } from '../../../../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../../../../common';
import { Get, Post, Route, UseMiddleware } from '../../../../../decorators';
import { diskStorage, useFileUploader } from '../../../../../packages';
import { extname } from 'path';
import { FileService } from './file.service';

@Route('/files')
export class FileController extends DolphControllerHandler<Dolph> {
    private FileService: FileService;

    constructor() {
        super();
    }

    @Post('/single')
    @UseMiddleware(
        useFileUploader({
            type: 'single',
            fieldname: 'avatar',
            storage: diskStorage({ destination: './tmp-uploads' }),
            extensions: ['.png', '.jpg', '.jpeg', '.pdf', '.txt'],
        }),
    )
    uploadSingle(req: DRequest, res: DResponse) {
        const file = req.file;
        SuccessResponse({
            res,
            body: this.FileService.save({
                mode: 'single',
                file,
                body: req.body,
                extension: file?.originalname ? extname(file.originalname) : null,
            }),
        });
    }

    @Post('/array')
    @UseMiddleware(
        useFileUploader({
            type: 'array',
            fieldname: 'attachments',
            maxCount: 5,
            storage: diskStorage({ destination: './tmp-uploads' }),
            extensions: ['.png', '.jpg', '.jpeg', '.pdf', '.txt'],
        }),
    )
    uploadArray(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: this.FileService.save({ mode: 'array', files: req.files, body: req.body }) });
    }

    @Post('/fields')
    @UseMiddleware(
        useFileUploader({
            type: 'fields',
            fieldname: 'unused',
            fields: [
                { name: 'avatar', maxCount: 1 },
                { name: 'gallery', maxCount: 4 },
                { name: 'docs', maxCount: 3 },
            ],
            storage: diskStorage({ destination: './tmp-uploads' }),
        }),
    )
    uploadFields(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: this.FileService.save({ mode: 'fields', files: req.files, body: req.body }) });
    }

    @Get('/history')
    history(_req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { uploads: this.FileService.list() } });
    }
}
