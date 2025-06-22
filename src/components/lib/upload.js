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

    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.error("❌ Invalid file type:", file.type);
        throw new Error("Only image files are allowed");
    }

    // Validate file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
        console.error("❌ File too large:", file.size);
        throw new Error("File size must be less than 5MB");
    }

    try {
        // Create unique filename with timestamp
        const date = new Date().getTime().toString();
        const fileName = `${date}_${file.name}`;
        console.log("🔍 Generated filename:", fileName);

        // Create storage reference with proper path
        const storageRef = ref(storage, `images/${fileName}`);
        console.log("🔍 Storage reference created:", storageRef.fullPath);
        console.log("📤 Starting upload to:", `images/${fileName}`);

        // Create upload task with metadata
        const metadata = {
            contentType: file.type,
            cacheControl: 'public,max-age=3600',
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

                        // Test URL accessibility
                        try {
                            const testResponse = await fetch(downloadURL, { method: 'HEAD' });
                            console.log("🔍 URL accessibility test:", testResponse.status);
                            if (!testResponse.ok) {
                                console.log("❌ URL not accessible:", testResponse.status);
                            }
                        } catch (testError) {
                            console.log("⚠️ URL test failed (might be CORS):", testError.message);
                        }

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

export default upload;