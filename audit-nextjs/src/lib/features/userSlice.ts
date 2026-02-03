import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";
import axios from "axios";
import { dataConfig } from "@/config/config";

interface User {
  userid: number;
  usercode: string;
  fullname: string;
  email: string;
  tel: string | null;
}

interface UserState {
  user: User[];
  isLoading: boolean,
  error: string | null,
}

const initialValue: UserState = {
  user: [],
  isLoading: false,
  error: null,

};

export const fetchUser = createAsyncThunk("user/fetchUser", async (params: unknown, thunkAPI) => {
  const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/getUserProfile`, params, {
    headers: dataConfig().headers,
  }).then(function (response) {
    return response.data;
  }).catch(function (error) {
    console.log(error);
    throw thunkAPI.rejectWithValue(error.response.data)
  });

  return response.data;
});


const userSlice = createSlice({
  name: "user",
  initialState: initialValue,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.isLoading = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.endsWith("/fulfilled"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state, action: any) => {
          state.isLoading = false;
          if (action.type.includes("fetchUser")) {
            console.log('in fetchUser');

            state.user = action.payload;
          }
        },
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action) => {
          // console.log(`state : ${action.error()}`);
          state.isLoading = false;
          console.log(state);
          console.log(action);
        },
      );
  }
})

export const userSelector = (store: RootState) => store.users;
export const { } = userSlice.actions;
export default userSlice.reducer;