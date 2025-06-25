import React, { useEffect, useRef, useState } from 'react';
import './chat.css';
import EmojiPicker from 'emoji-picker-react';
import { 
  arrayUnion, 
  doc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';
import { useUserStore } from '../lib/userStore';
import upload, { uploadMultipleFiles, validateFile } from '../lib/upload';
import { useNetworkQuality } from '../lib/useNetworkQuality';
import { useSmartRetry } from '../lib/useSmartRetry';
import { useUploadPerformance } from '../lib/useUploadPerformance';
import { showNotification } from '../notification/showNotification';

const Chat = () => {
  const [chat, setChat] = useState();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [img, setImg] = useState({file: null, url: ""});
  const [audio, setAudio] = useState({file: null, url: ""});
  const [video, setVideo] = useState({file: null, url: ""});
  
  // Recording states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  
  // Enhanced upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  
  // Group chat states
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Custom hooks
  const { adjustments } = useNetworkQuality();
  const { retryUpload } = useSmartRetry();
  const { recordUpload } = useUploadPerformance();
  
  const { currentUser } = useUserStore();
  const { 
    chatId, 
    user, 
    chatData, 
    isCurrentUserBlocked, 
    IsReceiverBlocked, 
    isGroupChat, 
    groupMembers,
    updateGroupMembers 
  } = useChatStore();

  const endRef = useRef(null);
  const videoPreviewRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!chatId) return;
   
    const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
      const chatData = res.data();
      setChat(chatData);
      
      if (chatData?.isGroup) {
        updateGroupMembers(chatData.members || []);
      }
    }); 
    return () => unSub();
  }, [chatId]);

  useEffect(() => {
    if (isGroupChat && chatData?.groupName) {
      setNewGroupName(chatData.groupName);
    }
  }, [isGroupChat, chatData]);
  
  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  // Enhanced file handlers with validation
  const handleImg = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file, 'image');
      
      if (!validation.valid) {
        showNotification(`Image validation failed: ${validation.error}`, 'error');
        return;
      }
      
      try {
        const url = URL.createObjectURL(file);
        setImg({ file, url });
        
        if (validation.willCompress) {
          console.log(`📊 Image will be compressed from ${(validation.originalSize / (1024 * 1024)).toFixed(2)}MB to ~${(validation.estimatedSize / (1024 * 1024)).toFixed(2)}MB`);
        }
      } catch (error) {
        console.error("❌ Error processing image:", error);
        showNotification("Error processing image", 'error');
      }
    }
  };

  const handleAudio = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file, 'audio');
      
      if (!validation.valid) {
        showNotification(`Audio validation failed: ${validation.error}`, 'error');
        return;
      }
      
      try {
        const url = URL.createObjectURL(file);
        setAudio({ file, url });
      } catch (error) {
        console.error("❌ Error processing audio:", error);
        showNotification("Error processing audio", 'error');
      }
    }
  };

  const handleVideo = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateFile(file, 'video');
      
      if (!validation.valid) {
        showNotification(`Video validation failed: ${validation.error}`, 'error');
        return;
      }
      
      try {
        const url = URL.createObjectURL(file);
        setVideo({ file, url });
        
        if (validation.willCompress) {
          console.log(`📊 Video will be compressed from ${(validation.originalSize / (1024 * 1024)).toFixed(2)}MB to ~${(validation.estimatedSize / (1024 * 1024)).toFixed(2)}MB`);
        }
      } catch (error) {
        console.error("❌ Error processing video:", error);
        showNotification("Error processing video", 'error');
      }
    }
  };

  // Optimized recording functions
  const startAudioRecording = async () => {
    try {
      console.log("🎤 Starting optimized audio recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 2
        } 
      });
      
      // Use the best available codec
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000 // High quality but reasonable size
      });
      
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        const fileName = `audio_recording_${timestamp}.webm`;
        const file = new File([blob], fileName, { type: mimeType });
        
        setAudio({ file, url });
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start(1000); // Collect data every second
      setIsRecordingAudio(true);
      
    } catch (error) {
      console.error("❌ Error starting audio recording:", error);
      showNotification("Could not access microphone. Please check permissions.", 'error');
    }
  };

  const startVideoRecording = async () => {
    try {
      console.log("📹 Starting optimized video recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280, max: 1920 }, 
          height: { ideal: 720, max: 1080 }, 
          frameRate: { ideal: 30, max: 30 }
        }, 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Use optimized video settings
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality but reasonable size
        audioBitsPerSecond: 128000
      });
      
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        const fileName = `video_recording_${timestamp}.webm`;
        const file = new File([blob], fileName, { type: mimeType });
        
        setVideo({ file, url });
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      setMediaRecorder(recorder);
      recorder.start(1000);
      setIsRecordingVideo(true);
      
    } catch (error) {
      console.error("❌ Error starting video recording:", error);
      showNotification("Could not access camera/microphone. Please check permissions.", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecordingAudio(false);
      setIsRecordingVideo(false);
      setMediaRecorder(null);
    }
  };

  // OPTIMIZED SEND FUNCTION WITH PARALLEL UPLOADS


