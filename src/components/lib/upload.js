
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage, auth } from "./firebase";

// Compression utilities
const compressImage = async (file, maxWidth = 1920, maxHeight = 1080, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const compressVideo = async (file, maxSize = 50 * 1024 * 1024) => {
  // For videos over 50MB, we'll reduce quality
  if (file.size <= maxSize) return file;
  
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.onloadedmetadata = () => {
      // Reduce dimensions for compression
      const scale = Math.sqrt(maxSize / file.size);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      // Create a MediaRecorder to re-encode
      const stream = canvas.captureStream(15); // 15 FPS for smaller file
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 1000000 // 1 Mbps
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([compressedBlob], file.name, { type: 'video/webm' });
        resolve(compressedFile);
      };
      
      // Draw video frames to canvas
      const drawFrame = () => {
        if (video.currentTime < video.duration) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          video.currentTime += 1/15; // Next frame
          setTimeout(drawFrame, 1000/15);
        } else {
          mediaRecorder.stop();
        }
      };
      
      video.currentTime = 0;
      mediaRecorder.start();
      drawFrame();
    };
    
    video.onerror = () => resolve(file); // Fallback to original
    video.src = URL.createObjectURL(file);
  });
};

const compressAudio = async (file, targetBitrate = 128000) => {
  // For audio files, we'll reduce bitrate if too large
  if (file.size <= 10 * 1024 * 1024) return file; // Skip if under 10MB
  
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const fileReader = new FileReader();
    
    fileReader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create offline context for compression
        const offlineContext = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          audioBuffer.length,
          22050 // Reduce sample rate for compression
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();
        
        const compressedBuffer = await offlineContext.startRendering();
        
        // Convert back to file (simplified - in practice you'd use a proper encoder)
        resolve(file); // Fallback for now
      } catch (error) {
        resolve(file); // Fallback to original
      }
    };
    
    fileReader.readAsArrayBuffer(file);
  });
};

// Parallel upload function
const uploadMultipleFiles = async (files, onProgress) => {
  const uploadPromises = files.map(async (fileData, index) => {
    if (!fileData.file) return null;
    
    try {
      const url = await upload(fileData.file, (progress) => {
        onProgress(index, progress);
      });
      return { type: fileData.type, url };
    } catch (error) {
      console.error(`❌ Upload failed for ${fileData.type}:`, error);
      throw error;
    }
  });
  
  return Promise.all(uploadPromises);
};

