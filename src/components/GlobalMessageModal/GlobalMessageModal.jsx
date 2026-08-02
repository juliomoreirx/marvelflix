import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import styles from './GlobalMessageModal.module.css';

const GlobalMessageModal = () => {
  const [messages, setMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // Escutar mensagens ativas
    const q = query(collection(db, 'global_messages'), where('active', '==', true));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const activeMsgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar mensagens já lidas
      const readMessages = JSON.parse(localStorage.getItem('marvel_read_messages') || '[]');
      
      const isDevEnv = window.location.hostname.includes('dev') || window.location.hostname === 'localhost';

      const unreadMsgs = activeMsgs.filter(m => {
        // Ignora se ja foi lido
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

    return () => unsubscribe();
  }, []);

  if (messages.length === 0) return null;

  const currentMsg = messages[currentMessageIndex];

  const handleMarkAsRead = () => {
    const readMessages = JSON.parse(localStorage.getItem('marvel_read_messages') || '[]');
    if (!readMessages.includes(currentMsg.id)) {
      readMessages.push(currentMsg.id);
      localStorage.setItem('marvel_read_messages', JSON.stringify(readMessages));
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
