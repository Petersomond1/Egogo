import React from 'react'
import './detail.css'
import { auth } from '../lib/firebase'

const Detail = () => {
    return (
        <div className="detail_container">
            <div className="user">
                <img src="./avatar.png" alt="" />
                <h2>Robert King</h2>
                <p>
                    Lorem ipsum dolor sit amet consectetur adipisicing!
                </p>
            </div>
            <div className="info">
                <div className="option">
                <div className="title">
                <span>Chat Settings</span>
                <img src="./arrowUp.png" alt="" />
                </div>
                </div>
                <div className="option">
                <div className="title">
                <span>Privacy & help</span>
                <img src="./arrowUp.png" alt="" />
                </div>
                </div>
                <div className="option">
                <div className="title">
                <span>Shared Photos</span>
                <img src="./arrowDown.png" alt="" />
                </div>
                <div className="photos">
                    <div className="photoItem">
                        <div className="photoDetail">
                        <img src="./image.png" alt="" />
                        <span>photo_name_2024</span>
                        </div>
                    <img src="./download.png" alt="icon" className='icon' />
                    </div>
                    <div className="photoItem">
                        <div className="photoDetail">
                        <img src="./image.png" alt="" />
                        <span>photo_name_2024</span>
                        </div>
                    <img src="./download.png" alt="icon" className='icon' />
                    </div>
                    <div className="photoItem">
                        <div className="photoDetail">
                        <img src="./image.png" alt="" />
                        <span>photo_name_2024</span>
                        </div>
                    <img src="./download.png" alt="icon" className='icon' />
                    </div>
                </div>
                </div>
                
                <button>Block User</button>
                <button className='logout' onClick={()=>auth.signOut()}>Logout</button> //this onclick changes the state of the user to null. appllied at APP.jsx useEffect.
               
            </div>
        </div>
    )
}

export default Detail