import React, { useState, useEffect } from 'react';
import './userinfo.css';
import { useUserStore } from '../../lib/userStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import upload from '../../lib/upload';
import { toast } from 'react-toastify';

const Userinfo = () => {
    const { currentUser, fetchUserInfo } = useUserStore();
    const [avatarError, setAvatarError] = useState(false);
    const [isEditingAvatar, setIsEditingAvatar] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    console.log("🔍 UserInfo Debug:");
    console.log("- Current user:", currentUser);
    console.log("- Avatar URL:", currentUser?.avatar);

    // Simple avatar source logic (like Chat.jsx and Chatlist.jsx)
    const getAvatarSrc = () => {
        // If we're previewing a new file, show the preview
        if (previewUrl) {
            return previewUrl;
        }
        
        // If user has avatar and no error, show it
        if (currentUser?.avatar && currentUser.avatar.trim() !== "" && !avatarError) {
            return currentUser.avatar;
        }
        
        // Default fallback
        return "./avatar.png";
    };

    const handleAvatarError = () => {
        console.log("❌ Failed to load user avatar:", currentUser?.avatar);
        setAvatarError(true);
    };

    const handleAvatarLoad = () => {
        if (currentUser?.avatar && currentUser.avatar !== "./avatar.png") {
            console.log("✅ User avatar loaded successfully:", currentUser.avatar);
            setAvatarError(false);
        }
    };

    // Reset error state when user changes
    useEffect(() => {
        setAvatarError(false);
    }, [currentUser?.avatar]);

    // Handle file selection for avatar upload
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log("🔍 Avatar file selected:", file.name, file.size, file.type);
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size should be less than 5MB");
            return;
        }

        setSelectedFile(file);
        
        // Show preview
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
        setAvatarError(false);
        
        console.log("✅ Avatar preview created");
    };

    // Upload new avatar and update user document
    const handleAvatarUpdate = async () => {
        if (!selectedFile || !currentUser) {
            toast.error("Please select an image first");
            return;
        }

        setUploadingAvatar(true);
        console.log("📤 Starting avatar update process...");

        try {
            // Upload the new avatar
            console.log("📤 Uploading new avatar...");
            const newAvatarUrl = await upload(selectedFile);
            console.log("✅ Avatar uploaded successfully:", newAvatarUrl);

            // Update user document in Firestore
            console.log("💾 Updating user document with new avatar...");
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, {
                avatar: newAvatarUrl
            });
            console.log("✅ User document updated successfully");

            // Refresh user info in store
            await fetchUserInfo(currentUser.id);
            console.log("✅ User store refreshed");

            // Clean up preview URL
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            // Reset states
            setSelectedFile(null);
            setPreviewUrl(null);
            setIsEditingAvatar(false);
            setAvatarError(false);
            
            toast.success("Profile picture updated successfully!");
            
        } catch (error) {
            console.error("❌ Avatar update failed:", error);
            
            // Clean up preview URL on error
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setPreviewUrl(null);
            
            // Specific error messages
            if (error.message.includes('Permission denied')) {
                toast.error("Permission denied. Please check your authentication.");
            } else if (error.message.includes('storage/unauthorized')) {
                toast.error("Upload permission denied. Please try again or contact support.");
            } else {
                toast.error(`Failed to update profile picture: ${error.message}`);
            }
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Cancel avatar editing
    const handleCancelEdit = () => {
        // Clean up preview URL
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsEditingAvatar(false);
        setAvatarError(false);
    };

    // Start editing avatar
    const handleEditClick = () => {
        setIsEditingAvatar(true);
        console.log("🔧 Starting avatar edit mode");
    };

    // Clean up preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <div className="userinfo">
            <div className="user">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img 
                        src={getAvatarSrc()}
                        alt="User Avatar"
                        onError={handleAvatarError}
                        onLoad={handleAvatarLoad}
                        style={{ 
                            width: '50px', 
                            height: '50px', 
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: avatarError ? '2px solid #ff6b6b' : 
                                   selectedFile ? '2px solid #4CAF50' : '2px solid #ddd',
                            opacity: uploadingAvatar ? 0.7 : 1
                        }}
                    />
                    {uploadingAvatar && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: '20px'
                        }}>
                            ⏳
                        </div>
                    )}
                </div>
                <h2>{currentUser?.username || "User"}</h2>
            </div>

            <div className="icons">
                <img src="./more.png" alt="More options" />
                <img src="./video.png" alt="Video call" />
                
                {/* Edit Avatar Button */}
                <img 
                    src="./edit.png" 
                    alt="Edit Profile" 
                    onClick={handleEditClick}
                    style={{ 
                        cursor: 'pointer',
                        opacity: uploadingAvatar ? 0.5 : 1,
                        filter: isEditingAvatar ? 'brightness(1.2)' : 'none'
                    }}
                    title="Edit Profile Picture"
                />
            </div>

            {/* Avatar Editing Modal/Section */}
            {isEditingAvatar && (
                <div style={{
                    position: 'absolute',
                    top: '70px',
                    right: '10px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    minWidth: '200px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                        Update Profile Picture
                    </h4>
                    
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ 
                            width: '100%', 
                            marginBottom: '10px',
                            fontSize: '12px'
                        }}
                        disabled={uploadingAvatar}
                    />
                    
                    {selectedFile && (
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px' }}>
                            Selected: {selectedFile.name}
                            <br />
                            Size: {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={handleAvatarUpdate}
                            disabled={!selectedFile || uploadingAvatar}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '12px',
                                backgroundColor: selectedFile ? '#4CAF50' : '#ccc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: selectedFile && !uploadingAvatar ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {uploadingAvatar ? 'Uploading...' : 'Update'}
                        </button>
                        
                        <button
                            onClick={handleCancelEdit}
                            disabled={uploadingAvatar}
                            style={{
                                flex: 1,
                                padding: '8px',
                                fontSize: '12px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: uploadingAvatar ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {/* Debug info - remove this in production */}
            <div style={{ 
                fontSize: '10px', 
                color: '#666', 
                marginTop: '10px',
                padding: '5px',
                background: '#f5f5f5',
                borderRadius: '3px'
            }}>
                <div>Debug Info:</div>
                <div>Avatar URL: {currentUser?.avatar || "None"}</div>
                <div>Error: {avatarError ? "Yes" : "No"}</div>
                <div>Preview: {previewUrl ? "Yes" : "No"}</div>
                <div>Using: {getAvatarSrc()}</div>
                <div>Editing: {isEditingAvatar ? "Yes" : "No"}</div>
                <div>Selected File: {selectedFile ? selectedFile.name : "None"}</div>
            </div>
        </div>
    );
};

export default Userinfo;