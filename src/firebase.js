import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWhEj6Id9NemWfI3WgLpRSNoZrEwXLw_8",
  authDomain: "marvelflix-view.firebaseapp.com",
  projectId: "marvelflix-view",
  storageBucket: "marvelflix-view.firebasestorage.app",
  messagingSenderId: "1091852781392",
  appId: "1:1091852781392:web:a269219c7e9a5c9b550e55"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Especificando o ID do banco de dados criado
export const db = getFirestore(app, "marvelflix-firestore");

// Ativa a persistência offline para resolver o erro 'client is offline' no F5
import { enableIndexedDbPersistence } from "firebase/firestore";
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
      console.warn("Múltiplas abas abertas, persistência offline suportada apenas em uma aba.");
  } else if (err.code == 'unimplemented') {
      console.warn("Navegador não suporta persistência offline.");
  }
});
