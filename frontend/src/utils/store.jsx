import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import authReducer from "./authslice.jsx";
import postsReducer from "./postsSlice.jsx";
import likedCategoriesReducer from "./categoryslice.jsx"
import themeReducer from "./darkmodeSlice";
import socketReducer from "./socketslice"
import commentReducer from "./commentsSlice.jsx"
import notificationReducer from "./notificationSlice.jsx"
import chatReducer from './chatSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // Only auth reducer will be persisted
};

const rootReducer = combineReducers({
  auth: authReducer,
  posts: postsReducer,
  likedCategories : likedCategoriesReducer,
  theme: themeReducer,
  socket: socketReducer,
  comments: commentReducer,
  notification: notificationReducer,
  chat: chatReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
});

const persistor = persistStore(store);

export { store, persistor };
