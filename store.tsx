import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import rootReducer from './reducers/rootReducer';
import type { RootState } from './reducers/rootReducer';

const store = configureStore({
  reducer: rootReducer,
});

export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();

export type AppSelector = typeof store.getState;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
