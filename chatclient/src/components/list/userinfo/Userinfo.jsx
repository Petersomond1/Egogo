import react from 'react';
import './userinfo.css';

const Userinfo = () => {
    return (
        <div className="userinfo_container"> 
        <div className='user'>
            <img src="./avatar.png" alt="" />
            <h2>mond pete</h2>
        </div>
        <div className='icons'>
            <img src="./more.png" alt="" />
            <img src="./video.png" alt="" />
            <img src="edit.png" alt="" />
        </div>
        </div>
    )
}

export default Userinfo
