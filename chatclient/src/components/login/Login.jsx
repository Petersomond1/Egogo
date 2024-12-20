// filepath: /Egogo/chatclient/src/components/login/Login.jsx
import React, { useState } from 'react';
import './Login.css';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
 import { auth } from '../lib/firebase'; // wked when off here and user true at Api.jsx showed home page too. but ReferenceError: auth is not defined


const Login = () => {
    const [avatar, setAvatar] = useState({ file: null, url: '' });

    const handleAvatar = (e) => {
        setAvatar({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        const { username, email, password } = Object.fromEntries(formData);

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            toast.success("User registered successfully!");
        } catch (err) {
            console.log(err);
            toast.error(err.message);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        // console.log('Login');
        toast.warn("");
    };

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
                <form onSubmit={handleRegister}>
                    <label htmlFor="file">
                        <img src={avatar.url} alt="" />
                        Upload an Image
                    </label>
                    <input type="file" id="file" style={{ display: 'none' }} onChange={handleAvatar} />
                    <input type="text" placeholder="Username" name="username" />
                    <input type="email" placeholder="Email" name="email" />
                    <input type="password" placeholder="Password" name="password" />
                    <button type="submit">Sign Up</button>
                </form>
            </div>
        </div>
    );
};

export default Login;