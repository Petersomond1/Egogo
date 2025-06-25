const compressionWorkerCode = `
self.onmessage = function(e) {
  const { file, type, options } = e.data;
  
  if (type === 'image') {
    compressImageInWorker(file, options).then(result => {
      self.postMessage({ success: true, file: result });
    }).catch(error => {
      self.postMessage({ success: false, error: error.message });
    });
  } else if (type === 'video') {
    // For now, just pass through - video compression is more complex
    self.postMessage({ success: true, file: file });
  } else {
    // Audio or other types - pass through
    self.postMessage({ success: true, file: file });
  }
};

function compressImageInWorker(file, options) {
  return new Promise((resolve, reject) => {
    try {
      createImageBitmap(file).then(bitmap => {
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions
        const scale = Math.min(
          options.maxWidth / bitmap.width, 
          options.maxHeight / bitmap.height, 
          1
        );
        
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        
        // Draw and compress
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        
        canvas.convertToBlob({
          type: 'image/jpeg',
          quality: options.quality || 0.8
        }).then(resolve).catch(reject);
      }).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}
`;

export const createCompressionWorker = () => {
  try {
    const blob = new Blob([compressionWorkerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  } catch (error) {
    console.warn('Web Workers not supported, falling back to main thread compression');
    return null;
  }
};

// Helper function to compress image on main thread if worker fails
export const compressImageMainThread = (file, options) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      const scale = Math.min(
        options.maxWidth / img.width,
        options.maxHeight / img.height,
        1
      );
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve, 'image/jpeg', options.quality || 0.8);
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};


