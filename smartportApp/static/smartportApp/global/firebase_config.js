const firebaseConfig = {
  apiKey: "AIzaSyBj_Uuyj4pLlSjY5Jn1R2zb2_xYwDRI8zs",
  authDomain: "capstone-e2fb2.firebaseapp.com",
  projectId: "capstone-e2fb2",
  // Add other fields if needed
  storageBucket: "capstone-e2fb2.appspot.com",
  messagingSenderId: "687694364137",
  appId: "1:687694364137:web:8a8392418e2eb9e845df7",
};
// ✅ Avoid re-initialization on hot reloads or multiple script loads
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
