const multer = require('multer');
const { upload, MAX_SIZE } = require('../middleware/upload');

/**
 * POST /api/uploads/file
 * Single file upload (multipart field "file") for instructor learning materials.
 * Returns a URL that can be stored as a material/file_url, plus metadata.
 */
function uploadFile(req, res) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? `File is too large (max ${Math.round(MAX_SIZE / (1024 * 1024))} MB)`
            : err.code === 'FILE_TYPE_NOT_ALLOWED'
              ? 'This file type is not allowed. Upload PDF, Word, PowerPoint, Excel, images, audio, video or zip files.'
              : err.message || 'Upload failed';
        return res.status(400).json({ error: message });
      }
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Use a multipart field named "file".' });
    }

    res.status(201).json({
      url: `/uploads/materials/${req.file.filename}`,
      original_name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
    });
  });
}

module.exports = { uploadFile };