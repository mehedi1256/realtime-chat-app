'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineVideoCamera, HiOutlineStop, HiOutlinePlay, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { saveRecording, getAllRecordings, deleteRecording } from '@/utils/recordingsDB';
import { formatMessageTime } from '@/utils/formatTime';

export default function VideoRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  const loadRecordings = async () => {
    const list = await getAllRecordings();
    setRecordings(list.filter((r) => r.type === 'video'));
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        try {
          await saveRecording({ type: 'video', blob, name: `Video ${new Date().toLocaleString()}` });
          toast.success('Video saved');
          loadRecordings();
        } catch (err) {
          toast.error('Failed to save');
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      toast.error('Camera or microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setPlayingId((prev) => (prev === id ? null : prev));
    await deleteRecording(id);
    loadRecordings();
    toast.success('Deleted');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <HiOutlineVideoCamera className="w-5 h-5" />
          Video Recorder
        </h3>
        <div className="flex gap-2 mt-3">
          {!isRecording ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
            >
              <HiOutlineVideoCamera className="w-4 h-4" />
              Start Recording
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
            >
              <HiOutlineStop className="w-4 h-4" />
              Stop & Save
            </motion.button>
          )}
        </div>
        {isRecording && (
          <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Recording...
          </p>
        )}
      </div>
      <div className="p-2 max-h-80 overflow-y-auto">
        {recordings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No video recordings yet.</p>
        ) : (
          <ul className="space-y-2">
            {recordings.map((rec) => (
              <VideoItem
                key={rec.id}
                rec={rec}
                playingId={playingId}
                setPlayingId={setPlayingId}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function VideoItem({ rec, playingId, setPlayingId, onDelete }) {
  const videoRef = useRef(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (rec.blob) {
      const u = URL.createObjectURL(rec.blob);
      setUrl(u);
      return () => {
        URL.revokeObjectURL(u);
        setUrl(null);
      };
    }
  }, [rec.id]);

  const isPlaying = playingId === rec.id;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !url) return;
    if (isPlaying) {
      video.pause();
      video.currentTime = 0;
      setPlayingId(null);
    } else {
      video.src = url;
      video.play();
      setPlayingId(rec.id);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnd = () => setPlayingId(null);
    video.addEventListener('ended', onEnd);
    return () => video.removeEventListener('ended', onEnd);
  }, [rec.id]);

  return (
    <motion.li layout className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={url || undefined}
          className="w-full h-full object-contain"
          playsInline
          muted={false}
          controls={isPlaying}
          controlsList="nodownload"
        />
        {!isPlaying && url && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
          >
            <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
              <HiOutlinePlay className="w-7 h-7 text-gray-800 ml-1" />
            </span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white truncate">{rec.name}</p>
          <p className="text-xs text-gray-500">{formatMessageTime(rec.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={(e) => onDelete(e, rec.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"
          title="Delete"
        >
          <HiOutlineTrash className="w-4 h-4" />
        </button>
      </div>
    </motion.li>
  );
}
