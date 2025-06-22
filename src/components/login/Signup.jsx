import React, { useState } from 'react';
import './signup.css';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import upload from '../lib/upload';

const Signup = () => {
    const [avatar, setAvatar] = useState({ file: null, url: '' });
    const [loading, setLoading] = useState(false);

    const handleAvatar = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            console.log("🔍 Avatar file selected:", file.name, file.size, file.type);
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error("Please select a valid image file");
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB");
                return;
            }

            setAvatar({ 
                file: file, 
                url: URL.createObjectURL(file) 
            });
            console.log("✅ Avatar preview created");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const { username, email, password } = Object.fromEntries(formData);

        console.log('🔍 Registration attempt:', { username, email });
        console.log('📁 Avatar file:', avatar.file);

        try {
            // Create user account first
            console.log("👤 Creating user account...");
            const res = await createUserWithEmailAndPassword(auth, email, password);
            console.log('✅ User created successfully:', res.user.uid);

            // Handle avatar upload - WAIT for upload to complete
            let imgUrl = "";
            if (avatar.file) {
                console.log('📤 Starting avatar upload...');
                try {
                    imgUrl = await upload(avatar.file);
                    console.log('✅ Avatar uploaded successfully:', imgUrl);
                    
                    // Verify the URL is valid
                    if (!imgUrl || imgUrl.trim() === "") {
                        console.log("❌ Upload returned empty URL");
                        toast.error("Avatar upload failed - empty URL returned");
                        imgUrl = ""; // Use empty string for consistency
                    }
                } catch (uploadError) {
                    console.error("❌ Avatar upload failed:", uploadError);
                    toast.error("Avatar upload failed. Account created without profile picture.");
                    imgUrl = ""; // Continue with account creation even if upload fails
                }
            } else {
                console.log('📁 No avatar file selected, using default');
            }

            // Create user document in Firestore with the avatar URL
            const userData = {
                username,
                email,
                avatar: imgUrl, // This should now be a valid Firebase Storage URL or empty string
                id: res.user.uid,
                blocked: [],
            };

            console.log('💾 Saving user data:', userData);
            console.log('💾 Avatar URL being saved:', imgUrl);

            await setDoc(doc(db, 'users', res.user.uid), userData);
            console.log('✅ User document created in Firestore');

            await setDoc(doc(db, 'userchats', res.user.uid), {
                chats: [],
            });
            console.log('✅ User chats document created');

            toast.success("Account created successfully! You can now login.");
            
            // Reset form
            e.target.reset();
            setAvatar({ file: null, url: '' });
            
            // Switch to login view
            setTimeout(() => {
                window.showLogin?.();
            }, 1500);
            
        } catch (err) {
            console.error('❌ Registration error:', err);
            console.error('Error code:', err.code);
            console.error('Error message:', err.message);
            
            // More specific error messages
            if (err.code === 'auth/email-already-in-use') {
                toast.error("Email already in use. Try logging in instead.");
            } else if (err.code === 'auth/weak-password') {
                toast.error("Password should be at least 6 characters.");
            } else if (err.code === 'auth/invalid-email') {
                toast.error("Please enter a valid email address.");
            } else if (err.code === 'storage/unauthorized') {
                toast.error("Image upload failed. Please try again or skip the image.");
            } else {
                toast.error(`Registration failed: ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup">
            <div className="item">
                <h2>Create Account</h2>
                <form onSubmit={handleRegister}>
                    <label htmlFor="file" className="avatar-upload">
                        <img src={avatar.url || "./avatar.png"} alt="Avatar" />
                        <span>Upload Profile Image</span>
                    </label>
                    <input 
                        type="file" 
                        id="file" 
                        style={{ display: 'none' }} 
                        onChange={handleAvatar}
                        accept="image/*"
                    />
                    <input type="text" placeholder="Username" name="username" required />
                    <input type="email" placeholder="Email" name="email" required />
                    <input 
                        type="password" 
                        placeholder="Password (min 6 characters)" 
                        name="password" 
                        minLength="6" 
                        required 
                    />
                    <button disabled={loading} type="submit">
                        {loading ? "Creating account..." : "Sign Up"}
                    </button>
                </form>
                
                <div className="switch-form">
                    <p>Already have an account? <span onClick={() => window.showLogin?.()}>Sign in</span></p>
                </div>

                {/* Debug info - remove in production */}
                {avatar.file && (
                    <div style={{ 
                        fontSize: '10px', 
                        color: '#666', 
                        marginTop: '10px',
                        padding: '5px',
                        background: '#f5f5f5',
                        borderRadius: '3px'
                    }}>
                        <div>Selected file: {avatar.file.name}</div>
                        <div>Size: {(avatar.file.size / 1024).toFixed(1)} KB</div>
                        <div>Type: {avatar.file.type}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Signup;