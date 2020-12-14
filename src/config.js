import Firebase from 'firebase';
let config = {
  apiKey: 'AIzaSyD0VzDMuXR8U6N8C3YX1Ofq2s0qysQbKGo',
  authDomain: 'skatetba-545f1.firebaseapp.com',
  databaseURL: 'https://skatetba-545f1-default-rtdb.firebaseio.com',
  projectId: 'skatetba-545f1',
  storageBucket: 'skatetba-545f1.appspot.com',
  messagingSenderId: '1089869458867'
};
let app = Firebase.initializeApp(config);
export const db = app.database();