const handleSend = async () => {
  if (text === "" && !img.file && !audio.file && !video.file) return;
  if (isUploading) return;

  console.log("🚀 Starting handleSend function");
  console.log("📄 Current form state:", {
    text,
    hasImg: !!img.file,
    hasAudio: !!audio.file,
    hasVideo: !!video.file
  });

  setIsUploading(true);
  const startTime = Date.now();

  try {
    // Prepare files with network-aware settings
    const filesToUpload = [];
    if (img.file) {
      console.log("🖼️ Adding image file to upload:", img.file.name, img.file.size);
      const validation = validateFile(img.file, 'image');
      if (validation.valid) {
        filesToUpload.push({ 
          type: 'img', 
          file: img.file,
          compressionOptions: {
            quality: adjustments.imageQuality,
            maxWidth: adjustments.enableCompression ? 1920 : 2560,
            maxHeight: adjustments.enableCompression ? 1080 : 1440
          }
        });
      }
    }
    
    if (audio.file) {
      console.log("🎵 Adding audio file to upload:", audio.file.name, audio.file.size);
      const validation = validateFile(audio.file, 'audio');
      if (validation.valid) {
        filesToUpload.push({ type: 'audio', file: audio.file });
      }
    }
    
    if (video.file) {
      console.log("🎥 Adding video file to upload:", video.file.name, video.file.size);
      const validation = validateFile(video.file, 'video');
      if (validation.valid) {
        filesToUpload.push({ 
          type: 'video', 
          file: video.file,
          compressionOptions: {
            quality: adjustments.videoQuality,
            enableCompression: adjustments.enableCompression
          }
        });
      }
    }

    console.log("📁 Files prepared for upload:", filesToUpload.length);

    // Create initial message data
    const messageData = {
      senderId: currentUser.id,
      senderName: currentUser.username,
      text: text || "",
      createdAt: new Date(),
    };

    console.log("📝 Initial message data:", messageData);

    // Handle file uploads if any
    if (filesToUpload.length > 0) {
      console.log("⬆️ Starting file uploads...");
      
      // Use smart retry for uploads
      const uploadResults = await retryUpload(async () => {
        return await uploadMultipleFiles(filesToUpload, (fileIndex, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [filesToUpload[fileIndex].type]: progress
          }));
        });
      });

      console.log("✅ Upload results:", uploadResults);

      // Add URLs to message data
      uploadResults.forEach(result => {
        if (result && result.url) {
          messageData[result.type] = result.url;
          console.log(`🔗 Added ${result.type} URL:`, result.url);
        } else {
          console.error(`❌ No URL returned for ${result?.type || 'unknown'} file`);
        }
      });

      // Record performance metrics
      recordUpload({
        speed: calculateSpeed(filesToUpload, Date.now() - startTime),
        success: true,
        originalSize: filesToUpload.reduce((acc, f) => acc + f.file.size, 0),
        compressedSize: uploadResults.reduce((acc, r) => acc + (r.compressedSize || r.originalSize), 0)
      });
    }

    console.log("📤 Final message data to send:", messageData);

    // Update the chat document
    console.log("💾 Updating Firestore document...");
    await updateDoc(doc(db, "chats", chatId), {
      messages: arrayUnion(messageData),
    });

    console.log("✅ Firestore document updated successfully");

    // Update user chats
    console.log("👥 Updating user chats...");
    await updateUserChats(messageData);

    console.log("✅ User chats updated successfully");

    // Clear form
    setImg({file: null, url:""});
    setAudio({file: null, url:""});
    setVideo({file: null, url:""});
    setText("");

    console.log(`✅ Message sent in ${Date.now() - startTime}ms`);
    showNotification("Message sent successfully!", 'success');

  } catch (err) {
    console.error("❌ Error sending message:", err);
    console.error("❌ Error details:", {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    
    // Record failed upload
    recordUpload({
      speed: 0,
      success: false,
      originalSize: 0,
      compressedSize: 0
    });
    
    // Enhanced error handling with user-friendly messages
    handleUploadError(err);
  } finally {
    setIsUploading(false);
    setUploadProgress({});
    console.log("🏁 handleSend function completed");
  }
};


  const handleUploadError = (error) => {
    if (error.message.includes('Permission denied')) {
      showNotification('Upload failed: Permission denied. Please check your authentication.', 'error');
    } else if (error.message.includes('quota-exceeded')) {
      showNotification('Upload failed: Storage quota exceeded. Please try again later.', 'error');
    } else if (error.message.includes('Network')) {
      showNotification('Upload failed: Network error. Please check your connection.', 'error');
    } else {
      showNotification(`Upload failed: ${error.message}`, 'error');
    }
  };

  const calculateSpeed = (files, timeMs) => {
    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);
    return (totalSize / 1024) / (timeMs / 1000); // KB/s
  };

  // Optimized user chats update function
  const updateUserChats = async (messageData) => {
    const createLastMessage = () => {
      if (messageData.text) return messageData.text;
      if (messageData.img) return "📷 Image";
      if (messageData.audio) return "🎵 Audio";
      if (messageData.video) return "🎥 Video";
      return "📎 Media";
    };

    const lastMessage = createLastMessage();
    const updateTime = Date.now();

    if (isGroupChat) {
      // Batch update for group members
      const memberIds = groupMembers.map(member => member.id);
      const updatePromises = memberIds.map(async (memberId) => {
        try {
          const userChatsRef = doc(db, "userchats", memberId);
          const userChatsSnap = await getDoc(userChatsRef);

          if (userChatsSnap.exists()) {
            const userChatsData = userChatsSnap.data();
            const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
            
            if (chatIndex !== -1) {
              userChatsData.chats[chatIndex].lastMessage = `${currentUser.username}: ${lastMessage}`;
              userChatsData.chats[chatIndex].isSeen = memberId === currentUser.id;
              userChatsData.chats[chatIndex].updatedAt = updateTime;

              await updateDoc(userChatsRef, {
                chats: userChatsData.chats,
              });
            }
          }
        } catch (error) {
          console.error(`❌ Error updating group member chat:`, memberId, error);
        }
      });

      await Promise.allSettled(updatePromises);
    } else {
      // Individual chat update
      const userIDs = [currentUser.id, user.id];
      const updatePromises = userIDs.map(async (id) => {
        try {
          const userChatsRef = doc(db, "userchats", id);
          const userChatsSnap = await getDoc(userChatsRef);

          if (userChatsSnap.exists()) {
            const userChatsData = userChatsSnap.data();
            const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
            
            if (chatIndex !== -1) {
              userChatsData.chats[chatIndex].lastMessage = lastMessage;
              userChatsData.chats[chatIndex].isSeen = id === currentUser.id;
              userChatsData.chats[chatIndex].updatedAt = updateTime;

              await updateDoc(userChatsRef, {
                chats: userChatsData.chats,
              });
            }
          }
        } catch (error) {
          console.error("❌ Error updating user chat:", id, error);
        }
      });

      await Promise.allSettled(updatePromises);
    }
  };

  // Group management functions
  const updateGroupName = async () => {
    if (!newGroupName.trim() || newGroupName === chatData?.groupName) {
      setIsEditingGroupName(false);
      return;
    }

    try {
      await updateDoc(doc(db, "chats", chatId), {
        groupName: newGroupName.trim(),
      });

      const memberIds = groupMembers.map(member => member.id);
      const updatePromises = memberIds.map(async (memberId) => {
        const userChatsRef = doc(db, "userchats", memberId);
        const userChatsSnap = await getDoc(userChatsRef);

        if(userChatsSnap.exists()){
          const userChatsData = userChatsSnap.data();
          const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
          
          if (chatIndex !== -1) {
            userChatsData.chats[chatIndex].groupName = newGroupName.trim();
            await updateDoc(userChatsRef, {
              chats: userChatsData.chats,
            });
          }
        }
      });

      await Promise.allSettled(updatePromises);
      setIsEditingGroupName(false);
      console.log("✅ Group name updated successfully");
      showNotification("Group name updated successfully!", 'success');
    } catch (error) {
      console.error("❌ Error updating group name:", error);
      showNotification("Failed to update group name", 'error');
    }
  };

  const searchUsers = async () => {
    if (!searchUser.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", ">=", searchUser), where("username", "<=", searchUser + '\uf8ff'));
      const querySnapshot = await getDocs(q);

      const foundUsers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(foundUser => 
          foundUser.id !== currentUser.id && 
          !groupMembers.some(member => member.id === foundUser.id)
        );

      setSearchResults(foundUsers);
    } catch (error) {
      console.error("❌ Error searching users:", error);
    }
  };

  const addMemberToGroup = async (userToAdd) => {
    try {
      const newMember = {
        id: userToAdd.id,
        username: userToAdd.username,
        avatar: userToAdd.avatar || "",
        joinedAt: Date.now(),
        role: "member"
      };

      await updateDoc(doc(db, "chats", chatId), {
        members: arrayUnion(newMember),
        memberIds: arrayUnion(userToAdd.id),
      });

      const userChatsRef = doc(db, "userchats", userToAdd.id);
      await updateDoc(userChatsRef, {
        chats: arrayUnion({
          chatId: chatId,
          lastMessage: "",
          updatedAt: Date.now(),
          isGroup: true,
          groupName: chatData?.groupName || "Group Chat",
          groupAvatar: "",
        }),
      });

      const systemMessage = {
        senderId: "system",
        senderName: "System",
        text: `${userToAdd.username} was added to the group`,
        createdAt: new Date(),
        isSystemMessage: true,
      };

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(systemMessage),
      });

      setSearchUser('');
      setSearchResults([]);
      console.log("✅ Member added successfully");
      showNotification("Member added successfully!", 'success');
    } catch (error) {
      console.error("❌ Error adding member:", error);
      showNotification("Failed to add member", 'error');
    }
  };

  const removeMemberFromGroup = async (memberToRemove) => {
    if (memberToRemove.id === currentUser.id) {
      showNotification("You cannot remove yourself. Use 'Leave Group' instead.", 'error');
      return;
    }

    if (memberToRemove.role === "admin" && currentUser.id !== chatData?.groupAdmin) {
      showNotification("Only group admin can remove other admins", 'error');
      return;
    }

    try {
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      const currentChatData = chatDoc.data();
      
      const updatedMembers = currentChatData.members.filter(member => member.id !== memberToRemove.id);
      const updatedMemberIds = currentChatData.memberIds.filter(id => id !== memberToRemove.id);

      await updateDoc(doc(db, "chats", chatId), {
        members: updatedMembers,
        memberIds: updatedMemberIds,
      });

      const userChatsRef = doc(db, "userchats", memberToRemove.id);
      const userChatsSnap = await getDoc(userChatsRef);

      if(userChatsSnap.exists()){
        const userChatsData = userChatsSnap.data();
        const updatedChats = userChatsData.chats.filter(chat => chat.chatId !== chatId);
        
        await updateDoc(userChatsRef, {
          chats: updatedChats,
        });
      }

      const systemMessage = {
        senderId: "system",
        senderName: "System",
        text: `${memberToRemove.username} was removed from the group`,
        createdAt: new Date(),
        isSystemMessage: true,
      };

      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(systemMessage),
      });

      console.log("✅ Member removed successfully");
      showNotification("Member removed successfully!", 'success');
    } catch (error) {
      console.error("❌ Error removing member:", error);
      showNotification("Failed to remove member", 'error');
    }
  };

  const leaveGroup = async () => {
    if (currentUser.id === chatData?.groupAdmin) {
      showNotification("You are the group admin. Transfer admin rights before leaving or delete the group.", 'error');
      return;
    }

    if (!confirm("Are you sure you want to leave this group?")) {
      return;
    }

    try {
      await removeMemberFromGroup({ id: currentUser.id, username: currentUser.username });
    } catch (error) {
      console.error("❌ Error leaving group:", error);
      showNotification("Failed to leave group", 'error');
    }
  };

  const deleteGroup = async () => {
    if (currentUser.id !== chatData?.groupAdmin) {
      showNotification("Only group admin can delete the group", 'error');
      return;
    }

    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      const updatePromises = groupMembers.map(async (member) => {
        const userChatsRef = doc(db, "userchats", member.id);
        const userChatsSnap = await getDoc(userChatsRef);

        if(userChatsSnap.exists()){
          const userChatsData = userChatsSnap.data();
          const updatedChats = userChatsData.chats.filter(chat => chat.chatId !== chatId);
          
          await updateDoc(userChatsRef, {
            chats: updatedChats,
          });
        }
      });

      await Promise.allSettled(updatePromises);
      await deleteDoc(doc(db, "chats", chatId));

      console.log("✅ Group deleted successfully");
      showNotification("Group deleted successfully!", 'success');
    } catch (error) {
      console.error("❌ Error deleting group:", error);
      showNotification("Failed to delete group", 'error');
    }
  };

  const clearMedia = (type) => {
    if (type === 'img') setImg({file: null, url: ""});
    if (type === 'audio') setAudio({file: null, url: ""});
    if (type === 'video') setVideo({file: null, url: ""});
  };

  const Avatar = ({ src, alt, className = "" }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setImgSrc(src);
      setHasError(false);
    }, [src]);

    const handleError = () => {
      setHasError(true);
      setImgSrc("./avatar.png");
    };

    return (
      <img 
        src={imgSrc || "./avatar.png"} 
        alt={alt}
        className={className}
        onError={handleError}
        style={{ 
          objectFit: 'cover',
          border: hasError ? '2px solid #ff6b6b' : 'none'
        }}
      />
    );
  };

  const isCurrentUserAdmin = () => {
    return isGroupChat && currentUser?.id === chatData?.groupAdmin;
  };

  const getMemberDisplayName = (senderId) => {
    if (senderId === "system") return "System";
    if (senderId === currentUser?.id) return "You";
    
    const member = groupMembers.find(m => m.id === senderId);
    return member?.username || "Unknown User";
  };

  // Calculate overall upload progress
  const getOverallProgress = () => {
    const progressValues = Object.values(uploadProgress);
    if (progressValues.length === 0) return 0;
    return progressValues.reduce((a, b) => a + b, 0) / progressValues.length;
  };

  // Format upload speed
  const formatSpeed = (speed) => {
    if (speed < 1) return `${(speed * 1000).toFixed(0)} B/s`;
    if (speed < 1000) return `${speed.toFixed(1)} KB/s`;
    return `${(speed / 1000).toFixed(1)} MB/s`;
  };

  // Format time
  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <>
      <div className="chat_container">
        <div className="top">
          <div className="user">
            {isGroupChat ? (
              <>
                <div className="group-avatar-container">
                  <Avatar src={chatData?.groupAvatar || "./group-avatar.png"} alt="Group avatar" />
                  <div className="group-indicator">👥</div>
                </div>
                <div className="texts">
                  {isEditingGroupName ? (
                    <div className="edit-group-name">
                      <input 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onBlur={updateGroupName}
                        onKeyPress={(e) => e.key === 'Enter' && updateGroupName()}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <span onClick={() => isCurrentUserAdmin() && setIsEditingGroupName(true)}>
                      {chatData?.groupName || "Group Chat"}
                      {isCurrentUserAdmin() && <span className="edit-icon">✏️</span>}
                    </span>
                  )}
                  <p>{groupMembers.length} members</p>
                </div>
              </>
            ) : (
              <>
                <Avatar src={user?.avatar} alt="Chat user avatar" />
                <div className="texts">
                  <span>{user?.username || "John Doe"}</span>
                  <p>Lorem ipsum dolor sit.</p>
                </div>
              </>
            )}
          </div>
          <div className="icons">
            <img src="./phone.png" alt="Call" />
            <img src="./video.png" alt="Video call" />
            <img 
              src="./info.png" 
              alt="Info" 
              onClick={() => setShowGroupInfo(!showGroupInfo)}
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Group Info Panel */}
        {showGroupInfo && isGroupChat && (
          <div className="group-info-panel">
            <div className="group-info-header">
              <h3>Group Info</h3>
              <button onClick={() => setShowGroupInfo(false)}>×</button>
            </div>
            
            <div className="group-members">
              <h4>Members ({groupMembers.length})</h4>
              {groupMembers.map(member => (
                <div key={member.id} className="member-item">
                  <Avatar src={member.avatar} alt={`${member.username} avatar`} />
                  <div className="member-info">
                    <span>{member.username}</span>
                    <span className="member-role">{member.role}</span>
                  </div>
                  {isCurrentUserAdmin() && member.id !== currentUser.id && (
                    <button 
                      onClick={() => removeMemberFromGroup(member)}
                      className="remove-member-btn"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isCurrentUserAdmin() && (
              <div className="group-actions">
                <button onClick={() => setShowAddMembers(!showAddMembers)}>
                  Add Members
                </button>
                <button onClick={deleteGroup} className="delete-group-btn">
                  Delete Group
                </button>
              </div>
            )}

            {!isCurrentUserAdmin() && (
              <button onClick={leaveGroup} className="leave-group-btn">
                Leave Group
              </button>
            )}

            {showAddMembers && (
              <div className="add-members-section">
                <h4>Add New Members</h4>
                <div className="search-users">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchUser}
                    onChange={(e) => {
                      setSearchUser(e.target.value);
                      searchUsers();
                    }}
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div key={user.id} className="search-result-item">
                        <Avatar src={user.avatar} alt={`${user.username} avatar`} />
                        <span>{user.username}</span>
                        <button onClick={() => addMemberToGroup(user)}>
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="center">
          {chat?.messages?.map((message, index) => (
            <div
              className={
                message.senderId === currentUser?.id
                  ? "message own"
                  : message.isSystemMessage 
                    ? "message system"
                    : "message"
              }
              key={index}
            >
              <div className="texts">
                {isGroupChat && !message.isSystemMessage && message.senderId !== currentUser?.id && (
                  <div className="sender-name">{getMemberDisplayName(message.senderId)}</div>
                )}
                
                {message.img && (
                  <Avatar src={message.img} alt="Message image" />
                )}
                {message.audio && (
                  <div className="audio-player">
                    <audio controls>
                      <source src={message.audio} type="audio/webm" />
                      <source src={message.audio} type="audio/mp3" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {message.video && (
                  <div className="video-player">
                    <video controls width="300">
                      <source src={message.video} type="video/webm" />
                      <source src={message.video} type="video/mp4" />
                      Your browser does not support the video element.
                    </video>
                  </div>
                )}
                <p>{message.text}</p>
                <span>
                  {new Date(
                    message.createdAt?.toDate
                      ? message.createdAt.toDate()
                      : message.createdAt
                  ).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {/* Enhanced preview attachments with file info */}
          {img.url && (
            <div className="message own preview">
              <div className="texts">
                <Avatar src={img.url} alt="Preview image" />
                <div className="file-info">
                  <span>📷 Image • {(img.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button onClick={() => clearMedia('img')} className="clear-btn">×</button>
              </div>
            </div>
          )}
          
          {audio.url && (
            <div className="message own preview">
              <div className="texts">
                <div className="audio-player">
                  <audio controls>
                    <source src={audio.url} type="audio/webm" />
                  </audio>
                </div>
                <div className="file-info">
                  <span>🎵 Audio • {(audio.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button onClick={() => clearMedia('audio')} className="clear-btn">×</button>
              </div>
            </div>
          )}
          
          {video.url && (
            <div className="message own preview">
              <div className="texts">
                <div className="video-player">
                  <video controls width="300">
                    <source src={video.url} type="video/webm" />
                  </video>
                </div>
                <div className="file-info">
                  <span>🎥 Video • {(video.file.size / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <button onClick={() => clearMedia('video')} className="clear-btn">×</button>
              </div>
            </div>
          )}
          
          {isRecordingVideo && (
            <div className="recording-preview">
              <video ref={videoPreviewRef} autoPlay muted width="200" />
              <p>🔴 Recording video...</p>
            </div>
          )}
          
          <div ref={endRef}></div>
        </div>

        <div className="bottom">
          <div className="icons">
            <label htmlFor="file">
              <img src="./img.png" alt="Upload image" />
            </label>
            <input
              type="file"
              id="file"
              style={{ display: "none" }}
              onChange={handleImg}
              accept="image/*"
            />
            
            <label htmlFor="audio-file">
              <img src="./audio.png" alt="Upload audio" />
            </label>
            <input
              type="file"
              id="audio-file"
              style={{ display: "none" }}
              onChange={handleAudio}
              accept="audio/*"
            />
            
            <label htmlFor="video-file">
              <img src="./video-upload.png" alt="Upload video" />
            </label>
            <input
              type="file"
              id="video-file"
              style={{ display: "none" }}
              onChange={handleVideo}
              accept="video/*"
            />
            
            <img 
              src="./camera.png" 
              alt="Record video" 
              onClick={isRecordingVideo ? stopRecording : startVideoRecording}
              style={{ filter: isRecordingVideo ? 'brightness(1.5)' : 'none' }}
            />
            
            <img 
              src="./mic.png" 
              alt="Record audio" 
              onClick={isRecordingAudio ? stopRecording : startAudioRecording}
              style={{ filter: isRecordingAudio ? 'brightness(1.5)' : 'none' }}
            />
            
            {(isRecordingAudio || isRecordingVideo) && (
              <button onClick={stopRecording} className="stop-recording">
                ⏹️ Stop
              </button>
            )}
          </div>
          
          <input
            type="text"
            placeholder={
              isCurrentUserBlocked || IsReceiverBlocked
                ? "You cannot Send a message "
                : "Type a message..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isCurrentUserBlocked || IsReceiverBlocked}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
          />
          
          <div className="emoji">
            <img src="./emoji.png" alt="" onClick={() => setOpen(!open)} />
            <div className="picker">
              <EmojiPicker open={open} onEmojiClick={handleEmoji} />
            </div>
          </div>
        
          <button
            className="sendbutton"
            onClick={handleSend}
            disabled={isCurrentUserBlocked || IsReceiverBlocked || isUploading}
            style={{
              opacity: isUploading ? 0.7 : 1,
              position: 'relative'
            }}
          >
            {isUploading ? (
              <div className="upload-status">
                <div className="upload-progress">
                  <div style={{ 
                    width: '60px', 
                    height: '4px', 
                    background: 'rgba(255,255,255,0.3)', 
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '2px'
                  }}>
                    <div style={{
                      width: `${getOverallProgress()}%`,
                      height: '100%',
                      background: 'white',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)' }}>
                    {uploadSpeed > 0 && `${formatSpeed(uploadSpeed)}`}
                    {estimatedTime > 0 && estimatedTime < 300 && ` • ${formatTime(estimatedTime)}`}
                  </div>
                </div>
              </div>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Chat;


