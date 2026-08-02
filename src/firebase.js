import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVx-MozdgWxRU0Au-TQWtucyXHohTTfpw",
  authDomain: "marvelflix-space.firebaseapp.com",
  projectId: "marvelflix-space",
  storageBucket: "marvelflix-space.firebasestorage.app",
  messagingSenderId: "403616432289",
  appId: "1:403616432289:web:cde92414350d35b41670e0"
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
