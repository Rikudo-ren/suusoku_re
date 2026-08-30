import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHAp3vpF2S3uhvdX8_jEoIvZei0jp81tY",
  authDomain: "suusokubattle.firebaseapp.com",
  databaseURL: "https://suusokubattle-default-rtdb.firebaseio.com",
  projectId: "suusokubattle",
  storageBucket: "suusokubattle.firebasestorage.app",
  messagingSenderId: "897573122707",
  appId: "1:897573122707:web:72cea311428d09b570d366",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
