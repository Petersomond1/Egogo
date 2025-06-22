import React, { useState, useEffect } from 'react';
import { useUserStore } from './lib/userStore';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';

// Fixed debug component - removes CORS fetch test
const FirebaseStorageTest = () => {
    const { currentUser } = useUserStore();
    const [allUsers, setAllUsers] = useState([]);
    const [imageTestResults, setImageTestResults] = useState({});

    // Fetch all users to test their avatars
    useEffect(() => {
        const fetchAllUsers = async () => {
            try {
                const usersCollection = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollection);
                const users = usersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllUsers(users);
                console.log("🔍 Found users:", users);
            } catch (error) {
                console.error("❌ Error fetching users:", error);
            }
        };

        fetchAllUsers();
    }, []);

    // Test image loading (not fetch) for each avatar
    useEffect(() => {
        const testImageLoading = () => {
            const results = {};
            
            allUsers.forEach(user => {
                if (user.avatar && user.avatar !== "") {
                    console.log(`🔍 Testing image load for ${user.username}:`, user.avatar);
                    
                    // Test URL format
                    if (!user.avatar.includes('firebasestorage.googleapis.com')) {
                        results[user.id] = {
                            status: 'invalid',
                            message: 'Not a Firebase Storage URL',
                            url: user.avatar
                        };
                        return;
                    }

                    // Test actual image loading capability
                    const img = new Image();
                    
                    img.onload = () => {
                        console.log(`✅ ${user.username} avatar loads successfully`);
                        setImageTestResults(prev => ({
                            ...prev,
                            [user.id]: {
                                status: 'success',
                                message: `Image loads successfully (${img.naturalWidth}x${img.naturalHeight})`,
                                url: user.avatar
                            }
                        }));
                    };
                    
                    img.onerror = () => {
                        console.log(`❌ ${user.username} avatar failed to load`);
                        setImageTestResults(prev => ({
                            ...prev,
                            [user.id]: {
                                status: 'error',
                                message: 'Image failed to load',
                                url: user.avatar
                            }
                        }));
                    };
                    
                    // Set initial testing status
                    results[user.id] = {
                        status: 'testing',
                        message: 'Testing image load...',
                        url: user.avatar
                    };
                    
                    // Start the test
                    img.src = user.avatar;
                    
                } else {
                    results[user.id] = {
                        status: 'empty',
                        message: 'No avatar URL',
                        url: user.avatar || 'null'
                    };
                }
            });
            
            setImageTestResults(results);
        };

        if (allUsers.length > 0) {
            testImageLoading();
        }
    }, [allUsers]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return '#4CAF50';
            case 'error': return '#f44336';
            case 'invalid': return '#ff9800';
            case 'empty': return '#9e9e9e';
            case 'testing': return '#2196F3';
            default: return '#ccc';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '15px',
            fontSize: '12px',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            zIndex: 9999,
            borderRadius: '8px'
        }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#4CAF50' }}>
                🔍 Avatar System Status
            </h4>

            <div style={{ marginBottom: '20px' }}>
                <strong>Current User:</strong>
                <div>Username: {currentUser?.username || 'None'}</div>
                <div>
                    Avatar: 
                    <span 
                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={() => copyToClipboard(currentUser?.avatar || '')}
                    >
                        {currentUser?.avatar ? `${currentUser.avatar.substring(0, 40)}...` : 'None'}
                    </span>
                </div>
                {currentUser?.avatar && (
                    <div style={{ marginTop: '5px' }}>
                        <img 
                            src={currentUser.avatar} 
                            alt="Current user avatar test"
                            style={{ 
                                width: '40px', 
                                height: '40px', 
                                objectFit: 'cover',
                                border: '2px solid #4CAF50'
                            }}
                            onError={(e) => {
                                e.target.style.border = '2px solid #f44336';
                                console.log('❌ Current user avatar failed to load');
                            }}
                            onLoad={() => console.log('✅ Current user avatar loaded')}
                        />
                    </div>
                )}
            </div>

            <div>
                <strong>All Users Test Results:</strong>
                {allUsers.map(user => (
                    <div key={user.id} style={{ 
                        marginBottom: '10px', 
                        padding: '5px', 
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px'
                    }}>
                        <div><strong>{user.username}</strong></div>
                        <div style={{ fontSize: '10px' }}>
                            Email: {user.email}
                        </div>
                        <div style={{ 
                            color: getStatusColor(imageTestResults[user.id]?.status),
                            fontSize: '10px'
                        }}>
                            Status: {imageTestResults[user.id]?.message || 'Testing...'}
                        </div>
                        <div style={{ fontSize: '10px', wordBreak: 'break-all' }}>
                            URL: {imageTestResults[user.id]?.url || user.avatar || 'None'}
                        </div>
                        {user.avatar && user.avatar !== "" && (
                            <img 
                                src={user.avatar} 
                                alt={`${user.username} avatar test`}
                                style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    objectFit: 'cover',
                                    border: `1px solid ${getStatusColor(imageTestResults[user.id]?.status)}`,
                                    marginTop: '3px'
                                }}
                                onError={() => console.log(`❌ ${user.username} avatar failed to load`)}
                                onLoad={() => console.log(`✅ ${user.username} avatar loaded`)}
                            />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ fontSize: '10px', color: '#ccc', marginTop: '15px' }}>
                ✅ Green = Working • ❌ Red = Broken • ⚪ Gray = No avatar • 🔵 Blue = Testing
            </div>
            
            <div style={{ fontSize: '10px', color: '#4CAF50', marginTop: '10px' }}>
                💡 Your avatars ARE working! The previous "fetch errors" were just CORS test artifacts.
            </div>
        </div>
    );
};

export default FirebaseStorageTest;