import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Notification.css';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [userUid, setUserUid] = useState(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        try {
          const docRef = doc(db, `users/${user.uid}/notifications`, 'data');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setNotifications(docSnap.data().items || []);
          }
        } catch (e) {
          console.error('Failed to load notifications from Firebase', e);
        } finally {
          initialLoadDone.current = true;
        }
      } else {
        setUserUid(null);
        setNotifications([]);
        initialLoadDone.current = false;
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userUid && initialLoadDone.current) {
      const docRef = doc(db, `users/${userUid}/notifications`, 'data');
      setDoc(docRef, { items: notifications }).catch(e => console.error('Error saving notifications', e));
    }
  }, [notifications, userUid]);

  const addNotification = (notif) => {
    setNotifications(prev => {
      const existing = prev.find(n => n.id === notif.id);
      const newNotif = { 
        ...notif, 
        showToast: true, 
        unread: true, 
        timestamp: Date.now() 
      };

      if (existing) {
        if (notif.status === 'ready' && existing.status !== 'ready') {
          setTimeout(() => {
            hideToast(notif.id);
          }, 5000);
        }
        // Se já existir, preservamos o unread se ele já estava true, ou marcamos true de novo se mudou o status
        return prev.map(n => n.id === notif.id ? { ...n, ...newNotif, unread: true } : n);
      }
      return [...prev, newNotif];
    });
  };

  const hideToast = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, showToast: false } : n));
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, hideToast, markAllAsRead }}>
      {children}
      <div className="notification-container">
        {notifications.filter(n => n.showToast).map(n => (
          <div key={n.id} className={`notification-toast ${n.status}`}>
            <div className="toast-content">
              <strong>{n.title}</strong>
              <p>{n.status === 'ready' ? 'Sessão pronta para assistir!' : n.status === 'error' ? 'Falha na VPS (Verifique os logs)' : `Preparando sessão... ${n.progress}%`}</p>
            </div>
            <button className="toast-close" onClick={() => hideToast(n.id)}>&times;</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
