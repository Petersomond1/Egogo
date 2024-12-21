import React, { useEffect } from "react"
import Chat from "./components/chat/Chat"
import Detail from "./components/detail/Detail"
import List from "./components/list/List"
import Login from "./components/login/Login"
import Notification from "./components/notification/Notification"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "./components/lib/firebase"
import { toast } from "react-toastify"


const App = () => {

// To mimick that user is login or not, or to see the login page, we set user to true or false
  const user = false; // set to true to see the chat page and false to see the login page

  useEffect(() => {
    const unSub = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("login")
      } else {
        console.log("logout")
        toast.error("Please login to continue")
      }
    })
return () => {unSub()}

  }, [])

  return (
    <>
    <div className='container'>
      {user ? (
        <>
          <List />
          <Chat />
          <Detail />
        </>
      ) : (
        <Login/>
      )}
      
    </div>
    </>
  )
}

export default App