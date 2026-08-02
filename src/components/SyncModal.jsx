import React, { useEffect, useState } from 'react';
import { FaFilm } from 'react-icons/fa'; // Popcorn não existe no pacote base FA
import './SyncModal.css';

const SyncModal = ({ isVisible, progress = 0, title = '' }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="sync-overlay">
      <div className="sync-box glass-panel">
        <FaFilm className="sync-icon" />
        <h2>Preparando sua sessão</h2>
        <p>
          O título <strong>"{title}"</strong> está sendo preparado para você. 
          Como é a primeira vez que alguém assiste a este conteúdo, estamos organizando as coisas nos bastidores para garantir a melhor qualidade sem travamentos!
        </p>
        <p className="sync-wait-msg">Pegue a pipoca, já vai começar{dots}</p>
        
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        
        <p className="sync-eta">
          {progress === 0 ? 'Conectando ao catálogo VIP...' : 
           progress === 95 ? 'Finalizando os últimos ajustes mágicos...' :
           `${progress}% concluído`}
        </p>
      </div>
    </div>
  );
};

export default SyncModal;
