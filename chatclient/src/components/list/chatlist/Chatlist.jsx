import {React, useEffect, useState} from 'react';
import './chatlist.css';
import AddUser from './addUser/AddUser';
import {useUserStore} from '../../lib/userStore';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from '../../lib/firebase';

const Chatlist = () => {
    const [addMode, setAddMode] = useState(false)
    const [chats, setChats] = useState([]);

    const {currentUser} = useUserStore();

    useEffect(() => {
        // doc becomes res
        if (!currentUser) return;
                    const unsub = onSnapshot(doc(db, "userchats", currentUser.id), async (res) => {
                        // console.log("Current data: ", doc.data());
                        const items = res.data()?.chats || [];  // we get the chats array from the userchats document.
                      //  setChats(doc.data());

                      const promises = items.map(async item => {
                          const userDocRef = doc(db, "users", item.receiverId);  // receiverId first introduced. it is the id of the user the current user is chatting with.
                            const userDocSnap = await getDoc(userDocRef);

                            const user = userDocSnap.data();

                            return {...items, user};
                      });
                      const chatData = await Promise.all(promises);
                        setChats(chatData.sort((a, b)=> b.updatedAt - a.UpdatedAt));         // setChats(doc.data()); and you sort() the chats array by the lastMessage timestamp.
                    }); 
                    return () => unsub();
    }, [currentUser.id])
    return (
        <div className="chatlist_container"> 
        <div className="search">
            <div className="searchbar">
                <img src="./search.png" alt="" />
                <input type="text" placeholder="Search" />
            </div>
            <img src={addMode ? "./minus.png" : "./plus.png"} alt="" className='add'
            onClick={() => setAddMode(!addMode)}
             />
        </div>

        {chats.map(chat => (
        <div className="item" key={chat.chatId}>
            <img src={chat.user.avatar || "./avatar.png" }alt="" />
            <div className="texts">
                <span>{chat.user?.username}</span>
                <p>{chat.lastMessage}</p>
                {/* <p>{new Date(chat.updatedAt).toLocaleTimeString()}</p> */}
            </div>
        </div>
        ))}
       {addMode && <AddUser />}
        </div>
    )
}   

export default Chatlist;

// Addition of the AddUser component to the Chatlist component ends the clientside design of the chat application.
// The next step is to implement the backend logic of the chat application.
// The backend logic will be implemented using Node.js, Express.js and Socket.io.

