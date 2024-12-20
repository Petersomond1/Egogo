import React from "react"
import Chat from "./components/chat/Chat"
import Detail from "./components/detail/Detail"
import List from "./components/list/List"
import Login from "./components/login/Login"

const App = () => {

// To mimick that user is login or not, or to see the login page, we set user to true or false
  const user = false;
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