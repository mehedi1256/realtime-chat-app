'use client';

import { useState } from 'react';
import { HiOutlineDownload, HiOutlineDocument } from 'react-icons/hi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function downloadFromUrl(url, fileName) {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

function downloadFromBlobUrl(blobUrl, fileName) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = fileName || 'download';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function FilePreview({ fileUrl, fileName, fileType, localBlobUrl }) {
  const isLocal = !!localBlobUrl;
  const fullUrl = isLocal ? localBlobUrl : `${API_URL}${fileUrl}`;
  const isImage = fileType?.startsWith('image/');
  const isVideo = fileType?.startsWith('video/');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    try {
      if (isLocal) {
        downloadFromBlobUrl(localBlobUrl, fileName);
      } else {
        await downloadFromUrl(fullUrl, fileName);
      }
    } catch {
      if (!isLocal) window.open(fullUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  if (isImage) {
    return (
      <div className="mt-1 rounded-lg overflow-hidden max-w-xs">
        <img
          src={fullUrl}
          alt={fileName || 'Image'}
          className="w-full h-auto max-h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => (isLocal ? downloadFromBlobUrl(localBlobUrl, fileName) : window.open(fullUrl, '_blank'))}
        />
        {fileName && (
          <p className="text-xs mt-1 opacity-70 truncate">{fileName}</p>
        )}
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="mt-1 rounded-lg overflow-hidden max-w-xs">
        <video
          src={fullUrl}
          controls
          className="w-full max-h-64 rounded-lg"
          preload="metadata"
        />
        {fileName && (
          <p className="text-xs mt-1 opacity-70 truncate">{fileName}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-3 mt-1 p-3 w-full text-left bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors max-w-xs disabled:opacity-60 cursor-pointer"
    >
      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
        <HiOutlineDocument className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{fileName || 'File'}</p>
        <p className="text-xs opacity-60">{fileType || 'Unknown type'}</p>
      </div>
      <HiOutlineDownload className="w-5 h-5 flex-shrink-0 opacity-60" />
    </button>
  );
}
