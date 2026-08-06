import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, collection, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import GlobalMessageModal from './components/GlobalMessageModal/GlobalMessageModal';
import DonationModal from './components/DonationModal/DonationModal';
import useUIStore from './store/uiStore';

// Lazy loaded pages
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Admin = lazy(() => import('./pages/Admin'));

const App = () => {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Protocolo de Segurança: Limpeza de lixo residual do LocalStorage
    localStorage.removeItem('marvel_user');
    localStorage.removeItem('marvel_pass');
    localStorage.removeItem('@MarvelFlix:notifications');
    
    let unsubUserDoc = null;
    let unsubCustomContent = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        
        // Registra o lastLogin apenas 1x ao inicializar o app para este usuário
        setDoc(doc(db, "users", currentUser.uid), {
          lastLogin: new Date().toISOString(),
          email: currentUser.email
        }, { merge: true }).catch(console.error);

        unsubUserDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserDoc(data);
            
            if (data.status === 'blocked') {
              localStorage.setItem('marvel_blocked', 'true');
              signOut(auth);
            }
          } else {
            setDoc(doc(db, "users", currentUser.uid), {
              email: currentUser.email,
              role: 'user',
              status: 'active',
              lastLogin: new Date().toISOString()
            }, { merge: true }).catch(console.error);
          }
          setLoading(false);
        }, (error) => {
          console.error("User listener error:", error);
          setLoading(false); 
        });

        unsubCustomContent = onSnapshot(collection(db, "custom_content"), (snap) => {
          const customData = snap.docs.map(d => d.data());
          useUIStore.getState().setCustomContent(customData);
        }, (error) => {
          console.error("Custom content listener error:", error);
        });
      } else {
        setUserDoc(null);
        if (unsubUserDoc) unsubUserDoc();
        if (unsubCustomContent) unsubCustomContent();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubCustomContent) unsubCustomContent();
    };
  }, []);

  const FullLoader = () => (
    <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center'}}>
      <div className="loader"></div>
    </div>
  );

  if (loading) return <FullLoader />;

  return (
    <Router>
      {user && <GlobalMessageModal />}
      <DonationModal />
      <Suspense fallback={<FullLoader />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
          <Route path="/home" element={user ? <Home userDoc={userDoc} /> : <Navigate to="/login" replace />} />
          <Route path="/admin" element={user ? <Admin user={user} userDoc={userDoc} /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
