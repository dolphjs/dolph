import { Component } from '../../../../../decorators';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Component({ controllers: [FileController], services: [FileService] })
export class FileComponent {}
