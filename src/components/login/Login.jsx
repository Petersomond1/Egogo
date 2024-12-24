// filepath: /Egogo/chatclient/src/components/login/Login.jsx
import React, { useState } from 'react';
import './Login.css';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth, db } from '../lib/firebase'; // ../lib/firebase. wked when off here and user true at Api.jsx showed home page too. but ReferenceError: auth is not defined
import { doc, setDoc } from 'firebase/firestore';
import Upload from '../lib/upload';



const Login = () => {
    const [avatar, setAvatar] = useState({ file: null, url: '' });

    const [loading, setLoading] = useState(false);

    const handleAvatar = (e) => {
        setAvatar({ file: e.target.files[0], url: URL.createObjectURL(e.target.files[0]) });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);

        const { username, email, password } = Object.fromEntries(formData);

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);

            const imgUrl = await Upload(avatar.file);

            await setDoc(doc(db, 'users', res.user.uid), {
                username,
                email,
                avatar: imgUrl,
                id: res.user.uid,
                blocked: [],
            });

            await setDoc(doc(db, 'userchats', res.user.uid), {
                chats: [],
            });

            toast.success("User registered successfully! You can now login.");
            
        } catch (err) {
            console.log(err);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);

        const { email, password } = Object.fromEntries(formData);


        try {
            await signInWithEmailAndPassword(auth, email, password );
            
        } catch (err) {
            console.log(err);
            toast.error(err.message);
            
        }
       finally {
            setLoading(false);
        }
    };

    return (
        <div className="login">
            <div className="item">
                <h2>Welcome Back, Login</h2>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email" name="email" />
                    <input type="password" placeholder="Password" name="password" />
                    <button disabled={loading} type="submit">{loading ? "loading" : "Login"}</button>
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
                    <button disabled={loading} type="submit">{loading ? "loading" : "Sign up"}</button>
                </form>
            </div>
        </div>
    );
};

export default Login;