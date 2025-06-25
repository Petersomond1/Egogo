import { useState } from 'react';

export const useSmartRetry = () => {
  const [retryCount, setRetryCount] = useState(0);

  const retryUpload = async (uploadFunction, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await uploadFunction();
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Upload attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    setRetryCount(0); // Reset on final failure
    throw lastError;
  };

  return { retryUpload, retryCount };
};