import { useState, useCallback } from 'react';

export const useUploadPerformance = () => {
  const [performanceData, setPerformanceData] = useState({
    averageSpeed: 0,
    successRate: 0,
    totalUploads: 0,
    totalSuccessful: 0,
    recentUploads: []
  });

  const recordUpload = useCallback((uploadResult) => {
    setPerformanceData(prev => {
      const newTotal = prev.totalUploads + 1;
      const newSuccessful = uploadResult.success ? prev.totalSuccessful + 1 : prev.totalSuccessful;
      const newSuccessRate = newSuccessful / newTotal;
      
      const newAverageSpeed = uploadResult.success
        ? (prev.averageSpeed * prev.totalUploads + uploadResult.speed) / newTotal
        : prev.averageSpeed;

      // Keep only last 10 uploads for recent performance tracking
      const newRecentUploads = [
        ...prev.recentUploads.slice(-9),
        {
          timestamp: Date.now(),
          speed: uploadResult.speed,
          success: uploadResult.success,
          originalSize: uploadResult.originalSize,
          compressedSize: uploadResult.compressedSize
        }
      ];

      return {
        averageSpeed: newAverageSpeed,
        successRate: newSuccessRate,
        totalUploads: newTotal,
        totalSuccessful: newSuccessful,
        recentUploads: newRecentUploads
      };
    });
  }, []);

  const getRecentPerformance = useCallback(() => {
    const recentSuccessful = performanceData.recentUploads.filter(u => u.success).length;
    const recentSuccessRate = performanceData.recentUploads.length > 0 
      ? recentSuccessful / performanceData.recentUploads.length 
      : 0;
    
    const recentAverageSpeed = performanceData.recentUploads.length > 0
      ? performanceData.recentUploads
          .filter(u => u.success)
          .reduce((acc, u) => acc + u.speed, 0) / recentSuccessful || 0
      : 0;

    return {
      recentSuccessRate,
      recentAverageSpeed,
      recentUploadsCount: performanceData.recentUploads.length
    };
  }, [performanceData.recentUploads]);

  return { recordUpload, performanceData, getRecentPerformance };
};