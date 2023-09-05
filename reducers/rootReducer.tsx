import { combineReducers } from "@reduxjs/toolkit";
import userReducer from "../features/users/reducers/index";

const rootReducer = combineReducers({userReducer});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;