import { DolphControllerHandler } from '../../../../../classes';
import {
  Dolph,
  SuccessResponse,
  DRequest,
  DResponse,
  InternalServerErrorException,
  Middleware,
} from '../../../../../common';
import { Get, Post, Route, UseMiddleware } from '../../../../../decorators';
import { diskStorage, fileUploader, useFileUploader } from '../../../../../packages';

// const upload = fileUploader({
//   storage: diskStorage({
//     destination: './uploads',
//     filename: (req, file, cb) => {
//       cb(null, Date.now() + '-' + file.originalname);
//     },
//   }),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
// });

@Route('user')
export class UserController extends DolphControllerHandler<Dolph> {
  constructor() {
    super();
  }

  @Get('greet')
  async greet(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { message: "you've reached the user endpoint." } });
  }

  // Make a wrapper that returns the function : req: DRequest, res: DResponse, next: DNextFunc

  @Post('')
  @UseMiddleware(useFileUploader({ type: 'single' }))
  async post(req: DRequest, res: DResponse) {
    console.log(req.file);
    console.log('Request file and request files');
    console.log(req.files);
    throw new InternalServerErrorException('Here is an error, big time one');
    SuccessResponse({ res, body: req.body });
  }
}
