// src/components/lib/upload.js
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage, auth } from "./firebase";

const upload = async (file) => {
    console.log("🔍 Upload Debug - Starting upload process");
    console.log("- File object:", file);
    console.log("- File name:", file?.name);
    console.log("- File size:", file?.size);
    console.log("- File type:", file?.type);

    if (!file) {
        console.log("❌ No file provided to upload function");
        return "";
    }

    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error("❌ No authenticated user found");
        throw new Error("User must be authenticated to upload files");
    }

    console.log("👤 Current user:", currentUser.uid);

    // Validate file type - now supports images, audio, and video
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isAudio && !isVideo) {
        console.error("❌ Invalid file type:", file.type);
        throw new Error("Only image, audio, and video files are allowed");
    }

    // Set file size limits based on type
    let maxSize;
    let folderName;
    
    if (isImage) {
        maxSize = 5 * 1024 * 1024; // 5MB for images
        folderName = 'images';
    } else if (isAudio) {
        maxSize = 100 * 1024 * 1024; // 100MB for audio (matching your Firebase rules)
        folderName = 'audio';
    } else if (isVideo) {
        maxSize = 150 * 1024 * 1024; // 150MB for video (matching your Firebase rules)
        folderName = 'videos';
    }

    // Validate file size
    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        console.error("❌ File too large:", file.size);
        throw new Error(`File size must be less than ${maxSizeMB}MB for ${folderName}`);
    }

    try {
        // Create unique filename with timestamp
        const date = new Date().getTime().toString();
        const fileName = `${date}_${file.name}`;
        console.log("🔍 Generated filename:", fileName);

        // Create storage reference with proper path based on file type
        const storageRef = ref(storage, `${folderName}/${fileName}`);
        console.log("🔍 Storage reference created:", storageRef.fullPath);
        console.log("📤 Starting upload to:", `${folderName}/${fileName}`);

        // Create upload task with metadata
        const metadata = {
            contentType: file.type,
            cacheControl: 'public,max-age=3600',
            customMetadata: {
                uploadedBy: currentUser.uid,
                uploadTimestamp: date,
                originalName: file.name
            }
        };
        console.log("🔍 Upload metadata:", metadata);

        // Start upload with progress monitoring
        console.log("📤 Starting file upload...");
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        // Use Promise-based approach with progress monitoring
        return new Promise((resolve, reject) => {
            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`📊 Upload progress: ${progress.toFixed(2)}%`);
                    console.log(`📊 Bytes transferred: ${snapshot.bytesTransferred}/${snapshot.totalBytes}`);
                    
                    // Optional: You can emit progress events here for UI updates
                    // window.dispatchEvent(new CustomEvent('uploadProgress', { 
                    //     detail: { progress, fileName: file.name } 
                    // }));
                },
                (error) => {
                    console.error("❌ Upload failed:");
                    console.error("- Error code:", error.code);
                    console.error("- Error message:", error.message);
                    console.error("- Full error:", error);
                    
                    // Provide specific error messages
                    if (error.code === 'storage/unauthorized') {
                        console.error("❌ Storage unauthorized - check Firebase Storage rules");
                        reject(new Error("Permission denied. Check your authentication and storage rules."));
                    } else if (error.code === 'storage/canceled') {
                        console.error("❌ Upload canceled");
                        reject(new Error("Upload was canceled."));
                    } else if (error.code === 'storage/unknown') {
                        console.error("❌ Unknown storage error");
                        reject(new Error("Unknown error occurred during upload."));
                    } else if (error.code === 'storage/quota-exceeded') {
                        console.error("❌ Storage quota exceeded");
                        reject(new Error("Storage quota exceeded. Please try again later."));
                    } else if (error.code === 'storage/unauthenticated') {
                        console.error("❌ User unauthenticated");
                        reject(new Error("User must be authenticated to upload files."));
                    } else {
                        reject(new Error(`Upload failed: ${error.message}`));
                    }
                },
                async () => {
                    try {
                        console.log("✅ Upload completed successfully");
                        console.log("🔗 Getting download URL...");
                        
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        console.log("✅ Download URL retrieved:", downloadURL);
                        
                        // Validate URL format
                        if (!downloadURL.includes('firebasestorage.googleapis.com')) {
                            console.log("❌ Invalid URL format received:", downloadURL);
                            reject(new Error("Invalid download URL format"));
                            return;
                        }

                        // Test URL accessibility for smaller files only (to avoid unnecessary bandwidth)
                        if (file.size < 10 * 1024 * 1024) { // Only test files smaller than 10MB
                            try {
                                // Skip the URL test since it might fail due to CORS, not actual accessibility
                                console.log("🔍 Skipping URL accessibility test to avoid CORS issues");
                            } catch (testError) {
                                console.log("⚠️ URL test failed (might be CORS):", testError.message);
                            }
                        }

                        // Log successful upload details
                        console.log("📊 Upload Summary:");
                        console.log(`- File type: ${isImage ? 'Image' : isAudio ? 'Audio' : 'Video'}`);
                        console.log(`- File size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`);
                        console.log(`- Storage path: ${folderName}/${fileName}`);
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
        console.error("- Error code:", error.code);
        console.error("- Error message:", error.message);
        throw error; // Re-throw to handle in calling component
    }
};

// Helper function to validate file before upload
export const validateFile = (file, type = 'auto') => {
    if (!file) return { valid: false, error: "No file provided" };

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    // Auto-detect type if not specified
    if (type === 'auto') {
        if (isImage) type = 'image';
        else if (isAudio) type = 'audio';
        else if (isVideo) type = 'video';
        else return { valid: false, error: "Unsupported file type" };
    }

    // Type-specific validations
    const limits = {
        image: { maxSize: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] },
        audio: { maxSize: 25 * 1024 * 1024, types: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/ogg'] },
        video: { maxSize: 100 * 1024 * 1024, types: ['video/mp4', 'video/webm', 'video/mov', 'video/avi'] }
    };

    const limit = limits[type];
    if (!limit) return { valid: false, error: "Invalid type specified" };

    if (file.size > limit.maxSize) {
        const maxSizeMB = Math.round(limit.maxSize / (1024 * 1024));
        return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    if (!limit.types.includes(file.type)) {
        return { valid: false, error: `Unsupported ${type} format: ${file.type}` };
    }

    return { valid: true, type, size: file.size };
};

// Helper function to get file type category
export const getFileTypeCategory = (file) => {
    if (!file || !file.type) return 'unknown';
    
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    
    return 'unknown';
};

export default upload;