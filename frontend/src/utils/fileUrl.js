const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

export function resolveFileUrl(fileUrl) {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('/uploads/')) return `${API_ORIGIN}${fileUrl}`;
  return fileUrl;
}

export function fileSource(fileUrl) {
  return fileUrl && fileUrl.startsWith('/uploads/') ? 'upload' : 'link';
}

const EXT_TYPE = {
  pdf: 'pdf',
  doc: 'document', docx: 'document', rtf: 'document', txt: 'document',
  ppt: 'presentation', pptx: 'presentation',
  xls: 'document', xlsx: 'document', csv: 'document',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', svg: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio',
  mp4: 'video', webm: 'video', mov: 'video',
  zip: 'document',
};

export function typeFromFileName(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  return EXT_TYPE[ext] || 'document';
}

export function fileNameFromUrl(fileUrl) {
  if (!fileUrl) return '';
  const parts = fileUrl.split('/');
  return parts[parts.length - 1] || '';
}