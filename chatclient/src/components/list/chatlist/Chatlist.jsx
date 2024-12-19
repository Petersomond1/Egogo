import {react, useState} from 'react';
import './chatlist.css';
import AddUser from './addUser/AddUser';

const Chatlist = () => {
    const [addMode, setAddMode] = useState(false)

    
    return (
        <div className="chatlist_container"> 
        <div className="search">
            <div className="searchbar">
                <img src="./search.png" alt="" />
                <input type="text" placeholder="Search" />
            </div>
            <img src={addMode ? "./minus.png" : "./plus.png"} alt="" className='add'
            onClick={() => setAddMode(!addMode)}
             />
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
        <div className="item">
            <img src="./avatar.png" alt="" />
            <div className="texts">
                <h2>mond pete</h2>
                <p>hello</p>
            </div>
            <p>12:00</p>
        </div>
       {addMode && <AddUser />}
        </div>
    )
}   

export default Chatlist