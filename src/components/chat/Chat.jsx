
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
  writeBatch,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';
import { useUserStore } from '../lib/userStore';
import upload from '../lib/upload';

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
  const [recordedChunks, setRecordedChunks] = useState([]);
  
  // Additional state for better UX
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Group chat states
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
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
      
      // Update group members if it's a group chat
      if (chatData?.isGroup) {
        updateGroupMembers(chatData.members || []);
      }
    }); 
    return () => unSub();
  }, [chatId]);

  // Initialize group name when switching chats
  useEffect(() => {
    if (isGroupChat && chatData?.groupName) {
      setNewGroupName(chatData.groupName);
    }
  }, [isGroupChat, chatData]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setOpen(false);
  };

  const handleImg = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const url = URL.createObjectURL(file);
        setImg({ file, url });
      } catch (error) {
        console.error("❌ Error processing image:", error);
      }
    }
  };

  const handleAudio = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const url = URL.createObjectURL(file);
        setAudio({ file, url });
      } catch (error) {
        console.error("❌ Error processing audio:", error);
      }
    }
  };

  const handleVideo = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const url = URL.createObjectURL(file);
        setVideo({ file, url });
      } catch (error) {
        console.error("❌ Error processing video:", error);
      }
    }
  };

  // [Audio and Video recording functions remain the same as in your original code]
  const startAudioRecording = async () => {
    try {
      console.log("🎤 Starting audio recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const options = [];
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.push({ type: 'audio/webm;codecs=opus' });
      }
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.push({ type: 'audio/mp4' });
      }
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.push({ type: 'audio/webm' });
      }
      
      const recorderOptions = options.length > 0 ? options[0] : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `audio_recording_${timestamp}.${extension}`;
        const file = new File([blob], fileName, { type: mimeType });
        
        setAudio({ file, url });
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      recorder.start(1000);
      setIsRecordingAudio(true);
      
    } catch (error) {
      console.error("❌ Error starting audio recording:", error);
      alert("Could not access microphone. Please check permissions and try again.");
    }
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, 
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      const options = [];
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options.push({ type: 'video/webm;codecs=vp9,opus' });
      }
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options.push({ type: 'video/webm;codecs=vp8,opus' });
      }
      if (MediaRecorder.isTypeSupported('video/webm')) {
        options.push({ type: 'video/webm' });
      }
      
      const recorderOptions = options.length > 0 ? options[0] : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const timestamp = Date.now();
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const fileName = `video_recording_${timestamp}.${extension}`;
        const file = new File([blob], fileName, { type: mimeType });
        
        setVideo({ file, url });
        stream.getTracks().forEach(track => track.stop());
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      recorder.start(1000);
      setIsRecordingVideo(true);
      
    } catch (error) {
      console.error("❌ Error starting video recording:", error);
      alert("Could not access camera/microphone. Please check permissions and try again.");
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

  const handleSend = async () => {
    if (text === "" && !img.file && !audio.file && !video.file) return;
    if (isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    let imgUrl = null;
    let audioUrl = null;
    let videoUrl = null;

    try {
      const totalFiles = [img.file, audio.file, video.file].filter(Boolean).length;
      let completedFiles = 0;

      if(img.file){
        imgUrl = await upload(img.file);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }
      
      if(audio.file){
        audioUrl = await upload(audio.file);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }
      
      if(video.file){
        videoUrl = await upload(video.file);
        completedFiles++;
        setUploadProgress((completedFiles / totalFiles) * 100);
      }

      const messageData = {
        senderId: currentUser.id,
        senderName: currentUser.username,
        text: text || "",
        createdAt: new Date(),
      };

      if (imgUrl) messageData.img = imgUrl;
      if (audioUrl) messageData.audio = audioUrl;
      if (videoUrl) messageData.video = videoUrl;

      // Save message to chat
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion(messageData),
      });

      // Update user chats differently for group vs individual
      if (isGroupChat) {
        // Update all group members' chats
        const memberIds = groupMembers.map(member => member.id);
        
        for (const memberId of memberIds) {
          try {
            const userChatsRef = doc(db, "userchats", memberId);
            const userChatsSnap = await getDoc(userChatsRef);

            if(userChatsSnap.exists()){
              const userChatsData = userChatsSnap.data();
              const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
              
              if (chatIndex !== -1) {
                let lastMessage = text;
                if (!lastMessage) {
                  if (imgUrl) lastMessage = "📷 Image";
                  else if (audioUrl) lastMessage = "🎵 Audio";
                  else if (videoUrl) lastMessage = "🎥 Video";
                  else lastMessage = "📎 Media";
                }
                
                userChatsData.chats[chatIndex].lastMessage = `${currentUser.username}: ${lastMessage}`;
                userChatsData.chats[chatIndex].isSeen = memberId === currentUser.id ? true : false;
                userChatsData.chats[chatIndex].updatedAt = Date.now();

                await updateDoc(userChatsRef, {
                  chats: userChatsData.chats,
                });
              }
            }
          } catch (userChatError) {
            console.error("❌ Error updating group member chat:", memberId, userChatError);
          }
        }
      } else {
        // Update individual chat (existing logic)
        const userIDs = [currentUser.id, user.id];

        for (const id of userIDs) {
          try {
            const userChatsRef = doc(db, "userchats", id);
            const userChatsSnap = await getDoc(userChatsRef);

            if(userChatsSnap.exists()){
              const userChatsData = userChatsSnap.data();
              const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
              
              if (chatIndex !== -1) {
                let lastMessage = text;
                if (!lastMessage) {
                  if (imgUrl) lastMessage = "📷 Image";
                  else if (audioUrl) lastMessage = "🎵 Audio";
                  else if (videoUrl) lastMessage = "🎥 Video";
                  else lastMessage = "📎 Media";
                }
                
                userChatsData.chats[chatIndex].lastMessage = lastMessage;
                userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
                userChatsData.chats[chatIndex].updatedAt = Date.now();

                await updateDoc(userChatsRef, {
                  chats: userChatsData.chats,
                });
              }
            }
          } catch (userChatError) {
            console.error("❌ Error updating user chat for user:", id, userChatError);
          }
        }
      }

      // Clear form
      setImg({file: null, url:""});
      setAudio({file: null, url:""});
      setVideo({file: null, url:""});
      setText("");

    } catch (err) {
      console.error("❌ Error sending message:", err);
      if (err.message.includes('Permission denied')) {
        alert("Permission denied. Please check your authentication and try again.");
      } else if (err.message.includes('storage/unauthorized')) {
        alert("Upload permission denied. Please try logging out and back in.");
      } else if (err.message.includes('quota-exceeded')) {
        alert("Storage quota exceeded. Please try again later.");
      } else {
        alert(`Failed to send message: ${err.message}`);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

      // Update all members' userchats with new group name
      const memberIds = groupMembers.map(member => member.id);
      for (const memberId of memberIds) {
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
      }

      setIsEditingGroupName(false);
      console.log("✅ Group name updated successfully");
    } catch (error) {
      console.error("❌ Error updating group name:", error);
      alert("Failed to update group name");
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

      // Update chat document
      await updateDoc(doc(db, "chats", chatId), {
        members: arrayUnion(newMember),
        memberIds: arrayUnion(userToAdd.id),
      });

      // Add chat to new member's userchats
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

      // Add system message
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
    } catch (error) {
      console.error("❌ Error adding member:", error);
      alert("Failed to add member");
    }
  };

  const removeMemberFromGroup = async (memberToRemove) => {
    if (memberToRemove.id === currentUser.id) {
      alert("You cannot remove yourself. Use 'Leave Group' instead.");
      return;
    }

    if (memberToRemove.role === "admin" && currentUser.id !== chatData?.groupAdmin) {
      alert("Only group admin can remove other admins");
      return;
    }

    try {
      // Get current chat data
      const chatDoc = await getDoc(doc(db, "chats", chatId));
      const currentChatData = chatDoc.data();
      
      // Remove member from arrays
      const updatedMembers = currentChatData.members.filter(member => member.id !== memberToRemove.id);
      const updatedMemberIds = currentChatData.memberIds.filter(id => id !== memberToRemove.id);

      // Update chat document
      await updateDoc(doc(db, "chats", chatId), {
        members: updatedMembers,
        memberIds: updatedMemberIds,
      });

      // Remove chat from member's userchats
      const userChatsRef = doc(db, "userchats", memberToRemove.id);
      const userChatsSnap = await getDoc(userChatsRef);

      if(userChatsSnap.exists()){
        const userChatsData = userChatsSnap.data();
        const updatedChats = userChatsData.chats.filter(chat => chat.chatId !== chatId);
        
        await updateDoc(userChatsRef, {
          chats: updatedChats,
        });
      }

      // Add system message
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
    } catch (error) {
      console.error("❌ Error removing member:", error);
      alert("Failed to remove member");
    }
  };

  const leaveGroup = async () => {
    if (currentUser.id === chatData?.groupAdmin) {
      alert("You are the group admin. Transfer admin rights before leaving or delete the group.");
      return;
    }

    if (!confirm("Are you sure you want to leave this group?")) {
      return;
    }

    try {
      await removeMemberFromGroup({ id: currentUser.id, username: currentUser.username });
      // The chat will be removed from current user's list and they'll be redirected
    } catch (error) {
      console.error("❌ Error leaving group:", error);
      alert("Failed to leave group");
    }
  };

  const deleteGroup = async () => {
    if (currentUser.id !== chatData?.groupAdmin) {
      alert("Only group admin can delete the group");
      return;
    }

    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      // Remove chat from all members' userchats
      for (const member of groupMembers) {
        const userChatsRef = doc(db, "userchats", member.id);
        const userChatsSnap = await getDoc(userChatsRef);

        if(userChatsSnap.exists()){
          const userChatsData = userChatsSnap.data();
          const updatedChats = userChatsData.chats.filter(chat => chat.chatId !== chatId);
          
          await updateDoc(userChatsRef, {
            chats: updatedChats,
          });
        }
      }

      // Delete the chat document
      await deleteDoc(doc(db, "chats", chatId));

      console.log("✅ Group deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting group:", error);
      alert("Failed to delete group");
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

            {/* Add Members Section */}
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
                {/* Show sender name for group chats (except for own messages and system messages) */}
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
          
          {/* Preview attachments */}
          {img.url && (
            <div className="message own preview">
              <div className="texts">
                <Avatar src={img.url} alt="Preview image" />
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
                <button onClick={() => clearMedia('video')} className="clear-btn">×</button>
              </div>
            </div>
          )}
          
          {/* Recording preview */}
          {isRecordingVideo && (
            <div className="recording-preview">
              <video ref={videoPreviewRef} autoPlay muted width="200" />
              <p>Recording video...</p>
            </div>
          )}
          
          <div ref={endRef}></div>
        </div>

        <div className="bottom">
          <div className="icons">
            {/* Media upload icons */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>Uploading...</span>
                <div style={{ 
                  width: '40px', 
                  height: '4px', 
                  background: 'rgba(255,255,255,0.3)', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${uploadProgress}%`,
                    height: '100%',
                    background: 'white',
                    transition: 'width 0.3s ease'
                  }}></div>
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







// import React, { useEffect, useRef, useState } from 'react';
// import './chat.css';
// import EmojiPicker from 'emoji-picker-react';
// import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
// import { db } from '../lib/firebase';
// import { useChatStore } from '../lib/chatStore';
// import { useUserStore } from '../lib/userStore';
// import upload from '../lib/upload';

// const Chat = () => {
//     const [chat, setChat] = React.useState();
//     const [open, setOpen] = React.useState(false);
//     const [text, setText] = React.useState('');
//     const [img, setImg] = React.useState({file: null, url: ""});
//     const [audio, setAudio] = React.useState({file: null, url: ""});
//     const [video, setVideo] = React.useState({file: null, url: ""});
    
//     // Recording states
//     const [isRecordingAudio, setIsRecordingAudio] = useState(false);
//     const [isRecordingVideo, setIsRecordingVideo] = useState(false);
//     const [mediaRecorder, setMediaRecorder] = useState(null);
//     const [recordedChunks, setRecordedChunks] = useState([]);
    
//     // Additional state for better UX
//     const [isUploading, setIsUploading] = useState(false);
//     const [uploadProgress, setUploadProgress] = useState(0);
    
//     const { currentUser } = useUserStore();
//     const { chatId, user, isCurrentUserBlocked, IsReceiverBlocked } = useChatStore();

//     const endRef = useRef(null);
//     const videoPreviewRef = useRef(null);

//     useEffect(() => {
//         endRef.current?.scrollIntoView({ behavior: 'smooth' });
//     }, []);

//     useEffect(() => {
//         if (!chatId) return;
       
//         const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
//             setChat(res.data());
//         }); 
//         return () => unSub();
//     }, [chatId]);

//     const handleEmoji = (e) => {
//        setText((prev) => prev + e.emoji);
//        setOpen(false);
//     };

//     const handleImg = async (e) => {
//         if (e.target.files[0]) {
//             const file = e.target.files[0];
//             try {
//                 const url = URL.createObjectURL(file);
//                 setImg({ file, url });
//             } catch (error) {
//                 console.error("❌ Error processing image:", error);
//             }
//         }
//     };

//     const handleAudio = async (e) => {
//         if (e.target.files[0]) {
//             const file = e.target.files[0];
//             try {
//                 const url = URL.createObjectURL(file);
//                 setAudio({ file, url });
//             } catch (error) {
//                 console.error("❌ Error processing audio:", error);
//             }
//         }
//     };

//     const handleVideo = async (e) => {
//         if (e.target.files[0]) {
//             const file = e.target.files[0];
//             try {
//                 const url = URL.createObjectURL(file);
//                 setVideo({ file, url });
//             } catch (error) {
//                 console.error("❌ Error processing video:", error);
//             }
//         }
//     };

//     const startAudioRecording = async () => {
//         try {
//             console.log("🎤 Starting audio recording...");
//             const stream = await navigator.mediaDevices.getUserMedia({ 
//                 audio: {
//                     echoCancellation: true,
//                     noiseSuppression: true,
//                     sampleRate: 44100
//                 } 
//             });
            
//             // Use a more compatible codec
//             const options = [];
//             if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
//                 options.push({ type: 'audio/webm;codecs=opus' });
//             }
//             if (MediaRecorder.isTypeSupported('audio/mp4')) {
//                 options.push({ type: 'audio/mp4' });
//             }
//             if (MediaRecorder.isTypeSupported('audio/webm')) {
//                 options.push({ type: 'audio/webm' });
//             }
            
//             const recorderOptions = options.length > 0 ? options[0] : {};
//             console.log("🔍 Using recorder options:", recorderOptions);
            
//             const recorder = new MediaRecorder(stream, recorderOptions);
//             const chunks = [];

//             recorder.ondataavailable = (event) => {
//                 console.log("📊 Audio data available:", event.data.size, "bytes");
//                 if (event.data.size > 0) {
//                     chunks.push(event.data);
//                 }
//             };

//             recorder.onstop = () => {
//                 console.log("⏹️ Audio recording stopped");
//                 const mimeType = recorder.mimeType || 'audio/webm';
//                 const blob = new Blob(chunks, { type: mimeType });
//                 const url = URL.createObjectURL(blob);
                
//                 // Create a more descriptive filename
//                 const timestamp = Date.now();
//                 const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
//                 const fileName = `audio_recording_${timestamp}.${extension}`;
                
//                 const file = new File([blob], fileName, { type: mimeType });
                
//                 console.log("✅ Audio file created:", {
//                     name: fileName,
//                     size: file.size,
//                     type: file.type
//                 });
                
//                 setAudio({ file, url });
//                 stream.getTracks().forEach(track => track.stop());
//             };

//             recorder.onerror = (event) => {
//                 console.error("❌ Audio recording error:", event.error);
//                 stream.getTracks().forEach(track => track.stop());
//                 alert("Audio recording failed: " + event.error);
//             };

//             setMediaRecorder(recorder);
//             setRecordedChunks(chunks);
//             recorder.start(1000); // Collect data every second
//             setIsRecordingAudio(true);
            
//             console.log("✅ Audio recording started successfully");
//         } catch (error) {
//             console.error("❌ Error starting audio recording:", error);
//             alert("Could not access microphone. Please check permissions and try again.");
//         }
//     };

//     const startVideoRecording = async () => {
//         try {
//             console.log("📹 Starting video recording...");
//             const stream = await navigator.mediaDevices.getUserMedia({ 
//                 video: {
//                     width: { ideal: 1280 },
//                     height: { ideal: 720 },
//                     frameRate: { ideal: 30 }
//                 }, 
//                 audio: {
//                     echoCancellation: true,
//                     noiseSuppression: true
//                 }
//             });
            
//             if (videoPreviewRef.current) {
//                 videoPreviewRef.current.srcObject = stream;
//             }

//             // Use compatible video codec
//             const options = [];
//             if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
//                 options.push({ type: 'video/webm;codecs=vp9,opus' });
//             }
//             if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
//                 options.push({ type: 'video/webm;codecs=vp8,opus' });
//             }
//             if (MediaRecorder.isTypeSupported('video/webm')) {
//                 options.push({ type: 'video/webm' });
//             }
            
//             const recorderOptions = options.length > 0 ? options[0] : {};
//             console.log("🔍 Using video recorder options:", recorderOptions);

//             const recorder = new MediaRecorder(stream, recorderOptions);
//             const chunks = [];

//             recorder.ondataavailable = (event) => {
//                 console.log("📊 Video data available:", event.data.size, "bytes");
//                 if (event.data.size > 0) {
//                     chunks.push(event.data);
//                 }
//             };

//             recorder.onstop = () => {
//                 console.log("⏹️ Video recording stopped");
//                 const mimeType = recorder.mimeType || 'video/webm';
//                 const blob = new Blob(chunks, { type: mimeType });
//                 const url = URL.createObjectURL(blob);
                
//                 // Create a descriptive filename
//                 const timestamp = Date.now();
//                 const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
//                 const fileName = `video_recording_${timestamp}.${extension}`;
                
//                 const file = new File([blob], fileName, { type: mimeType });
                
//                 console.log("✅ Video file created:", {
//                     name: fileName,
//                     size: file.size,
//                     type: file.type
//                 });
                
//                 setVideo({ file, url });
//                 stream.getTracks().forEach(track => track.stop());
//                 if (videoPreviewRef.current) {
//                     videoPreviewRef.current.srcObject = null;
//                 }
//             };

//             recorder.onerror = (event) => {
//                 console.error("❌ Video recording error:", event.error);
//                 stream.getTracks().forEach(track => track.stop());
//                 if (videoPreviewRef.current) {
//                     videoPreviewRef.current.srcObject = null;
//                 }
//                 alert("Video recording failed: " + event.error);
//             };

//             setMediaRecorder(recorder);
//             setRecordedChunks(chunks);
//             recorder.start(1000); // Collect data every second
//             setIsRecordingVideo(true);
            
//             console.log("✅ Video recording started successfully");
//         } catch (error) {
//             console.error("❌ Error starting video recording:", error);
//             alert("Could not access camera/microphone. Please check permissions and try again.");
//         }
//     };

//     const stopRecording = () => {
//         if (mediaRecorder && mediaRecorder.state === 'recording') {
//             mediaRecorder.stop();
//             setIsRecordingAudio(false);
//             setIsRecordingVideo(false);
//             setMediaRecorder(null);
//         }
//     };

//     const scrollToBottom = () => {
//         endRef.current?.scrollIntoView({ behavior: 'smooth' });
//     };

//     useEffect(() => {
//         scrollToBottom();
//     }, [text, chat]);

//     const handleSend = async () => {
//         if (text === "" && !img.file && !audio.file && !video.file) return;
//         if (isUploading) return; // Prevent multiple sends

//         setIsUploading(true);
//         setUploadProgress(0);

//         let imgUrl = null;
//         let audioUrl = null;
//         let videoUrl = null;

//         try {
//             console.log("🔍 Starting message send process...");
//             console.log("- Has image:", !!img.file);
//             console.log("- Has audio:", !!audio.file);
//             console.log("- Has video:", !!video.file);
//             console.log("- Text:", text);

//             const totalFiles = [img.file, audio.file, video.file].filter(Boolean).length;
//             let completedFiles = 0;

//             // Upload files sequentially to avoid overwhelming Firebase
//             if(img.file){
//                 console.log("📤 Uploading image...");
//                 imgUrl = await upload(img.file);
//                 console.log("✅ Image uploaded:", imgUrl);
//                 completedFiles++;
//                 setUploadProgress((completedFiles / totalFiles) * 100);
//             }
            
//             if(audio.file){
//                 console.log("📤 Uploading audio...");
//                 audioUrl = await upload(audio.file);
//                 console.log("✅ Audio uploaded:", audioUrl);
//                 completedFiles++;
//                 setUploadProgress((completedFiles / totalFiles) * 100);
//             }
            
//             if(video.file){
//                 console.log("📤 Uploading video...");
//                 videoUrl = await upload(video.file);
//                 console.log("✅ Video uploaded:", videoUrl);
//                 completedFiles++;
//                 setUploadProgress((completedFiles / totalFiles) * 100);
//             }

//             // Prepare message data
//             const messageData = {
//                 senderId: currentUser.id,
//                 text: text || "", // Ensure text is never undefined
//                 createdAt: new Date(),
//             };

//             // Add media URLs only if they exist
//             if (imgUrl) messageData.img = imgUrl;
//             if (audioUrl) messageData.audio = audioUrl;
//             if (videoUrl) messageData.video = videoUrl;

//             console.log("💾 Saving message to Firestore:", messageData);

//             // Save message to Firestore
//             await updateDoc(doc(db, "chats", chatId), {
//                 messages: arrayUnion(messageData),
//             });

//             console.log("✅ Message saved to chat");

//             // Update user chats
//             const userIDs = [currentUser.id, user.id];

//             for (const id of userIDs) {
//                 try {
//                     const userChatsRef = doc(db, "userchats", id);
//                     const userChatsSnap = await getDoc(userChatsRef);

//                     if(userChatsSnap.exists()){
//                         const userChatsData = userChatsSnap.data();
//                         const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
                        
//                         if (chatIndex !== -1) {
//                             // Create a meaningful last message preview
//                             let lastMessage = text;
//                             if (!lastMessage) {
//                                 if (imgUrl) lastMessage = "📷 Image";
//                                 else if (audioUrl) lastMessage = "🎵 Audio";
//                                 else if (videoUrl) lastMessage = "🎥 Video";
//                                 else lastMessage = "📎 Media";
//                             }
                            
//                             userChatsData.chats[chatIndex].lastMessage = lastMessage;
//                             userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
//                             userChatsData.chats[chatIndex].updatedAt = Date.now();

//                             await updateDoc(userChatsRef, {
//                                 chats: userChatsData.chats,
//                             });
//                         }
//                     }
//                 } catch (userChatError) {
//                     console.error("❌ Error updating user chat for user:", id, userChatError);
//                 }
//             }

//             console.log("✅ User chats updated successfully");

//             // Clear form only after successful send
//             setImg({file: null, url:""});
//             setAudio({file: null, url:""});
//             setVideo({file: null, url:""});
//             setText("");
            
//             console.log("✅ Message sent successfully and form cleared");

//         } catch (err) {
//             console.error("❌ Error sending message:", err);
//             console.error("- Error code:", err.code);
//             console.error("- Error message:", err.message);
            
//             // Show user-friendly error messages
//             if (err.message.includes('Permission denied')) {
//                 alert("Permission denied. Please check your authentication and try again.");
//             } else if (err.message.includes('storage/unauthorized')) {
//                 alert("Upload permission denied. Please try logging out and back in.");
//             } else if (err.message.includes('quota-exceeded')) {
//                 alert("Storage quota exceeded. Please try again later.");
//             } else {
//                 alert(`Failed to send message: ${err.message}`);
//             }
//         } finally {
//             setIsUploading(false);
//             setUploadProgress(0);
//         }
//     };

//     const clearMedia = (type) => {
//         if (type === 'img') setImg({file: null, url: ""});
//         if (type === 'audio') setAudio({file: null, url: ""});
//         if (type === 'video') setVideo({file: null, url: ""});
//     };

//     // Enhanced Avatar Component with error handling
//     const Avatar = ({ src, alt, className = "" }) => {
//         const [imgSrc, setImgSrc] = useState(src);
//         const [hasError, setHasError] = useState(false);

//         useEffect(() => {
//             setImgSrc(src);
//             setHasError(false);
//         }, [src]);

//         const handleError = () => {
//             console.log("❌ Failed to load avatar:", src);
//             setHasError(true);
//             setImgSrc("./avatar.png");
//         };

//         const handleLoad = () => {
//             if (src && src !== "./avatar.png") {
//                 console.log("✅ Avatar loaded successfully:", src);
//             }
//         };

//         return (
//             <img 
//                 src={imgSrc || "./avatar.png"} 
//                 alt={alt}
//                 className={className}
//                 onError={handleError}
//                 onLoad={handleLoad}
//                 style={{ 
//                     objectFit: 'cover',
//                     border: hasError ? '2px solid #ff6b6b' : 'none'
//                 }}
//             />
//         );
//     };

//     return (
//       <>
//         <div className="chat_container">
//           <div className="top">
//             <div className="user">
//               <Avatar src={user?.avatar} alt="Chat user avatar" />
//               <div className="texts">
//                 <span>{user?.username || "John Doe"}</span>
//                 <p>Lorem ipsum dolor sit.</p>
//               </div>
//             </div>
//             <div className="icons">
//               <img src="./phone.png" alt="" />
//               <img src="./video.png" alt="Video call" />
//               <img src="./info.png" alt="" />
//             </div>
//           </div>

//           <div className="center">
//             {chat?.messages?.map((message, index) => (
//               <div
//                 className={
//                   message.senderId === currentUser?.id
//                     ? "message own"
//                     : "message"
//                 }
//                 key={index}
//               >
//                 <div className="texts">
//                   {message.img && (
//                     <Avatar src={message.img} alt="Message image" />
//                   )}
//                   {message.audio && (
//                     <div className="audio-player">
//                       <audio controls>
//                         <source src={message.audio} type="audio/webm" />
//                         <source src={message.audio} type="audio/mp3" />
//                         Your browser does not support the audio element.
//                       </audio>
//                     </div>
//                   )}
//                   {message.video && (
//                     <div className="video-player">
//                       <video controls width="300">
//                         <source src={message.video} type="video/webm" />
//                         <source src={message.video} type="video/mp4" />
//                         Your browser does not support the video element.
//                       </video>
//                     </div>
//                   )}
//                   <p>{message.text}</p>
//                   <span>
//                     {new Date(
//                       message.createdAt?.toDate
//                         ? message.createdAt.toDate()
//                         : message.createdAt
//                     ).toLocaleTimeString()}
//                   </span>
//                 </div>
//               </div>
//             ))}
            
//             {/* Preview attachments */}
//             {img.url && (
//               <div className="message own preview">
//                 <div className="texts">
//                   <Avatar src={img.url} alt="Preview image" />
//                   <button onClick={() => clearMedia('img')} className="clear-btn">×</button>
//                 </div>
//               </div>
//             )}
            
//             {audio.url && (
//               <div className="message own preview">
//                 <div className="texts">
//                   <div className="audio-player">
//                     <audio controls>
//                       <source src={audio.url} type="audio/webm" />
//                     </audio>
//                   </div>
//                   <button onClick={() => clearMedia('audio')} className="clear-btn">×</button>
//                 </div>
//               </div>
//             )}
            
//             {video.url && (
//               <div className="message own preview">
//                 <div className="texts">
//                   <div className="video-player">
//                     <video controls width="300">
//                       <source src={video.url} type="video/webm" />
//                     </video>
//                   </div>
//                   <button onClick={() => clearMedia('video')} className="clear-btn">×</button>
//                 </div>
//               </div>
//             )}
            
//             {/* Recording preview */}
//             {isRecordingVideo && (
//               <div className="recording-preview">
//                 <video ref={videoPreviewRef} autoPlay muted width="200" />
//                 <p>Recording video...</p>
//               </div>
//             )}
            
//             <div ref={endRef}></div>
//           </div>

//           <div className="bottom">
//             <div className="icons">
//               {/* Image upload */}
//               <label htmlFor="file">
//                 <img src="./img.png" alt="Upload image" />
//               </label>
//               <input
//                 type="file"
//                 id="file"
//                 style={{ display: "none" }}
//                 onChange={handleImg}
//                 accept="image/*"
//               />
              
//               {/* Audio upload */}
//               <label htmlFor="audio-file">
//                 <img src="./audio.png" alt="Upload audio" />
//               </label>
//               <input
//                 type="file"
//                 id="audio-file"
//                 style={{ display: "none" }}
//                 onChange={handleAudio}
//                 accept="audio/*"
//               />
              
//               {/* Video upload */}
//               <label htmlFor="video-file">
//                 <img src="./video-upload.png" alt="Upload video" />
//               </label>
//               <input
//                 type="file"
//                 id="video-file"
//                 style={{ display: "none" }}
//                 onChange={handleVideo}
//                 accept="video/*"
//               />
              
//               {/* Camera/Video recording */}
//               <img 
//                 src="./camera.png" 
//                 alt="Record video" 
//                 onClick={isRecordingVideo ? stopRecording : startVideoRecording}
//                 style={{ filter: isRecordingVideo ? 'brightness(1.5)' : 'none' }}
//               />
              
//               {/* Microphone/Audio recording */}
//               <img 
//                 src="./mic.png" 
//                 alt="Record audio" 
//                 onClick={isRecordingAudio ? stopRecording : startAudioRecording}
//                 style={{ filter: isRecordingAudio ? 'brightness(1.5)' : 'none' }}
//               />
              
//               {/* Stop recording button (visible when recording) */}
//               {(isRecordingAudio || isRecordingVideo) && (
//                 <button onClick={stopRecording} className="stop-recording">
//                   ⏹️ Stop
//                 </button>
//               )}
//             </div>
            
//             <input
//               type="text"
//               placeholder={
//                 isCurrentUserBlocked || IsReceiverBlocked
//                   ? "You cannot Send a message "
//                   : "Type a message..."
//               }
//               value={text}
//               onChange={(e) => setText(e.target.value)}
//               disabled={isCurrentUserBlocked || IsReceiverBlocked}
//               onKeyPress={(e) => e.key === "Enter" && handleSend()}
//             />
            
//             <div className="emoji">
//               <img src="./emoji.png" alt="" onClick={() => setOpen(!open)} />
//               <div className="picker">
//                 <EmojiPicker open={open} onEmojiClick={handleEmoji} />
//               </div>
//             </div>
            
//             <button
//               className="sendbutton"
//               onClick={handleSend}
//               disabled={isCurrentUserBlocked || IsReceiverBlocked || isUploading}
//               style={{
//                 opacity: isUploading ? 0.7 : 1,
//                 position: 'relative'
//               }}
//             >
//               {isUploading ? (
//                 <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                   <span>Uploading...</span>
//                   <div style={{ 
//                     width: '40px', 
//                     height: '4px', 
//                     background: 'rgba(255,255,255,0.3)', 
//                     borderRadius: '2px',
//                     overflow: 'hidden'
//                   }}>
//                     <div style={{
//                       width: `${uploadProgress}%`,
//                       height: '100%',
//                       background: 'white',
//                       transition: 'width 0.3s ease'
//                     }}></div>
//                   </div>
//                 </div>
//               ) : (
//                 "Send"
//               )}
//             </button>
//           </div>
//         </div>
//       </>
//     );
// };

// export default Chat;

 //chatId was used to replace the hardcoded chatId at create of chatStore
        //we go do logic at app.jsx for chatId presence
