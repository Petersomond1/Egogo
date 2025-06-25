
import { useState, useCallback, useRef } from 'react';
import upload from './upload';

export const useOptimizedUpload = () => {
  const [uploads, setUploads] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const cancelTokens = useRef(new Map());

  const startUpload = useCallback(async (files, onProgress) => {
    setIsUploading(true);
    const uploadId = Date.now().toString();
    
    try {
      // Create cancel token
      const cancelToken = { cancelled: false };
      cancelTokens.current.set(uploadId, cancelToken);

      // Process files with priority (images first, then audio, then video)
      const prioritizedFiles = files.sort((a, b) => {
        const priority = { img: 1, audio: 2, video: 3 };
        return priority[a.type] - priority[b.type];
      });

      const results = [];
      for (let i = 0; i < prioritizedFiles.length; i++) {
        if (cancelToken.cancelled) break;

        const file = prioritizedFiles[i];
        const progress = (i / prioritizedFiles.length) * 100;
        
        onProgress?.(progress, file.type);
        
        const url = await upload(file.file, (fileProgress) => {
          const totalProgress = progress + (fileProgress / prioritizedFiles.length);
          onProgress?.(totalProgress, file.type);
        });
        
        results.push({ type: file.type, url });
      }

      cancelTokens.current.delete(uploadId);
      return results;
    } catch (error) {
      cancelTokens.current.delete(uploadId);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const cancelUpload = useCallback((uploadId) => {
    const cancelToken = cancelTokens.current.get(uploadId);
    if (cancelToken) {
      cancelToken.cancelled = true;
      cancelTokens.current.delete(uploadId);
    }
  }, []);

  return {
    startUpload,
    cancelUpload,
    isUploading
  };
};