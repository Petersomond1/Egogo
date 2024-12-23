import React, { useEffect, useRef, useState } from 'react';
import './chat.css';
import EmojiPicker from 'emoji-picker-react';
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';
import { useUserStore } from '../lib/userStore';

const Chat = () => {
    const [chat, setChat] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');

    const { currentUser } = useUserStore();
    const { chatId, user } = useChatStore();

    const endRef = useRef(null);

    useEffect(() => {
endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        //chatId was used to replace the hardcoded chatId at create of chatStore
        //we go do logic at app.jsx for chatId presence
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

    const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [text]);

    const handleSend = async () => {
        if (text === "") return;

        try {
            await updateDoc(doc(db, "chats", chatId), {
                messages: arrayUnion({
                    senderId: currentUser.id,
                    text,
                    createdAt: new Date(),
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



    };

  
    return (
      <>
             <div className="chat_container">
            <div className="top">
                <div className="user">
                    <img src="./avatar.png" alt="" />
                    <div className="texts">
                        <span>John Doe</span>
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
                  {chat?.messages?.map((message) => (
                  <div className="message own" key = {message?.creadtedAt}>
                      <div className="texts">
                         {message.img && <img src={message.img} alt="" />}
                          <p>
                             {message.text}
                          </p>
                      </div>
                  </div>
            ))}
                {/* Add more messages here */}
                <div ref={endRef}></div>
            </div>

            <div className="bottom">
                <div className="icons">
                    <img src="./img.png" alt="" />
                    <img src="./camera.png" alt="" />
                    <img src="./mic.png" alt="" />
                </div>
                <input type="text" placeholder="Type a message...." value={text} onChange={e => setText(e.target.value)} />
                <div className="emoji">
                    <img src="./emoji.png" alt="" onClick={() => setOpen(!open)} />
                    <div className="picker">
                        <EmojiPicker open={open} onEmojiClick={handleEmoji} />
                    </div>
                </div>
                <button className="sendbutton" onClick={handleSend}>Send</button>
            </div>


            
           </div>


        </>
    );
};

export default Chat;