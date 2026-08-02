import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './pages/Login';
import Home from './pages/Home';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Protocolo de Segurança: Limpeza de lixo residual do LocalStorage
    localStorage.removeItem('marvel_user');
    localStorage.removeItem('marvel_pass');
    localStorage.removeItem('@MarvelFlix:notifications');
    // cache-sprite-plyr e plyr são do player e não contém dados sensíveis, mas podemos limpar o que for indesejado.
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center'}}><div className="loader"></div></div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={user ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;
