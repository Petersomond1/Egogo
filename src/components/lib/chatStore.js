import { create } from 'zustand'
import { db } from './firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useUserStore } from './userStore'

export const useChatStore = create((set, get) => ({
  chatId: null,
  user: null, // For individual chats
  chatData: null, // For group chat data
  isCurrentUserBlocked: false,
  isReceiverBlocked: false,
  isGroupChat: false,
  groupMembers: [],
  
  changeChat: async (chatId, user = null, isGroup = false) => {
    const currentUser = useUserStore.getState().currentUser;
    
    if (isGroup) {
      // Handle group chat
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        const chatData = chatDoc.data();
        
        return set({
          chatId,
          user: null,
          chatData,
          isCurrentUserBlocked: false,
          isReceiverBlocked: false,
          isGroupChat: true,
          groupMembers: chatData?.members || [],
        });
      } catch (error) {
        console.error("Error fetching group chat:", error);
        return;
      }
    } else {
      // Handle individual chat (existing logic)
      if(user.blocked.includes(currentUser.id)){
        return set({
          chatId,
          user: null,
          chatData: null,
          isCurrentUserBlocked: true,
          isReceiverBlocked: false,
          isGroupChat: false,
          groupMembers: [],
        });
      }
      else if(currentUser.blocked.includes(user.id)){
        return set({
          chatId,
          user: user,
          chatData: null,
          isCurrentUserBlocked: false,
          isReceiverBlocked: true,
          isGroupChat: false,
          groupMembers: [],
        });
      } else {
        return set({
          chatId,
          user: user,
          chatData: null,
          isCurrentUserBlocked: false,
          isReceiverBlocked: false,
          isGroupChat: false,
          groupMembers: [],
        });
      }
    }
  },
  
  changeBlock: () => {
    set((state) => ({...state, isReceiverBlocked: !state.isReceiverBlocked}))
  },
  
  updateGroupMembers: (members) => {
    set((state) => ({ ...state, groupMembers: members }));
  },
  
  clearChat: () => {
    set({
      chatId: null,
      user: null,
      chatData: null,
      isCurrentUserBlocked: false,
      isReceiverBlocked: false,
      isGroupChat: false,
      groupMembers: [],
    });
  }
}));