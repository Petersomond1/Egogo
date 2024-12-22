import { useState } from 'react';
import { db } from '../../../lib/firebase';
import './AddUser.css';
import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { updateCurrentUser } from 'firebase/auth';
import { useUserStore } from '../../../lib/userStore';
import { getDoc } from 'firebase/firestore';

const AddUser = () => {
    const [user, setUser] = useState(null);

    const {currentUser} = useUserStore();


    const handleSearch = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');

        try {                               // we need a condition and we'll need query now querySnapshot to get the data from the database.
           
const userRef = collection(db, "users");

// Create a query against the collection.
const q = query(userRef, where("username", "==", username));

const querySnapshot = await getDocs(q);

if (!querySnapshot.empty) {
setUser(querySnapshot.docs[0].data());
}
        } catch (err) {
            console.log(err);
        }
    }


const handleAdd = async () => {
        const chatRef = collection(db, "chats");        // we need to create a new chat document in the chats collection.
        const userChatsRef = collection(db, "userchats");   // we need to update the userchats document in the userchats collection.
        try {
            // To get the chatId, we need to create a newchat ref document in the chats collection.
            const newChatRef = doc(chatRef);
            
            await setDoc(newChatRef, {
                createdAt: serverTimestamp(),
                messages: [],
            });

            await updateDoc(doc(userChatsRef, user.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: currentUser.id,   // we import this from store.
                    updatedAt: Date.now(),      // we can't use serverTimestamp bc of above use. so, we use Date.now() instead.
                }),
            });

            await updateDoc(doc(userChatsRef, currentUser.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: user.id,   
                    updatedAt: Date.now(),      
                }),
            });
        } catch (err) {
            console.log(err);
        }
    }
     // we need a condition to check if the user exists before displaying the user details.
            // it reads: if user exists, display these user details.
    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder='Username' name='username' />
                <button>Search</button>
            </form>
           
            {user && <div className='user'>
                        <div className="detail">
                            <img src={user.avatar || "./avatar.png"} alt="" />
                            <span>{user.username}</span>
                        </div>
                        <button onClick={handleAdd}>Add User</button>
                     </div>
              }
         </div>
    )
}

export default AddUser;