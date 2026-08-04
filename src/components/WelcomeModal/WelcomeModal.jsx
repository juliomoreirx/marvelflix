import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { FaPlay, FaSortNumericDown, FaCheck, FaTimes } from 'react-icons/fa';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import styles from './WelcomeModal.module.css';

const WelcomeModal = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power2.out' });
      gsap.from(modalRef.current, { y: 30, opacity: 0, scale: 0.95, duration: 0.4, ease: 'back.out(1.2)' });
    });
    return () => ctx.revert();
  }, []);

  const handleClose = async () => {
    if (dontShowAgain && auth.currentUser) {
      localStorage.setItem('marvelflix_hide_welcome', 'true');
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), { hideWelcome: true }, { merge: true });
      } catch(e) { console.error('Erro ao salvar no Firestore', e); }
    } else if (dontShowAgain) {
      localStorage.setItem('marvelflix_hide_welcome', 'true');
    }
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(modalRef.current, { y: 20, scale: 0.95, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
  };

  return (
    <div className={styles.overlay} ref={overlayRef}>
      <div className={styles.modal} ref={modalRef}>
        
        <div className={styles.header}>
          <h2 className={styles.title}>Bem-vindo ao <span className={styles.redText}>MarvelFlix</span></h2>
          <button className={styles.closeBtnIcon} onClick={handleClose}><FaTimes /></button>
        </div>

        <div className={styles.content}>
          <p className={styles.intro}>
            A sua base de dados suprema e particular. Todo o Universo Cinematográfico da Marvel (MCU) reunido com qualidade máxima, sem anúncios, feito de fã para fãs.
          </p>

          <div className={styles.features}>
            <div className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <FaPlay className={styles.featureIcon} />
              </div>
              <div className={styles.featureText}>
                <h3>Qualidade Impecável</h3>
                <p>Acesse filmes em alta resolução (4K e HD) e continue de onde parou em qualquer dispositivo através da nossa tecnologia de nuvem sincronizada.</p>
              </div>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.iconWrapperAlt}>
                <FaSortNumericDown className={styles.featureIconAlt} />
              </div>
              <div className={styles.featureText}>
                <h3>Modo Cronológico</h3>
                <p>Na barra superior, ative a chave <strong>"Ordem Cronológica"</strong> para organizar todo o catálogo na sequência exata da linha do tempo da história (desde o <em>Primeiro Vingador</em> na 2ª Guerra Mundial até a <em>Saga do Multiverso</em>).</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <label className={styles.checkboxContainer}>
            <input 
              type="checkbox" 
              checked={dontShowAgain} 
              onChange={(e) => setDontShowAgain(e.target.checked)} 
              className={styles.hiddenCheckbox}
            />
            <div className={`${styles.customCheckbox} ${dontShowAgain ? styles.checked : ''}`}>
              {dontShowAgain && <FaCheck size={10} />}
            </div>
            <span>Não mostrar novamente</span>
          </label>
          
          <button className={styles.continueBtn} onClick={handleClose}>
            Acessar Catálogo
          </button>
        </div>

      </div>
    </div>
  );
};

export default WelcomeModal;
