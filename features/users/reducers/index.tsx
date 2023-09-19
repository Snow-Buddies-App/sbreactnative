import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    users: [
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        userName: 'jdoe',
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Doe',
        userName: 'janedoe',
      },
    ],
  },
  reducers: {
    addUser(state, action: PayloadAction<any>) {
      state.users.push(action.payload);
    },
  },
});

export const { addUser } = userSlice.actions;
export default userSlice.reducer;
