import React, { useEffect, useRef, useState } from 'react';
import './chat.css';
import EmojiPicker from 'emoji-picker-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useChatStore } from '../lib/chatStore';

const Chat = () => {
    const [chat, setChat] = React.useState(null);
    const [open, setOpen] = React.useState(false);
    const [text, setText] = React.useState('');

    const { chatId } = useChatStore();

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

    console.log(text);
    return (
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
            {chat?.messages?.map((message, index) => (
                <div key={index}>
                  <div className={`message ${message.senderId === "SE40NtRoPFMvqJero3xH9VU8nvY2" ? "own" : ""}`}>
                    <img src="./avatar.png" alt="" />
                    <div className="texts">
                        <p>{message.text}</p>
                        <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className="message own">
                      <div className="texts">
                          <img src="./image.png" alt="" />
                          <p>
                              Lorem, ipsum dolor sit amet consectetur adipisicing elit. 
                              Animi repudiandae fugit ratione dolorem eos temporibus quaerat 
                              adipisci saepe accusantium blanditiis molestias quo rerum fugiat,
                              vitae, atque perspiciatis magnam consectetur error!
                          </p>
                          <span>1 min ago</span>
                      </div>
                  </div>
                  <div className="message">
                      <img src="./avatar.png" alt="" />
                      <div className="texts">
                          <p>
                              Lorem, ipsum dolor sit amet consectetur adipisicing elit. 
                              Animi repudiandae fugit ratione dolorem eos temporibus quaerat 
                              adipisci saepe accusantium blanditiis molestias quo rerum fugiat,
                              vitae, atque perspiciatis magnam consectetur error!
                          </p>
                          <span>1 min ago</span>
                      </div>
                  </div>
                  <div className="message own">
                      <div className="texts">
                          <img src="./image.png" alt="" />
                          <p>
                              Lorem, ipsum dolor sit amet consectetur adipisicing elit. 
                              Animi repudiandae fugit ratione dolorem eos temporibus quaerat 
                              adipisci saepe accusantium blanditiis molestias quo rerum fugiat,
                              vitae, atque perspiciatis magnam consectetur error!
                          </p>
                          <span>1 min ago</span>
                      </div>
                  </div>
                  <div className="message">
                      <img src="./avatar.png" alt="" />
                      <div className="texts">
                          <p>
                              Lorem, ipsum dolor sit amet consectetur adipisicing elit. 
                              Animi repudiandae fugit ratione dolorem eos temporibus quaerat 
                              adipisci saepe accusantium blanditiis molestias quo rerum fugiat,
                              vitae, atque perspiciatis magnam consectetur error!
                          </p>
                          <span>1 min ago</span>
                      </div>
                  </div>
                  <div className="message own">
                      <div className="texts">
                          <img src="./image.png" alt="" />
                          <p>
                              Lorem, ipsum dolor sit amet consectetur adipisicing elit. 
                              Animi repudiandae fugit ratione dolorem eos temporibus quaerat 
                              adipisci saepe accusantium blanditiis molestias quo rerum fugiat,
                              vitae, atque perspiciatis magnam consectetur error!
                          </p>
                          <span>1 min ago</span>
                      </div>
                  </div>
                </div>
            ))}
                {/* Add more messages here */}
                <div ref={endRef} />
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
                <button className="sendbutton">Send</button>
            </div>
        </div>
    );
};

export default Chat;