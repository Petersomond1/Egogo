import { useState } from 'react';
import { db } from '../../../lib/firebase';
import './AddUser.css';
import { arrayUnion, collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useUserStore } from '../../../lib/userStore';

const AddUser = () => {
    const [user, setUser] = useState(null);
    const [avatarError, setAvatarError] = useState(false);
    const [loading, setLoading] = useState(false);

    const { currentUser } = useUserStore();

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const formData = new FormData(e.target);
        const username = formData.get('username');

        try {
            // Reset previous results
            setUser(null);
            setAvatarError(false);
            
            console.log("🔍 Searching for user:", username);
            
            const userRef = collection(db, "users");
            const q = query(userRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const foundUser = querySnapshot.docs[0].data();
                console.log("✅ User found:", foundUser);
                setUser(foundUser);
            } else {
                console.log("❌ No user found with username:", username);
                setUser(null);
            }
        } catch (err) {
            console.error("❌ Search error:", err);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    const handleAdd = async () => {
        if (!user || !currentUser) {
            console.log("❌ Missing user or currentUser for adding chat");
            return;
        }

        setLoading(true);
        console.log("💬 Creating chat between:", currentUser.username, "and", user.username);

        try {
            const chatRef = collection(db, "chats");
            const userChatsRef = collection(db, "userchats");
            
            // Create new chat document
            const newChatRef = doc(chatRef);
            
            await setDoc(newChatRef, {
                createdAt: serverTimestamp(),
                messages: [],
            });
            console.log("✅ Chat document created:", newChatRef.id);

            // Update the found user's chats
            await updateDoc(doc(userChatsRef, user.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: currentUser.id,
                    updatedAt: Date.now(),
                }),
            });

            // Update current user's chats
            await updateDoc(doc(userChatsRef, currentUser.id), {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: "",
                    receiverId: user.id,
                    updatedAt: Date.now(),
                }),
            });

            console.log("✅ Chat created successfully!", newChatRef.id);
            
            // Reset form and user
            setUser(null);
            setAvatarError(false);
            
            // Clear the search input
            document.querySelector('input[name="username"]').value = '';
            
        } catch (err) {
            console.error("❌ Error creating chat:", err);
        } finally {
            setLoading(false);
        }
    }

    // Handle avatar loading error
    const handleAvatarError = () => {
        console.log("❌ Failed to load user avatar:", user?.avatar);
        setAvatarError(true);
    };

    // Handle successful avatar load
    const handleAvatarLoad = () => {
        if (user?.avatar && user.avatar !== "./avatar.png") {
            console.log("✅ User avatar loaded successfully:", user.avatar);
            setAvatarError(false);
        }
    };

    // Determine avatar source with proper fallback
    const getAvatarSrc = () => {
        if (user?.avatar && user.avatar.trim() !== "" && !avatarError) {
            return user.avatar;
        }
        return "./avatar.png";
    };

    return (
        <div className="addUser">
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
           
            {user && (
                <div className='user'>
                    <div className="detail">
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <img 
                                src={getAvatarSrc()}
                                alt={`${user.username}'s avatar`}
                                onError={handleAvatarError}
                                onLoad={handleAvatarLoad}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: avatarError ? '2px solid #ff6b6b' : '2px solid #ddd'
                                }}
                            />
                            
                            {/* Debug indicator for avatar status */}
                            {user.avatar && user.avatar.trim() !== "" && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: avatarError ? '#ff6b6b' : '#4CAF50',
                                    border: '2px solid white',
                                    fontSize: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {avatarError ? '!' : '✓'}
                                </div>
                            )}
                        </div>
                        
                        <div style={{ marginLeft: '10px' }}>
                            <span style={{ fontWeight: 'bold' }}>{user.username}</span>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {user.email}
                            </div>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleAdd}
                        disabled={loading}
                        style={{
                            backgroundColor: loading ? '#ccc' : '#4CAF50',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Adding...' : 'Add User'}
                    </button>
                </div>
            )}

            {/* Debug info for avatar status */}
            {user && (
                <div style={{
                    fontSize: '10px',
                    color: '#666',
                    marginTop: '10px',
                    padding: '5px',
                    background: '#f5f5f5',
                    borderRadius: '3px'
                }}>
                    <div>Avatar Debug:</div>
                    <div>URL: {user.avatar || "None"}</div>
                    <div>Using: {getAvatarSrc()}</div>
                    <div>Error: {avatarError ? "Yes" : "No"}</div>
                </div>
            )}
         </div>
    )
}

export default AddUser;