import { create } from 'zustand'
import { db } from '../../firebase'
import { doc, getDoc } from 'firebase/firestore'


//Here we use the "doc getDoc" function to get the user data from the firestore database.
export const useUserStore = create((set) => ({
  currentUser: null,
    isLoading: true,
 fetchUserInfo: async(uid) =>{
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {

        const docRef = doc(db, "users", "uid");   // called a reference to the document
        const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        set({ currentUser: docSnap.data(), isLoading: false });
        // console.log("Document data:", docSnap.data());
    }else{
        set({ currentUser: null, isLoading: false });
        // console.log("No such document!");
    }    
    } catch (err) {
        console.log(err);
        return set({ currentUser: null, isLoading: false });
        
    }

 }
//   increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
//   removeAllBears: () => set({ bears: 0 }),
//   updateBears: (newBears) => set({ bears: newBears }),
}))