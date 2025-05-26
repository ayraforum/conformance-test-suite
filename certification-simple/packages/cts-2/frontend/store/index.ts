import { configureStore } from "@reduxjs/toolkit";
import dagReducer from "./dagSlice";
import invitationReducer from "./invitationSlice";
import socketReducer from "./socketSlice";

export const store = configureStore({
  reducer: {
    dag: dagReducer,
    invitation: invitationReducer,
    socket: socketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
