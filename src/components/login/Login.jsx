import React, { useState, useEffect } from 'react';
import './login.css';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useUserStore } from '../lib/userStore';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const { fetchUserInfo } = useUserStore();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const { email, password } = Object.fromEntries(formData);

        console.log('🔍 Login attempt:', email);

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Login successful:', result.user.uid);
            
            // Check if user document exists in Firestore
            const userDocRef = doc(db, 'users', result.user.uid);
            const userDocSnap = await getDoc(userDocRef);
            
            if (!userDocSnap.exists()) {
                console.log('🔧 User document missing, creating automatically...');
                await createUserProfile(result.user);
            }
            
            // Refresh user info in store
            await fetchUserInfo(result.user.uid);
            
            toast.success("Login successful!");
        } catch (err) {
            console.error('❌ Login error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            
            // More specific error messages
            if (err.code === 'auth/user-not-found') {
                toast.error("No account found with this email. Please register first.");
            } else if (err.code === 'auth/wrong-password') {
                toast.error("Incorrect password. Please try again.");
            } else if (err.code === 'auth/invalid-email') {
                toast.error("Please enter a valid email address.");
            } else if (err.code === 'auth/too-many-requests') {
                toast.error("Too many failed attempts. Please try again later.");
            } else if (err.code === 'auth/operation-not-allowed') {
                toast.error("Email/Password authentication is not enabled. Please contact support.");
            } else if (err.code === 'auth/invalid-credential') {
                toast.error("Invalid email or password. Please check your credentials.");
            } else {
                toast.error(`Login failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Automatic user profile creation
    const createUserProfile = async (user) => {
        try {
            console.log('🔧 Creating user profile for:', user.uid);
            
            await setDoc(doc(db, 'users', user.uid), {
                username: user.email.split('@')[0],
                email: user.email,
                avatar: "",
                id: user.uid,
                blocked: [],
            });

            await setDoc(doc(db, 'userchats', user.uid), {
                chats: [],
            });

            console.log('✅ User profile created successfully');
        } catch (error) {
            console.error("❌ Error creating user profile:", error);
            throw error;
        }
    };

    // Manual profile creation (backup method)
    const createMissingUserDocument = async () => {
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
            toast.error("Please login first");
            return;
        }

        try {
            await createUserProfile(currentUser);
            await fetchUserInfo(currentUser.uid);
            toast.success("User profile created successfully!");
        } catch (error) {
            console.error("Error creating user document:", error);
            toast.error("Failed to create user profile");
        }
    };

    return (
        <div className="login">
            <div className="item">
                <h2>Welcome Back</h2>
                <form onSubmit={handleLogin}>
                    <input type="email" placeholder="Email" name="email" required />
                    <input type="password" placeholder="Password" name="password" required />
                    <button disabled={loading} type="submit">
                        {loading ? "Logging in..." : "Sign In"}
                    </button>
                </form>
                
                {auth.currentUser && (
                    <div style={{marginTop: '10px'}}>
                        <button 
                            onClick={createMissingUserDocument} 
                            style={{
                                backgroundColor: '#4CAF50', 
                                color: 'white', 
                                padding: '10px 20px',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Create Missing Profile
                        </button>
                        <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                            Click if you're logged in but can't access chats
                        </p>
                    </div>
                )}
                
                <div className="switch-form">
                    <p>Don't have an account? <span onClick={() => window.showSignup?.()}>Sign up</span></p>
                </div>
            </div>
        </div>
    );
};

export default Login;