import { doc, getDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from './firebase';

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,
  
  fetchUserInfo: async (uid) => {
    // console.log("🔍 fetchUserInfo called with UID:", uid);
    
    if (!uid) {
      console.log("🔍 No UID provided, setting currentUser to null");
      set({ currentUser: null, isLoading: false });
      return;
    }

    try {
      // console.log("🔍 Fetching user document from Firestore...");
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        // console.log("✅ User document found:", userData);
        set({ currentUser: userData, isLoading: false });
      } else {
        console.log("❌ No user document found in Firestore for UID:", uid);
        console.log("🔧 This usually means the user registered but the Firestore document wasn't created properly");
        
        // Set currentUser to null so the "Create Missing Profile" button appears
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.error("❌ Error fetching user info:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // On error, also set currentUser to null
      set({ currentUser: null, isLoading: false });
    }
  },
}));

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
