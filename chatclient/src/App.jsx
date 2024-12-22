import React, { useEffect } from "react"
import Chat from "./components/chat/Chat"
import Detail from "./components/detail/Detail"
import List from "./components/list/List"
import Login from "./components/login/Login"
import Notification from "./components/notification/Notification"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./components/lib/firebase"
import { toast } from "react-toastify"
import { useUserStore } from "./components/lib/userStore"
import { useChatStore } from "./components/lib/chatStore"


const App = () => {

// To mimick that user is login or not, or to see the login page, we set user to true or false
  // const user = false; // set to true to see the chat page and false to see the login page  
  // we remove it when we want to start store/state mgmt and tools

const {currentUser, isLoading, fetchUserInfo} = useUserStore()
const {chatId} = useChatStore()

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      fetchUserInfo(user?.uid)

      // if (user) {
      //   console.log("login")
      // } else {
      //   console.log("logout")
      //   toast.error("Please login to continue")
      // }
    })
return () => {unSub()}

  }, [fetchUserInfo]);

  console.log("currentUser", currentUser)

  if (isLoading) return <div className="loading">"Loading..."</div>
  // if (isLoading) return <Notification text="Loading..." />
//Note that currentUser was initially user
  return (
    <>
    <div className='container'> 
      {currentUser ? (
        <>
          <List />
          {chatId && <Chat />}
          {chatId && <Detail />}
        </>
      ) : (
        <Login/>
      )}
      
    </div>
    </>
  )
}

export default App