import { useState } from 'react';
import { db } from '../../../lib/firebase';
import './AddUser.css';
import { 
  arrayUnion, 
  collection, 
  doc, 
  getDocs, 
  query, 
  serverTimestamp, 
  setDoc, 
  updateDoc, 
  where 
} from "firebase/firestore";
import { useUserStore } from '../../../lib/userStore';

const AddUser = () => {
  const [user, setUser] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target);
    const username = formData.get('username');

    try {
      setUser(null);
      setSearchResults([]);
      setAvatarError(false);
      
      console.log("🔍 Searching for user:", username);
      
      const userRef = collection(db, "users");
      const q = query(userRef, where("username", ">=", username), where("username", "<=", username + '\uf8ff'));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const foundUsers = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(foundUser => foundUser.id !== currentUser.id); // Exclude current user
        
        console.log("✅ Users found:", foundUsers);
        
        if (isGroupMode) {
          setSearchResults(foundUsers);
        } else {
          setUser(foundUsers[0]);
        }
      } else {
        console.log("❌ No users found with username:", username);
        setUser(null);
        setSearchResults([]);
      }
    } catch (err) {
      console.error("❌ Search error:", err);
      setUser(null);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const addUserToSelection = (userToAdd) => {
    if (!selectedUsers.find(u => u.id === userToAdd.id)) {
      setSelectedUsers([...selectedUsers, userToAdd]);
    }
  };

  const removeUserFromSelection = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleCreateIndividualChat = async () => {
    if (!user || !currentUser) {
      console.log("❌ Missing user or currentUser for adding chat");
      return;
    }

    setLoading(true);
    console.log("💬 Creating individual chat between:", currentUser.username, "and", user.username);

    try {
      const chatRef = collection(db, "chats");
      const userChatsRef = collection(db, "userchats");
      
      const newChatRef = doc(chatRef);
      
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
        isGroup: false,
        members: [currentUser.id, user.id],
      });

      await updateDoc(doc(userChatsRef, user.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: currentUser.id,
          updatedAt: Date.now(),
          isGroup: false,
        }),
      });

      await updateDoc(doc(userChatsRef, currentUser.id), {
        chats: arrayUnion({
          chatId: newChatRef.id,
          lastMessage: "",
          receiverId: user.id,
          updatedAt: Date.now(),
          isGroup: false,
        }),
      });

      console.log("✅ Individual chat created successfully!");
      resetForm();
      
    } catch (err) {
      console.error("❌ Error creating individual chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroupChat = async () => {
    if (selectedUsers.length < 1 || !groupName.trim()) {
      alert("Please select at least one user and provide a group name");
      return;
    }

    setLoading(true);
    console.log("👥 Creating group chat with users:", selectedUsers.map(u => u.username));

    try {
      const chatRef = collection(db, "chats");
      const userChatsRef = collection(db, "userchats");
      
      const newChatRef = doc(chatRef);
      const allMembers = [currentUser, ...selectedUsers];
      
      // Create group chat document
      await setDoc(newChatRef, {
        createdAt: serverTimestamp(),
        messages: [],
        isGroup: true,
        groupName: groupName.trim(),
        groupAdmin: currentUser.id,
        members: allMembers.map(member => ({
          id: member.id,
          username: member.username,
          avatar: member.avatar || "",
          joinedAt: Date.now(),
          role: member.id === currentUser.id ? "admin" : "member"
        })),
        memberIds: allMembers.map(member => member.id),
      });

      // Update all members' userchats
      for (const member of allMembers) {
        await updateDoc(doc(userChatsRef, member.id), {
          chats: arrayUnion({
            chatId: newChatRef.id,
            lastMessage: "",
            updatedAt: Date.now(),
            isGroup: true,
            groupName: groupName.trim(),
            groupAvatar: "", // Can be added later
          }),
        });
      }

      console.log("✅ Group chat created successfully!");
      resetForm();
      
    } catch (err) {
      console.error("❌ Error creating group chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUser(null);
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName('');
    setAvatarError(false);
    document.querySelector('input[name="username"]').value = '';
  };

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  const handleAvatarLoad = () => {
    setAvatarError(false);
  };

  const getAvatarSrc = (user) => {
    if (user?.avatar && user.avatar.trim() !== "" && !avatarError) {
      return user.avatar;
    }
    return "./avatar.png";
  };

  return (
    <div className="addUser">
      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button 
          onClick={() => setIsGroupMode(false)}
          className={!isGroupMode ? 'active' : ''}
        >
          Individual Chat
        </button>
        <button 
          onClick={() => setIsGroupMode(true)}
          className={isGroupMode ? 'active' : ''}
        >
          Group Chat
        </button>
      </div>

      {/* Group Name Input (only for group mode) */}
      {isGroupMode && (
        <input
          type="text"
          placeholder="Enter group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="group-name-input"
        />
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          placeholder='Search by username...' 
          name='username' 
          required
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Selected Users (for group mode) */}
      {isGroupMode && selectedUsers.length > 0 && (
        <div className="selected-users">
          <h4>Selected Users ({selectedUsers.length}):</h4>
          <div className="selected-users-list">
            {selectedUsers.map(selectedUser => (
              <div key={selectedUser.id} className="selected-user">
                <img src={getAvatarSrc(selectedUser)} alt="avatar" />
                <span>{selectedUser.username}</span>
                <button onClick={() => removeUserFromSelection(selectedUser.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {isGroupMode ? (
        // Group Mode: Show multiple search results
        searchResults.length > 0 && (
          <div className="search-results">
            <h4>Search Results:</h4>
            {searchResults.map(foundUser => (
              <div key={foundUser.id} className='user'>
                <div className="detail">
                  <img src={getAvatarSrc(foundUser)} alt="avatar" />
                  <div>
                    <span>{foundUser.username}</span>
                    <div className="email">{foundUser.email}</div>
                  </div>
                </div>
                <button 
                  onClick={() => addUserToSelection(foundUser)}
                  disabled={selectedUsers.find(u => u.id === foundUser.id)}
                >
                  {selectedUsers.find(u => u.id === foundUser.id) ? 'Added' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        // Individual Mode: Show single user result
        user && (
          <div className='user'>
            <div className="detail">
              <img src={getAvatarSrc(user)} alt="avatar" />
              <div>
                <span>{user.username}</span>
                <div className="email">{user.email}</div>
              </div>
            </div>
            <button onClick={handleCreateIndividualChat} disabled={loading}>
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        )
      )}

      {/* Create Group Button */}
      {isGroupMode && (
        <button 
          onClick={handleCreateGroupChat}
          disabled={loading || selectedUsers.length < 1 || !groupName.trim()}
          className="create-group-btn"
        >
          {loading ? 'Creating...' : `Create Group (${selectedUsers.length + 1} members)`}
        </button>
      )}
    </div>
  );
};

export default AddUser;




// import { useState } from 'react';
// import { db } from '../../../lib/firebase';
// import './AddUser.css';
// import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
// import { useUserStore } from '../../../lib/userStore';

// const AddUser = () => {
//     const [user, setUser] = useState(null);
//     const [avatarError, setAvatarError] = useState(false);
//     const [loading, setLoading] = useState(false);

//     const { currentUser } = useUserStore();

//     const handleSearch = async (e) => {
//         e.preventDefault();
//         setLoading(true);
        
//         const formData = new FormData(e.target);
//         const username = formData.get('username');

//         try {
//             // Reset previous results
//             setUser(null);
//             setAvatarError(false);
            
//             console.log("🔍 Searching for user:", username);
            
//             const userRef = collection(db, "users");
//             const q = query(userRef, where("username", "==", username));
//             const querySnapshot = await getDocs(q);

//             if (!querySnapshot.empty) {
//                 const foundUser = querySnapshot.docs[0].data();
//                 console.log("✅ User found:", foundUser);
//                 setUser(foundUser);
//             } else {
//                 console.log("❌ No user found with username:", username);
//                 setUser(null);
//             }
//         } catch (err) {
//             console.error("❌ Search error:", err);
//             setUser(null);
//         } finally {
//             setLoading(false);
//         }
//     }

//     const handleAdd = async () => {
//         if (!user || !currentUser) {
//             console.log("❌ Missing user or currentUser for adding chat");
//             return;
//         }

//         setLoading(true);
//         console.log("💬 Creating chat between:", currentUser.username, "and", user.username);

//         try {
//             const chatRef = collection(db, "chats");
//             const userChatsRef = collection(db, "userchats");
            
//             // Create new chat document
//             const newChatRef = doc(chatRef);
            
//             await setDoc(newChatRef, {
//                 createdAt: serverTimestamp(),
//                 messages: [],
//             });
//             console.log("✅ Chat document created:", newChatRef.id);

//             // Update the found user's chats
//             await updateDoc(doc(userChatsRef, user.id), {
//                 chats: arrayUnion({
//                     chatId: newChatRef.id,
//                     lastMessage: "",
//                     receiverId: currentUser.id,
//                     updatedAt: Date.now(),
//                 }),
//             });

//             // Update current user's chats
//             await updateDoc(doc(userChatsRef, currentUser.id), {
//                 chats: arrayUnion({
//                     chatId: newChatRef.id,
//                     lastMessage: "",
//                     receiverId: user.id,
//                     updatedAt: Date.now(),
//                 }),
//             });

//             console.log("✅ Chat created successfully!", newChatRef.id);
            
//             // Reset form and user
//             setUser(null);
//             setAvatarError(false);
            
//             // Clear the search input
//             document.querySelector('input[name="username"]').value = '';
            
//         } catch (err) {
//             console.error("❌ Error creating chat:", err);
//         } finally {
//             setLoading(false);
//         }
//     }

//     // Handle avatar loading error
//     const handleAvatarError = () => {
//         console.log("❌ Failed to load user avatar:", user?.avatar);
//         setAvatarError(true);
//     };

//     // Handle successful avatar load
//     const handleAvatarLoad = () => {
//         if (user?.avatar && user.avatar !== "./avatar.png") {
//             console.log("✅ User avatar loaded successfully:", user.avatar);
//             setAvatarError(false);
//         }
//     };

//     // Determine avatar source with proper fallback
//     const getAvatarSrc = () => {
//         if (user?.avatar && user.avatar.trim() !== "" && !avatarError) {
//             return user.avatar;
//         }
//         return "./avatar.png";
//     };

//     return (
//         <div className="addUser">
//             <form onSubmit={handleSearch}>
//                 <input 
//                     type="text" 
//                     placeholder='Search by username...' 
//                     name='username' 
//                     required
//                     disabled={loading}
//                 />
//                 <button type="submit" disabled={loading}>
//                     {loading ? 'Searching...' : 'Search'}
//                 </button>
//             </form>
           
//             {user && (
//                 <div className='user'>
//                     <div className="detail">
//                         <div style={{ position: 'relative', display: 'inline-block' }}>
//                             <img 
//                                 src={getAvatarSrc()}
//                                 alt={`${user.username}'s avatar`}
//                                 onError={handleAvatarError}
//                                 onLoad={handleAvatarLoad}
//                                 style={{
//                                     width: '40px',
//                                     height: '40px',
//                                     borderRadius: '50%',
//                                     objectFit: 'cover',
//                                     border: avatarError ? '2px solid #ff6b6b' : '2px solid #ddd'
//                                 }}
//                             />
                            
//                             {/* Debug indicator for avatar status */}
//                             {user.avatar && user.avatar.trim() !== "" && (
//                                 <div style={{
//                                     position: 'absolute',
//                                     bottom: '-2px',
//                                     right: '-2px',
//                                     width: '12px',
//                                     height: '12px',
//                                     borderRadius: '50%',
//                                     backgroundColor: avatarError ? '#ff6b6b' : '#4CAF50',
//                                     border: '2px solid white',
//                                     fontSize: '8px',
//                                     display: 'flex',
//                                     alignItems: 'center',
//                                     justifyContent: 'center'
//                                 }}>
//                                     {avatarError ? '!' : '✓'}
//                                 </div>
//                             )}
//                         </div>
                        
//                         <div style={{ marginLeft: '10px' }}>
//                             <span style={{ fontWeight: 'bold' }}>{user.username}</span>
//                             <div style={{ fontSize: '12px', color: '#666' }}>
//                                 {user.email}
//                             </div>
//                         </div>
//                     </div>
                    
//                     <button 
//                         onClick={handleAdd}
//                         disabled={loading}
//                         style={{
//                             backgroundColor: loading ? '#ccc' : '#4CAF50',
//                             cursor: loading ? 'not-allowed' : 'pointer'
//                         }}
//                     >
//                         {loading ? 'Adding...' : 'Add User'}
//                     </button>
//                 </div>
//             )}

//             {/* Debug info for avatar status */}
//             {user && (
//                 <div style={{
//                     fontSize: '10px',
//                     color: '#666',
//                     marginTop: '10px',
//                     padding: '5px',
//                     background: '#f5f5f5',
//                     borderRadius: '3px'
//                 }}>
//                     <div>Avatar Debug:</div>
//                     <div>URL: {user.avatar || "None"}</div>
//                     <div>Using: {getAvatarSrc()}</div>
//                     <div>Error: {avatarError ? "Yes" : "No"}</div>
//                 </div>
//             )}
//          </div>
//     )
// }

// export default AddUser;