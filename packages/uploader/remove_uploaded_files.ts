import { FileHandler, FileInfo, FileRemoveCallback } from '../../common/types/dolph_uploader.type';

export function removeUploadedFiles(uploadedFiles: FileInfo[], remove: FileHandler, next: FileRemoveCallback): void {
    const length = uploadedFiles.length;
    const errors: Error[] = [];

    if (!length) {
        return next(null, errors);
    }

    function handleFile(index: number): void {
        const file = uploadedFiles[index];

        remove(file, (err: Error | null) => {
            if (err) {
                const enhancedError = err as Error & { file?: FileInfo; field?: string };
                enhancedError.file = file;
                enhancedError.field = file.fieldname;
                errors.push(enhancedError);
            }

            if (index < length - 1) {
                handleFile(index + 1);
            } else {
                next(null, errors);
            }
        });
    }

    handleFile(0);
}
