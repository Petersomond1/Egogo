import React, { useEffect, useState } from 'react';
import './chatlist.css';
import AddUser from './addUser/AddUser';
import { useUserStore } from '../../lib/userStore';
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from '../../lib/firebase';
import { useChatStore } from '../../lib/chatStore';

const Chatlist = () => {

const [chats, setChats] = useState([]);
const [addMode, setAddMode] = useState(false);
const [input, setInput] = useState("");

const { currentUser } = useUserStore();
const {chatId, changeChat} = useChatStore();

console.log("currentUser", currentUser)

useEffect(() => {
    if (!currentUser) return;

    const unsub = onSnapshot(doc(db, "userchats", currentUser.id), async (res) => {
        const items = res.data()?.chats || [];

        const promises = items.map(async item => {
            const userDocRef = doc(db, "users", item.receiverId);
            const userDocSnap = await getDoc(userDocRef);

            const user = userDocSnap.data();

            return { ...item, user };
        });

        const chatData = await Promise.all(promises);
        setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    console.log("chats", chats);

    return () => {
        unsub();
    };
}, [currentUser.id]);

const handleSelect = async (chat) => {

const userChats = chats.map(item => {
const{user, ...rest} = item;
return rest;
})

const chatIndex = userChats.findIndex((item) => item.chatId === chat.chatId);

userChats[chatIndex].isSeen = true;

const userChatsRef = doc(db, "userchats", currentUser.id);

try {
await updateDoc(userChatsRef, {
    chats: userChats,
});
    changeChat(chat.chatId, chat.user);

} catch (err) { console.log(err); 
    
}
};



const filteredChats = chats.filter(chat => chat.user.username.toLowerCase().includes(input.toLowerCase()));
console.log("filteredChats", filteredChats);

return (
    <div className="chatlist_container">
        <div className="search">
            <div className="searchbar">
                <img src="./search.png" alt="" />
                <input type="text" placeholder="Search" onChange={(e)=>setInput(e.target.value)} />
            </div>
            <img src={addMode ? "./minus.png" : "./plus.png"} alt="" className='add'
                onClick={() => setAddMode(!addMode)}
            />
        </div>

        {filteredChats?.map(chat => (
            <div className="item" key={chat.chatId} onClick={()=>handleSelect(chat)} style={{
                /* background: chatId === chat.chatId ? "rgba(0, 0, 0, 0.1)" : "white", */
                backgroundColor:chat?.isSeen ? "transparent" : "#5183fe", // if the chat is seen, the background color is transparent, else it is blue.
            }} >
                <img src={chat.user.blocked.includes(currentUser.id) ? "./avatar.png" : chat.user?.avatar || "./avatar.png"} alt="" />
                <div className="texts">
                    <span>{chat.user.blocked.includes(currentUser.id) ? "User" : chat.user?.username}</span>
                    <p>{chat.lastMessage}</p>
                    <p>{new Date(chat.updatedAt).toLocaleTimeString()}</p>
                </div>
            </div>
        ))}
        {addMode && <AddUser />}
    </div>
);
}

export default Chatlist;


