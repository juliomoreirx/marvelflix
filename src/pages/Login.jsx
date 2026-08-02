import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import gsap from 'gsap';
import styles from './Login.module.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const containerRef = useRef(null);
  const formRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    // Animação GSAP de entrada (Split-screen)
    const ctx = gsap.context(() => {
      gsap.from(imageRef.current, {
        x: '-100%',
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out'
      });
      
      gsap.from(formRef.current, {
        x: '100%',
        opacity: 0,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.2
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Credenciais inválidas ou acesso negado.');
      } else {
        setError('Erro na autenticação.');
      }
    }
    setLoading(false);
  };

  return (
    <div className={styles.splitContainer} ref={containerRef}>
      
      {/* Lado Esquerdo - Imagem Herói */}
      <div className={styles.imagePanel} ref={imageRef}>
        <div className={styles.overlay}>
          <div className={styles.branding}>
             <h2 className={styles.brandingTitle}>Protocolo<br/>S.H.I.E.L.D.</h2>
             <p className={styles.brandingSub}>Base de Dados de Ameaças Globais</p>
          </div>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className={styles.formPanel} ref={formRef}>
        <div className={styles.formBox}>
          
          <div className={styles.headerBox}>
            <h1 className={styles.title}>Marvel<span className={styles.red}>Flix</span></h1>
            <p className={styles.subtitle}>Identificação Necessária</p>
          </div>
          
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <form onSubmit={handleAuth} className={styles.form}>
            <div className={styles.inputGroup}>
              <input 
                type="email" 
                placeholder=" "
                className={styles.input} 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                required
              />
              <label className={styles.label}>Email do Agente</label>
            </div>
            
            <div className={styles.inputGroup}>
              <input 
                type="password" 
                placeholder=" "
                className={styles.input}
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
              />
              <label className={styles.label}>Senha de Acesso</label>
            </div>
            
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              <span className={styles.btnText}>
                {loading ? 'Processando...' : 'Autorizar Acesso'}
              </span>
              <span className={styles.btnScanner}></span>
            </button>
          </form>
          
        </div>
      </div>
      
    </div>
  );
};

export default Login;
