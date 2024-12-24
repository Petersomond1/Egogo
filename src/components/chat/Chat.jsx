import React, { useEffect, useRef, useState } from 'react';
import './chat.css';
import EmojiPicker from 'emoji-picker-react';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';
import { useUserStore } from '../lib/userStore';
import upload  from '../lib/upload';

const Chat = () => {
    const [chat, setChat] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');
    const [img, setImg] = React.useState({file: null, url: ""});

    const { currentUser } = useUserStore();
    const { chatId, user, isCurrentUserBlocked, IsReceiverBlocked } = useChatStore();

    const endRef = useRef(null);

    useEffect(() => {
endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (!chatId) return;
       
        const unSub = onSnapshot(doc(db, "chats",  chatId), (res) => {
            setChat(res.data());
        }); 
        return () => unSub();
    }, [chatId]);
    
    console.log(chat);

    const handleEmoji = (e) => {
       setText((prev) => prev + e.emoji);
       setOpen(false);
    };

    const handleImg = async (e) => {
        const file = e.target.files[0];
        const url = await upload(file);
        setImg({ file, url });
    };

    const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // useEffect(() => {
    //     scrollToBottom();
    // }, []);

    useEffect(() => {
        scrollToBottom();
    }, [text, chat]);

    const handleSend = async () => {
        if (text === "" && !img.file) return;

        let imgUrl = null;

        try {

            if(img.file){

                imgUrl = await upload(img.file);
            }

            await updateDoc(doc(db, "chats", chatId), {
                messages: arrayUnion({
                    senderId: currentUser.id,
                    text,
                    createdAt: new Date(),
                    ...(imgUrl && {img: imgUrl}),
                }),
            });

            const userIDs = [currentUser.id, user.id];

            
            userIDs.forEach(async (id) => {

            const userChatsRef = doc(db, "userchats", id);
            const userChatsSnap = await getDoc(userChatsRef);

            if(userChatsSnap.exists()){
               const userChatsData = userChatsSnap.data();

                const chatIndex = userChatsData.chats.findIndex((chat) => chat.chatId === chatId);
            
                userChatsData.chats[chatIndex].lastMessage = text;
                userChatsData.chats[chatIndex].isSeen = id === currentUser.id ? true : false;
                userChatsData.chats[chatIndex].updatedAt = Date.now();

                await updateDoc(userChatsRef, {
                    chats: userChatsData.chats,
                });

            }
        });

        } catch (err) {
            console.log(err);
            
        }

        setImg({file: null, url:""});

        setText("");

    };

  
    return (
      <>
             <div className="chat_container">
            <div className="top">
                <div className="user">
                    <img src={user?.avatar || "./avatar.png"} alt="" />
                    <div className="texts">
                        <span>{user?.username || "John Doe" }</span>
                        <p>Lorem ipsum dolor sit.</p>
                    </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt="" />
                    <img src="./video.png" alt="" />
                    <img src="./info.png" alt="" />
                </div>
            </div>



            <div className="center">
                {chat?.messages?.map((message, index) => (
                    <div className={message.senderId === currentUser?.id ? "message own" : "message"} key={index}>
                        <div className="texts">
                            {message.img && <img src={message.img} alt="" />}
                            <p>{message.text}</p>
                            <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                        </div>
                    </div>
                ))}
                {img.url && <div className="message own">
                    <div className="texts">
                        <img src={img.url} alt="" />
                    </div>
                </div>}
                <div ref={endRef}></div>
            </div>

            <div className="bottom">
                <div className="icons">
                    <label htmlFor="file">
                        <img src="./img.png" alt="" />
                    </label>
                    <input type="file" id="file" style={{ display: 'none' }} onChange={handleImg} />
                    <img src="./camera.png" alt="" />
                    <img src="./mic.png" alt="" />
                </div>
                <input type="text" placeholder={(isCurrentUserBlocked || IsReceiverBlocked) ? "You cannot Send a message " : "Type a message..."}  value={text} onChange={e => setText(e.target.value)} disabled={isCurrentUserBlocked || IsReceiverBlocked} />
                <div className="emoji">
                    <img src="./emoji.png" alt="" onClick={() => setOpen(!open)} />
                    <div className="picker">
                        <EmojiPicker open={open} onEmojiClick={handleEmoji} />
                    </div>
                </div>
                <button className="sendbutton" onClick={handleSend} disabled={isCurrentUserBlocked || IsReceiverBlocked}>Send</button>
            </div>
        </div>

        </>
    );
};

export default Chat;



 //chatId was used to replace the hardcoded chatId at create of chatStore
        //we go do logic at app.jsx for chatId presence
