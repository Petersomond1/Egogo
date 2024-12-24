import { create } from 'zustand'
import { db } from '../lib/firebase'
import { doc, getDoc } from 'firebase/firestore'



export const useUserStore = create((set) => ({
  currentUser: null,
    isLoading: true,
 fetchUserInfo: async(uid) =>{
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {

        const docRef = doc(db, "users", uid);   // called a reference to the document
        const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        set({ currentUser: docSnap.data(), isLoading: false });
    }else{
        set({ currentUser: null, isLoading: false });
        console.log("No such document!");
    }    
    } catch (err) {
        console.log(err);
         set({ currentUser: null, isLoading: false });
        
    }

 }

}))

//   increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
//   removeAllBears: () => set({ bears: 0 }),
//   updateBears: (newBears) => set({ bears: newBears }),

//Here we use the "doc getDoc" function to get the user data from the firestore database.
//We use the "create" function from zustand to create a store that will hold the user data.
//We use the "set" function to update the store with the user data.
//We use the "fetchUserInfo" function to fetch the user data from the firestore database.
//We use the "currentUser" and "isLoading" variables to store the user data and loading state respectively.
//We use the "useUserStore" hook to access the user data and loading state in our components.
//We use the "useEffect" hook to fetch the user data when the component mounts.
//We use the "onAuthStateChanged" function to listen for changes in the user authentication state.
//We use the "unSub" function to unsubscribe from the user authentication state changes.
//We use the "currentUser" variable to conditionally render the chat or login page based on the user authentication state.
//We use the "isLoading" variable to show a loading indicator while fetching the user data.
//We use the "Notification" component to show a loading indicator while fetching the user data.
//We use the "currentUser" variable to conditionally render the chat or login page based on the user authentication state.
