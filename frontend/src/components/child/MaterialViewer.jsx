import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { resolveFileUrl, fileSource, typeFromFileName, fileNameFromUrl } from '../../utils/fileUrl';

export default function MaterialViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('viewer'); // viewer, download

  useEffect(() => {
    fetchMaterial();
  }, [id]);

  const fetchMaterial = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/students/materials/${id}`);
      setMaterial(response.data.material);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load material');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!material) return;
    const url = resolveFileUrl(material.file_url);
    const filename = fileNameFromUrl(material.file_url) || material.title;
    
    // For same-origin files, use direct download
    if (material.file_url.startsWith('/uploads/')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For external URLs, open in new tab (browser handles download)
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenInNewTab = () => {
    if (!material) return;
    const url = resolveFileUrl(material.file_url);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium text-lg">Loading material... 📄</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
          <span className="mr-2">←</span> Back
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl">
          <p className="text-red-700 font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </p>
        </div>
      </div>
    );
  }

  if (!material) return null;

  const isUpload = fileSource(material.file_url) === 'upload';
  const type = typeFromFileName(material.file_url);
  const fileUrl = resolveFileUrl(material.file_url);
  const isPDF = type === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(type);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(type);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(type);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
            <span className="mr-2">←</span> Back to Lesson
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${isUpload ? 'bg-green-100' : 'bg-blue-100'}`}>
            <span className="text-3xl">{isPDF ? '📄' : isImage ? '🖼️' : isVideo ? '🎬' : isAudio ? '🎧' : '📎'}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{material.title}</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className={`px-3 py-1 rounded-full ${isUpload ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {isUpload ? '📁 Uploaded File' : '🔗 External Link'}
              </span>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{material.type.toUpperCase()}</span>
              {material.status && <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">{material.status}</span>}
            </div>
          </div>
        </div>

        {material.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-gray-700">{material.description}</p>
          </div>
        )}
      </div>

      {/* Content Viewer */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('viewer')}
              className={`px-4 py-2 rounded-xl font-medium transition ${
                viewMode === 'viewer'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              👁️ View
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl font-medium bg-green-500 text-white hover:bg-green-600 transition"
            >
              ⬇️ Download
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="px-4 py-2 rounded-xl font-medium text-gray-600 hover:bg-gray-200 transition"
            >
              🔗 Open in New Tab
            </button>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{fileNameFromUrl(material.file_url) || 'Unknown file'}</span>
            {isUpload && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Uploaded</span>}
          </div>
        </div>

        {/* Viewer Content */}
        <div className="p-6 min-h-[50vh]">
          {isPDF && (
            <div className="w-full h-[70vh] rounded-xl overflow-hidden shadow-inner bg-gray-100">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                title={material.title}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}

          {isImage && (
            <div className="flex items-center justify-center min-h-[50vh] bg-gray-50 rounded-xl">
              <img
                src={fileUrl}
                alt={material.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center min-h-[50vh] w-full">
                <div className="text-center">
                  <span className="text-4xl block mb-2">🖼️</span>
                  <p className="text-gray-600">Unable to display image</p>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-blue-600 hover:underline">
                    Open in new tab →
                  </a>
                </div>
              </div>
            </div>
          )}

          {isVideo && (
            <div className="w-full rounded-xl overflow-hidden shadow-lg">
              <video
                src={fileUrl}
                controls
                className="w-full"
                poster={material.thumbnail_url}
              />
            </div>
          )}

          {isAudio && (
            <div className="max-w-2xl mx-auto">
              <audio src={fileUrl} controls className="w-full" />
            </div>
          )}

          {!isPDF && !isImage && !isVideo && !isAudio && (
            <div className="text-center py-12">
              <span className="text-6xl block mb-4">📎</span>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Preview not available</h3>
              <p className="text-gray-600 mb-6">This file type cannot be previewed in the browser.</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition"
              >
                <span>🔗</span> Open in New Tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}