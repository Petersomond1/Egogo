import { useState } from 'react';
import { db } from '../../../lib/firebase';
import './AddUser.css';
import { collection, getDocs, query, where } from "firebase/firestore";

const AddUser = () => {
    const [user, setUser] = useState(null);


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
                        <button>Add User</button>
                     </div>
              }
         </div>
    )
}

export default AddUser;