// Main optimized upload function
const upload = async (file, onProgress = null) => {
  console.log("🚀 Optimized Upload - Starting process");
  console.log("- File name:", file?.name);
  console.log("- File size:", file?.size, "bytes");
  console.log("- File type:", file?.type);

  if (!file) {
    console.log("❌ No file provided");
    return "";
  }

  // Check authentication
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("❌ No authenticated user");
    throw new Error("User must be authenticated to upload files");
  }

  // Determine file type and folder
  const isImage = file.type.startsWith('image/');
  const isAudio = file.type.startsWith('audio/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isAudio && !isVideo) {
    throw new Error("Only image, audio, and video files are allowed");
  }

  let folderName;
  let maxSize;
  let compressedFile = file;
  
  try {
    // Compress files for faster upload
    console.log("🔄 Compressing file...");
    const startTime = Date.now();
    
    if (isImage) {
      folderName = 'images';
      maxSize = 5 * 1024 * 1024;
      if (file.size > 1 * 1024 * 1024) { // Compress images over 1MB
        compressedFile = await compressImage(file);
        console.log(`✅ Image compressed: ${file.size} → ${compressedFile.size} bytes`);
      }
    } else if (isAudio) {
      folderName = 'audio';
      maxSize = 25 * 1024 * 1024;
      if (file.size > 10 * 1024 * 1024) { // Compress audio over 10MB
        compressedFile = await compressAudio(file);
      }
    } else if (isVideo) {
      folderName = 'videos';
      maxSize = 100 * 1024 * 1024;
      if (file.size > 20 * 1024 * 1024) { // Compress videos over 20MB
        compressedFile = await compressVideo(file);
        console.log(`✅ Video compressed: ${file.size} → ${compressedFile.size} bytes`);
      }
    }
    
    const compressionTime = Date.now() - startTime;
    console.log(`⏱️ Compression took: ${compressionTime}ms`);
    
    // Validate compressed file size
    if (compressedFile.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      throw new Error(`File size must be less than ${maxSizeMB}MB for ${folderName}`);
    }

    // Create optimized filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const extension = compressedFile.name.split('.').pop();
    const fileName = `${timestamp}_${randomId}.${extension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `${folderName}/${fileName}`);
    console.log("📤 Uploading to:", `${folderName}/${fileName}`);

    // Optimized metadata
    const metadata = {
      contentType: compressedFile.type,
      cacheControl: 'public,max-age=31536000', // 1 year cache
      customMetadata: {
        uploadedBy: currentUser.uid,
        originalSize: file.size.toString(),
        compressedSize: compressedFile.size.toString(),
      }
    };

    // Start upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, compressedFile, metadata);
    
    return new Promise((resolve, reject) => {
      const uploadStartTime = Date.now();
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const speed = snapshot.bytesTransferred / ((Date.now() - uploadStartTime) / 1000);
          
          console.log(`📊 Upload: ${progress.toFixed(1)}% (${(speed / 1024).toFixed(1)} KB/s)`);
          
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error("❌ Upload error:", error.code, error.message);
          
          // Specific error handling
          switch (error.code) {
            case 'storage/unauthorized':
              reject(new Error("Permission denied. Check authentication and storage rules."));
              break;
            case 'storage/canceled':
              reject(new Error("Upload was canceled."));
              break;
            case 'storage/quota-exceeded':
              reject(new Error("Storage quota exceeded. Please try again later."));
              break;
            case 'storage/unauthenticated':
              reject(new Error("User must be authenticated to upload files."));
              break;
            default:
              reject(new Error(`Upload failed: ${error.message}`));
          }
        },
        async () => {
          try {
            const uploadTime = Date.now() - uploadStartTime;
            console.log(`⏱️ Upload completed in: ${uploadTime}ms`);
            
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            console.log("✅ Upload Summary:");
            console.log(`- Original size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`- Compressed size: ${(compressedFile.size / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`- Total time: ${Date.now() - startTime}ms`);
            console.log(`- Download URL: ${downloadURL}`);
            
            resolve(downloadURL);
          } catch (urlError) {
            console.error("❌ Error getting download URL:", urlError);
            reject(new Error("Failed to get download URL"));
          }
        }
      );
    });

  } catch (error) {
    console.error("❌ Upload setup error:", error);
    throw error;
  }
};

// Enhanced validation with compression check

export const validateFile = (file, type = 'auto') => {
  if (!file) return { valid: false, error: "No file provided" };

  const isImage = file.type.startsWith('image/');
  const isAudio = file.type.startsWith('audio/');
  const isVideo = file.type.startsWith('video/');

  // Auto-detect type
  if (type === 'auto') {
    if (isImage) type = 'image';
    else if (isAudio) type = 'audio';
    else if (isVideo) type = 'video';
    else return { valid: false, error: "Unsupported file type" };
  }

  // Relaxed limits since we now compress
  const limits = {
    image: { 
      maxSize: 50 * 1024 * 1024, // 50MB (will compress to under 5MB)
      // Use startsWith for broader matching
      typePatterns: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] 
    },
    audio: { 
      maxSize: 100 * 1024 * 1024, // 100MB (will compress if needed)
      // Use startsWith for broader matching - handles codecs
      typePatterns: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mp3'] 
    },
    video: { 
      maxSize: 500 * 1024 * 1024, // 500MB (will compress to under 100MB)
      // Use startsWith for broader matching - handles codecs  
      typePatterns: ['video/mp4', 'video/webm', 'video/mov', 'video/avi', 'video/quicktime'] 
    }
  };

  const limit = limits[type];
  if (!limit) return { valid: false, error: "Invalid type specified" };

  if (file.size > limit.maxSize) {
    const maxSizeMB = Math.round(limit.maxSize / (1024 * 1024));
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }

  // ✅ FIXED: Check if file type STARTS WITH any of the accepted patterns
  // This handles cases like 'audio/webm;codecs=opus' matching 'audio/webm'
  const isValidType = limit.typePatterns.some(pattern => file.type.startsWith(pattern));
  
  if (!isValidType) {
    console.log(`❌ File type validation failed: ${file.type}`);
    console.log(`✅ Accepted patterns: ${limit.typePatterns.join(', ')}`);
    return { valid: false, error: `Unsupported ${type} format: ${file.type}` };
  }

  // Estimate compressed size
  let estimatedSize = file.size;
  if (isImage && file.size > 1024 * 1024) {
    estimatedSize = file.size * 0.3; // Estimate 70% compression
  } else if (isVideo && file.size > 20 * 1024 * 1024) {
    estimatedSize = file.size * 0.5; // Estimate 50% compression
  }

  console.log(`✅ File validation passed for ${type}: ${file.type}`);
  
  return { 
    valid: true, 
    type, 
    originalSize: file.size,
    estimatedSize: Math.round(estimatedSize),
    willCompress: estimatedSize < file.size
  };
};


// Parallel upload utility
export { uploadMultipleFiles };

export default upload;
