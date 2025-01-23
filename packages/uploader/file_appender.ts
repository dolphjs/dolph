import { DRequest } from '../../common';
import { FileInfo, FileStrategy } from '../../common/types/dolph_uploader.type';

function arrayRemove<T>(arr: T[], item: T): void {
  const index = arr.indexOf(item);
  if (index !== -1) arr.splice(index, 1);
}

export class FileAppender {
  constructor(private strategy: FileStrategy, private request: DRequest) {
    switch (strategy) {
      case 'ARRAY':
        this.request.files = [];
        break;
      case 'OBJECT':
        this.request.files = Object.create(null);
        break;
    }
  }

  insertPlaceholder(file: FileInfo): Partial<FileInfo> {
    const placeholder = { fieldname: file.fieldname };

    switch (this.strategy) {
      case 'ARRAY':
        (this.request.files as FileInfo[]).push(placeholder as FileInfo);
        break;
      case 'OBJECT':
        const files = this.request.files as Record<string, FileInfo[]>;
        if (files[file.fieldname]) {
          files[file.fieldname].push(placeholder as FileInfo);
        } else {
          files[file.fieldname] = [placeholder as FileInfo];
        }
        break;
    }

    return placeholder;
  }

  removePlaceholder(placeholder: Partial<FileInfo>): void {
    switch (this.strategy) {
      case 'ARRAY':
        const files = this.request.files as FileInfo[];
        arrayRemove(files, placeholder);
        break;
      case 'OBJECT':
        const filesObj = this.request.files as Record<string, FileInfo[]>;
        if (filesObj[placeholder.fieldname!].length === 1) {
          delete filesObj[placeholder.fieldname!];
        } else {
          arrayRemove(filesObj[placeholder.fieldname!], placeholder);
        }
        break;
    }
  }

  replacePlaceholder(placeholder: Partial<FileInfo>, file: FileInfo): void {
    if (this.strategy === 'VALUE') {
      this.request.file = file;
      return;
    }

    delete placeholder.fieldname;
    Object.assign(placeholder, file);
  }
}
