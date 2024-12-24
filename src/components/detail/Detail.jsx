import React from 'react'
import './detail.css'
import { auth, db } from '../lib/firebase'
import { useUserStore } from '../lib/userStore'
import { useChatStore } from '../lib/chatStore'
import {updateDoc, doc} from 'firebase/firestore'
import { arrayRemove, arrayUnion } from '@firebase/firestore'



const Detail = () => {
    const {chatId, user, isCurrentUserBlocked, isReceiverBlocked, changeBlock } = useChatStore();
    const {currentUser} = useUserStore();

    const handleBlock = async () => {
       if(!user) return;

const userDocRef = doc(db, "users", currentUser.id);

       try {
        await updateDoc(userDocRef, {
            blocked: isReceiverBlocked ? arrayRemove(user.id) : arrayUnion(user.id),
        })
        changeBlock();
       } catch (err) {
           console.log(err);
        
       }
    }
    return (
        <div className="detail_container">
            <div className="user">
                <img src={user?.avatar || "./avatar.png"}alt="" />
                <h2>{user?.username}</h2>
                <p>
                    Lorem ipsum dolor sit amet consectetur adipisicing!
                </p>
            </div>
            <div className="info">
                <div className="option">
                <div className="title">
                <span>Chat Settings</span>
                <img src="./arrowUp.png" alt="" />
                </div>
                </div>
                <div className="option">
                <div className="title">
                <span>Privacy & help</span>
                <img src="./arrowUp.png" alt="" />
                </div>
                </div>
                <div className="option">
                <div className="title">
                <span>Shared Photos</span>
                <img src="./arrowDown.png" alt="" />
                </div>
                
                </div>
                
                <button onClick={handleBlock}>{isCurrentUserBlocked ? "You are Blocked!" : isReceiverBlocked ? "User blocked" : "Block User"}</button>
                <button className='logout' onClick={()=>auth.signOut()}>Logout</button> 
               
            </div>
        </div>
    )
}//this onclick of logout changes the state of the user to null. appllied at APP.jsx useEffect.

export default Detail