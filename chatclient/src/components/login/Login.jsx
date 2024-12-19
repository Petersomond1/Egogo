import React from 'react';
import './Login.css';

const Login = () => {
    const [avatar, setAvatar] = React.useState({file:null, url:''});

    const handleAvatar = (e) => {
        setAvatar({file:e.target.files[0], url:URL.createObjectURL(e.target.files[0])});
    }

    const handleLogin = (e) => {
        e.preventDefault();
        // console.log('Login');
        toast.warn("")
    }

    return (
        <div className="login">
            <div className="item">
            <h2>Welcome Back, Login</h2>
            <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" name="email" />
                <input type="password" placeholder="Password" name="password" />
                <button type="submit">Login</button>
            </form>
            </div>
            <div className="separator"></div>
            <div className="item">
            <h2>Create an Account</h2>
            <form>
                <label htmlFor="file">
                    <img src="" alt="" />
                    Upload an Image</label>
                <input type="file" id="file" style={{display:'none'}} onChange={handleAvatar}/>
                <input type="text" placeholder="Username" name="username" />
                <input type="email" placeholder="Email" name="email" />
                <input type="password" placeholder="Password" name="password" />
                <button type="submit">Sign Up</button>
            </form>
              </div>
        </div>
    );
}
// Note for error or success messages, we used toastify library. hence we created notification folder
export default Login;