'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineMicrophone, HiOutlineStop, HiOutlinePlay, HiOutlineTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { saveRecording, getAllRecordings, deleteRecording } from '@/utils/recordingsDB';
import { formatMessageTime } from '@/utils/formatTime';

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const loadRecordings = async () => {
    const list = await getAllRecordings();
    setRecordings(list.filter((r) => r.type === 'audio'));
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        try {
          await saveRecording({ type: 'audio', blob, name: `Audio ${new Date().toLocaleString()}` });
          toast.success('Audio saved');
          loadRecordings();
        } catch (err) {
          toast.error('Failed to save');
        }
      };

      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied');
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
    await deleteRecording(id);
    loadRecordings();
    toast.success('Deleted');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <HiOutlineMicrophone className="w-5 h-5" />
          Audio Recorder
        </h3>
        <div className="flex gap-2 mt-3">
          {!isRecording ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
            >
              <HiOutlineMicrophone className="w-4 h-4" />
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
      <div className="p-2 max-h-64 overflow-y-auto">
        {recordings.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 p-3">No audio recordings yet.</p>
        ) : (
          <ul className="space-y-1">
            {recordings.map((rec) => (
              <AudioItem
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

function AudioItem({ rec, playingId, setPlayingId, onDelete }) {
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => {
    if (rec.blob) urlRef.current = URL.createObjectURL(rec.blob);
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [rec.id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    const url = urlRef.current;
    if (!audio || !url) return;
    if (playingId === rec.id) {
      audio.pause();
      audio.currentTime = 0;
      setPlayingId(null);
    } else {
      audio.src = url;
      audio.play();
      setPlayingId(rec.id);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnd = () => setPlayingId(null);
    audio.addEventListener('ended', onEnd);
    return () => audio.removeEventListener('ended', onEnd);
  }, [rec.id]);

  return (
    <motion.li
      layout
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
    >
      <audio ref={audioRef} className="hidden" />
      <button
        type="button"
        onClick={togglePlay}
        className="p-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-800"
      >
        <HiOutlinePlay className="w-4 h-4" />
      </button>
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
    </motion.li>
  );
}
