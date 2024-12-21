import './AddUser.css';

const AddUser = () => {


    const handleSearch = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');

        try {                               // we need a condition and we'll need query now querySnapshot to get the data from the database.
            
        } catch (err) {
            
        }
    }
    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder='Username' name='username' />
                <button>Search</button>
            </form>
            <div className='user'>
                <div className="detail">
                    <img src="./avatar.png" alt="" />
                    <span>Igbo Yoruba</span>
                </div>
                <button>Add User</button>
            </div>

        </div>
    )
}

export default AddUser;