import React, { useState, useEffect } from 'react';
import Login from './Login';
import Signup from './Signup';

const AuthContainer = () => {
    const [showLogin, setShowLogin] = useState(true);

    useEffect(() => {
        // Make functions globally available for switching
        window.showLogin = () => setShowLogin(true);
        window.showSignup = () => setShowLogin(false);

        // Cleanup
        return () => {
            delete window.showLogin;
            delete window.showSignup;
        };
    }, []);

    return (
        <div>
            {showLogin ? <Login /> : <Signup />}
        </div>
    );
};

export default AuthContainer;