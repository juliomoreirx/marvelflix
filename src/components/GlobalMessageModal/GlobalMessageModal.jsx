import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import useUIStore from '../../store/uiStore';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import styles from './GlobalMessageModal.module.css';

const GlobalMessageModal = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const { isPlayerOpen } = useUIStore();
  const [userDocData, setUserDocData] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Escutar os dados do usuario (para pegar array de lidos)
    const unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserDocData(docSnap.data());
      }
    });

    return () => unsubscribeUser();
  }, []);

  useEffect(() => {
    if (!userDocData) return;

    // Escutar TODAS as mensagens ativas/criadas
    const q = query(collection(db, 'global_messages'));
    
    const unsubscribeMsgs = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const readMessages = userDocData.readAnnouncements || [];
      const isDevEnv = window.location.hostname.includes('dev') || window.location.hostname === 'localhost';

      const unreadMsgs = allMsgs.filter(m => {
        // Ignora se ja foi lido pelo usuario no BD
        if (readMessages.includes(m.id)) return false;
        // Regra de alvo
        if (m.target === 'dev' && !isDevEnv) return false;
        return true;
      });

      // Ordena pelas mais recentes
      unreadMsgs.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(unreadMsgs);
      setCurrentMessageIndex(0);
    });

    return () => unsubscribeMsgs();
  }, [userDocData]);

  if (messages.length === 0 || isPlayerOpen) return null;

  const currentMsg = messages[currentMessageIndex];

  const handleMarkAsRead = async () => {
    try {
      if (auth.currentUser) {
        // Salva direto no Firestore!
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          readAnnouncements: arrayUnion(currentMsg.id)
        });
      }
    } catch (e) {
      console.error('Erro ao marcar como lida:', e);
    }

    if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
    } else {
      setMessages([]);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <FaCheckCircle />;
      case 'warning': return <FaExclamationTriangle />;
      case 'danger': return <FaTimesCircle />;
      default: return <FaInfoCircle />;
    }
  };

  const getColorClass = (type) => {
    switch(type) {
      case 'success': return styles.success;
      case 'warning': return styles.warning;
      case 'danger': return styles.danger;
      default: return styles.info;
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${getColorClass(currentMsg.type)}`}>
        <div className={styles.iconContainer}>
          {getIcon(currentMsg.type)}
        </div>
        <div className={styles.contentContainer}>
          <h2 className={styles.title}>{currentMsg.title}</h2>
          <p className={styles.text}>{currentMsg.message}</p>
        </div>
        <button className={styles.closeBtn} onClick={handleMarkAsRead}>
          Entendido
        </button>
      </div>
    </div>
  );
};

export default GlobalMessageModal;
