import { configureStore } from "@reduxjs/toolkit";
import dagReducer from "./dagSlice";
import invitationReducer from "./invitationSlice";
import socketReducer from "./socketSlice";
import testReducer from "./testSlice";
import { testProgressionMiddleware } from "./middleware";

export const store = configureStore({
  reducer: {
    dag: dagReducer,
    invitation: invitationReducer,
    socket: socketReducer,
    test: testReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(testProgressionMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
