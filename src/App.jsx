import { useEffect } from "react";
import Chat from "./components/chat/Chat";
import Detail from "./components/detail/Detail";
import List from "./components/list/List";
import AuthContainer from "./components/login/AuthContainer";
import Notification from "./components/notification/Notification";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./components/lib/firebase"; // Added db import
import { doc, getDoc, setDoc } from "firebase/firestore"; // Added Firestore functions
import { useUserStore } from "./components/lib/userStore";
import { useChatStore } from "./components/lib/chatStore";
// import FirebaseStorageTest from "./components/FirebaseStorageTest";

const App = () => {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();
  const { chatId } = useChatStore();

  console.log("🔍 App Debug Info:");
  console.log("Firebase Auth instance:", auth);

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, async (user) => { // Made callback async
      console.log("🔍 Auth state changed:", user ? "User logged in" : "User logged out");
      
      if (user) {
        console.log("🔍 User ID:", user.uid);
        console.log("🔍 User Email:", user.email);

        try {
          // Check if user document exists in Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            console.log("🔧 Creating missing user document...");
            
            // Auto-create missing profile
            await setDoc(userDocRef, {
              username: user.email.split('@')[0],
              email: user.email,
              avatar: "",
              id: user.uid,
              blocked: [],
            });

            // Also create userchats document
            await setDoc(doc(db, 'userchats', user.uid), {
              chats: [],
            });

            console.log("✅ Missing user document created successfully");
          } else {
            console.log("✅ User document already exists");
          }

          // Fetch user info after ensuring document exists
          await fetchUserInfo(user.uid);
          
        } catch (error) {
          console.error("❌ Error checking/creating user document:", error);
          console.error("Error code:", error.code);
          console.error("Error message:", error.message);
          
          // Still try to fetch user info even if there was an error
          fetchUserInfo(user.uid);
        }
        
      } else {
        console.log("🔍 No user logged in");
        fetchUserInfo(null);
      }
    });

    return () => {
      unSub();
    };
  }, [fetchUserInfo]);

  // Add detailed logging for render decisions
  console.log("🔍 Current render state:");
  console.log("- isLoading:", isLoading);
  console.log("- currentUser:", currentUser);
  console.log("- chatId:", chatId);

  if (isLoading) {
    console.log("🔍 Rendering: Loading state");
    return <div className="loading">Loading...</div>;
  }

  if (currentUser) {
    console.log("🔍 Rendering: Chat interface for user:", currentUser.username);
    return (
      <div className="container">
        <List />
        {chatId && <Chat />}
        {chatId && <Detail />}
        <Notification />
        {/* <FirebaseStorageTest /> */}
      </div>
    );
  } else {
    console.log("🔍 Rendering: AuthContainer (Login/Signup)");
    return <AuthContainer />;
  }
};

export default App;