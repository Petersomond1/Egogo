import React, { useEffect, useRef, useState } from 'react';
import './chat.css';
import EmojiPicker from 'emoji-picker-react';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';
import { useUserStore } from '../lib/userStore';
import upload from '../lib/upload';

const Chat = () => {
    const [chat, setChat] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');
    const [img, setImg] = React.useState({file: null, url: ""});
    const [audio, setAudio] = React.useState({file: null, url: ""});
    const [video, setVideo] = React.useState({file: null, url: ""});
    
    // Recording states
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [isRecordingVideo, setIsRecordingVideo] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    
    // Additional state for better UX
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const { currentUser } = useUserStore();
    const { chatId, user, isCurrentUserBlocked, IsReceiverBlocked } = useChatStore();

    const endRef = useRef(null);
    const videoPreviewRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!chatId) return;
       
        const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
            setChat(res.data());
        }); 
        return () => unSub();
    }, [chatId]);

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
            
            // Use a more compatible codec
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
            console.log("🔍 Using recorder options:", recorderOptions);
            
            const recorder = new MediaRecorder(stream, recorderOptions);
            const chunks = [];

            recorder.ondataavailable = (event) => {
                console.log("📊 Audio data available:", event.data.size, "bytes");
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                console.log("⏹️ Audio recording stopped");
                const mimeType = recorder.mimeType || 'audio/webm';
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                // Create a more descriptive filename
                const timestamp = Date.now();
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const fileName = `audio_recording_${timestamp}.${extension}`;
                
                const file = new File([blob], fileName, { type: mimeType });
                
                console.log("✅ Audio file created:", {
                    name: fileName,
                    size: file.size,
                    type: file.type
                });
                
                setAudio({ file, url });
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.onerror = (event) => {
                console.error("❌ Audio recording error:", event.error);
                stream.getTracks().forEach(track => track.stop());
                alert("Audio recording failed: " + event.error);
            };

            setMediaRecorder(recorder);
            setRecordedChunks(chunks);
            recorder.start(1000); // Collect data every second
            setIsRecordingAudio(true);
            
            console.log("✅ Audio recording started successfully");
        } catch (error) {
            console.error("❌ Error starting audio recording:", error);
            alert("Could not access microphone. Please check permissions and try again.");
        }
    };

    const startVideoRecording = async () => {
        try {
            console.log("📹 Starting video recording...");
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }, 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
            }

            // Use compatible video codec
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
            console.log("🔍 Using video recorder options:", recorderOptions);

            const recorder = new MediaRecorder(stream, recorderOptions);
            const chunks = [];

            recorder.ondataavailable = (event) => {
                console.log("📊 Video data available:", event.data.size, "bytes");
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                console.log("⏹️ Video recording stopped");
                const mimeType = recorder.mimeType || 'video/webm';
                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                
                // Create a descriptive filename
                const timestamp = Date.now();
                const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                const fileName = `video_recording_${timestamp}.${extension}`;
                
                const file = new File([blob], fileName, { type: mimeType });
                
                console.log("✅ Video file created:", {
                    name: fileName,
                    size: file.size,
                    type: file.type
                });
                
                setVideo({ file, url });
                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = null;
                }
            };

            recorder.onerror = (event) => {
                console.error("❌ Video recording error:", event.error);
                stream.getTracks().forEach(track => track.stop());
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = null;
                }
                alert("Video recording failed: " + event.error);
            };

            setMediaRecorder(recorder);
            setRecordedChunks(chunks);
            recorder.start(1000); // Collect data every second
            setIsRecordingVideo(true);
            
            console.log("✅ Video recording started successfully");
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

    const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [text, chat]);

    const handleSend = async () => {
        if (text === "" && !img.file && !audio.file && !video.file) return;
        if (isUploading) return; // Prevent multiple sends

        setIsUploading(true);
        setUploadProgress(0);

        let imgUrl = null;
        let audioUrl = null;
        let videoUrl = null;

        try {
            console.log("🔍 Starting message send process...");
            console.log("- Has image:", !!img.file);
            console.log("- Has audio:", !!audio.file);
            console.log("- Has video:", !!video.file);
            console.log("- Text:", text);

            const totalFiles = [img.file, audio.file, video.file].filter(Boolean).length;
            let completedFiles = 0;

            // Upload files sequentially to avoid overwhelming Firebase
            if(img.file){
                console.log("📤 Uploading image...");
                imgUrl = await upload(img.file);
                console.log("✅ Image uploaded:", imgUrl);
                completedFiles++;
                setUploadProgress((completedFiles / totalFiles) * 100);
            }
            
            if(audio.file){
                console.log("📤 Uploading audio...");
                audioUrl = await upload(audio.file);
                console.log("✅ Audio uploaded:", audioUrl);
                completedFiles++;
                setUploadProgress((completedFiles / totalFiles) * 100);
            }
            
            if(video.file){
                console.log("📤 Uploading video...");
                videoUrl = await upload(video.file);
                console.log("✅ Video uploaded:", videoUrl);
                completedFiles++;
                setUploadProgress((completedFiles / totalFiles) * 100);
            }

            // Prepare message data
            const messageData = {
                senderId: currentUser.id,
                text: text || "", // Ensure text is never undefined
                createdAt: new Date(),
            };

            // Add media URLs only if they exist
            if (imgUrl) messageData.img = imgUrl;
            if (audioUrl) messageData.audio = audioUrl;
            if (videoUrl) messageData.video = videoUrl;

            console.log("💾 Saving message to Firestore:", messageData);

            // Save message to Firestore
            await updateDoc(doc(db, "chats", chatId), {
                messages: arrayUnion(messageData),
            });

            console.log("✅ Message saved to chat");

            // Update user chats
            const userIDs = [currentUser.id, user.id];

            for (const id of userIDs) {
                try {
                    const userChatsRef = doc(db, "userchats", id);
                    const userChatsSnap = await getDoc(userChatsRef);

                    if(userChatsSnap.exists()){
                        const userChatsData = userChatsSnap.data();
                        const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
                        
                        if (chatIndex !== -1) {
                            // Create a meaningful last message preview
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

            console.log("✅ User chats updated successfully");

            // Clear form only after successful send
            setImg({file: null, url:""});
            setAudio({file: null, url:""});
            setVideo({file: null, url:""});
            setText("");
            
            console.log("✅ Message sent successfully and form cleared");

        } catch (err) {
            console.error("❌ Error sending message:", err);
            console.error("- Error code:", err.code);
            console.error("- Error message:", err.message);
            
            // Show user-friendly error messages
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

    const clearMedia = (type) => {
        if (type === 'img') setImg({file: null, url: ""});
        if (type === 'audio') setAudio({file: null, url: ""});
        if (type === 'video') setVideo({file: null, url: ""});
    };

    // Enhanced Avatar Component with error handling
    const Avatar = ({ src, alt, className = "" }) => {
        const [imgSrc, setImgSrc] = useState(src);
        const [hasError, setHasError] = useState(false);

        useEffect(() => {
            setImgSrc(src);
            setHasError(false);
        }, [src]);

        const handleError = () => {
            console.log("❌ Failed to load avatar:", src);
            setHasError(true);
            setImgSrc("./avatar.png");
        };

        const handleLoad = () => {
            if (src && src !== "./avatar.png") {
                console.log("✅ Avatar loaded successfully:", src);
            }
        };

        return (
            <img 
                src={imgSrc || "./avatar.png"} 
                alt={alt}
                className={className}
                onError={handleError}
                onLoad={handleLoad}
                style={{ 
                    objectFit: 'cover',
                    border: hasError ? '2px solid #ff6b6b' : 'none'
                }}
            />
        );
    };

    return (
      <>
        <div className="chat_container">
          <div className="top">
            <div className="user">
              <Avatar src={user?.avatar} alt="Chat user avatar" />
              <div className="texts">
                <span>{user?.username || "John Doe"}</span>
                <p>Lorem ipsum dolor sit.</p>
              </div>
            </div>
            <div className="icons">
              <img src="./phone.png" alt="" />
              <img src="./video.png" alt="Video call" />
              <img src="./info.png" alt="" />
            </div>
          </div>

          <div className="center">
            {chat?.messages?.map((message, index) => (
              <div
                className={
                  message.senderId === currentUser?.id
                    ? "message own"
                    : "message"
                }
                key={index}
              >
                <div className="texts">
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
              {/* Image upload */}
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
              
              {/* Audio upload */}
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
              
              {/* Video upload */}
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
              
              {/* Camera/Video recording */}
              <img 
                src="./camera.png" 
                alt="Record video" 
                onClick={isRecordingVideo ? stopRecording : startVideoRecording}
                style={{ filter: isRecordingVideo ? 'brightness(1.5)' : 'none' }}
              />
              
              {/* Microphone/Audio recording */}
              <img 
                src="./mic.png" 
                alt="Record audio" 
                onClick={isRecordingAudio ? stopRecording : startAudioRecording}
                style={{ filter: isRecordingAudio ? 'brightness(1.5)' : 'none' }}
              />
              
              {/* Stop recording button (visible when recording) */}
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

 //chatId was used to replace the hardcoded chatId at create of chatStore
        //we go do logic at app.jsx for chatId presence
