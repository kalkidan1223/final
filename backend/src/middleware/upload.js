const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const MATERIAL_DIR = path.join(UPLOAD_ROOT, 'materials');

fs.mkdirSync(MATERIAL_DIR, { recursive: true });

// Whitelisted mime types → extension. Documents, presentations, spreadsheets,
// images, audio, video and zips, covering the material types instructors add.
const ALLOWED_MIME = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/rtf': '.rtf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip',
};

const MAX_SIZE = 100 * 1024 * 1024; // 100 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MATERIAL_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME[file.mimetype]) return cb(null, true);
  cb(
    Object.assign(new multer.MulterError('FILE_TYPE_NOT_ALLOWED'), {
      message: `File type "${file.mimetype}" is not allowed`,
    })
  );
};

const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter });

/**
 * Middleware: parse an OPTIONAL multipart file (default field "file") plus any
 * text fields. Requests that are not multipart (e.g. application/json) pass
 * straight through untouched, so it is safe to attach to routes that accept
 * both JSON and FormData bodies.
 *
 * Without this, a FormData body arrives with an empty req.body on a route that
 * has no multipart parser, silently dropping the child's typed answer.
 */
function parseMultipartFile(field = 'file') {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `File is too large (max ${Math.round(MAX_SIZE / (1024 * 1024))} MB)`
          : err.code === 'FILE_TYPE_NOT_ALLOWED'
            ? 'This file type is not allowed. Upload PDF, image, audio, video or zip files.'
            : err.message || 'Upload failed';
      return res.status(400).json({ error: message });
    });
  };
}

module.exports = { upload, parseMultipartFile, UPLOAD_ROOT, MATERIAL_DIR, MAX_SIZE };