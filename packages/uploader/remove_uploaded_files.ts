export function removeUploadedFiles(uploadedFiles, remove, next) {
  const length = uploadedFiles.length;
  const errors = [];

  if (!length) return next(null, errors);

  function handleFile(idx) {
    const file = uploadedFiles[idx];

    remove(file, function (err) {
      if (err) {
        err.file = file;
        err.field = file.fieldname;
        errors.push(err);
      }

      if (idx < length - 1) {
        handleFile(idx + 1);
      } else {
        next(null, errors);
      }
    });
  }

  handleFile(0);
}
