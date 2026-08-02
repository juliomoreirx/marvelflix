import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import Login from './pages/Login';
import Home from './pages/Home';
import Admin from './pages/Admin';
import GlobalMessageModal from './components/GlobalMessageModal/GlobalMessageModal';

const App = () => {
  const [user, setUser] = useState(null);
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Protocolo de Segurança: Limpeza de lixo residual do LocalStorage
    localStorage.removeItem('marvel_user');
    localStorage.removeItem('marvel_pass');
    localStorage.removeItem('@MarvelFlix:notifications');
    // cache-sprite-plyr e plyr são do player e não contém dados sensíveis, mas podemos limpar o que for indesejado.
    
    let unsubUserDoc = null;

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        import('firebase/firestore').then(({ doc, onSnapshot, setDoc }) => {
          unsubUserDoc = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserDoc(data);
              
              if (data.status === 'blocked') {
                localStorage.setItem('marvel_blocked', 'true');
                import('firebase/auth').then(({ signOut }) => signOut(auth));
              } else {
                // Atualiza last login
                setDoc(doc(db, "users", currentUser.uid), {
                  lastLogin: new Date().toISOString()
                }, { merge: true });
              }
            } else {
              setDoc(doc(db, "users", currentUser.uid), {
                email: currentUser.email,
                role: 'user',
                status: 'active',
                lastLogin: new Date().toISOString()
              }, { merge: true });
            }
            setLoading(false);
          });
        });
      } else {
        setUserDoc(null);
        if (unsubUserDoc) unsubUserDoc();
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  if (loading) return <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center'}}><div className="loader"></div></div>;

  return (
    <Router>
      {user && <GlobalMessageModal />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={user ? <Home userDoc={userDoc} /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={user ? <Admin user={user} userDoc={userDoc} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
