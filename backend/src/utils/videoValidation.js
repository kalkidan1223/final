const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;
const HTTP_PREFIX_RE = /^https?:\/\//i;

/**
 * Validates a video URL. Accepts YouTube (watch/embed/shorts/youtu.be),
 * Vimeo links, and any absolute http(s):// link (for direct video files).
 * Returns { valid: boolean, reason?: string, embed_url?: string }.
 */
function isValidVideoUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return { valid: false, reason: 'URL is required' };
  }
  const trimmed = url.trim();

  const yt = trimmed.match(YOUTUBE_RE);
  if (yt) {
    return { valid: true, embed_url: `https://www.youtube.com/embed/${yt[1]}` };
  }

  const vm = trimmed.match(VIMEO_RE);
  if (vm) {
    return { valid: true, embed_url: `https://player.vimeo.com/video/${vm[1]}` };
  }

  if (!HTTP_PREFIX_RE.test(trimmed)) {
    return { valid: false, reason: 'Only YouTube, Vimeo or direct https video URLs are allowed' };
  }

  return { valid: true };
}

module.exports = { isValidVideoUrl };