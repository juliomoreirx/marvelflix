import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

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

// Inicializa o Firestore com o ID customizado e Cache Local persistente moderno (sem o warning de deprecation)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, "marvelflix-firestore");

// Secondary app para criar contas via Painel Admin sem deslogar a conta atual
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
