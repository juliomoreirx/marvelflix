import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import gsap from 'gsap';
import styles from './Login.module.css';

const Login = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
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
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/home');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('Este email já está em uso.');
      else if (err.code === 'auth/invalid-credential') setError('Credenciais inválidas.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else setError('Erro na autenticação.');
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
            <p className={styles.subtitle}>
              {isRegistering ? 'Cadastre suas Credenciais' : 'Identificação Necessária'}
            </p>
          </div>
          
          {error && <div className={styles.errorMessage}>{error}</div>}
          
          <form onSubmit={handleAuth} className={styles.form}>
            {isRegistering && (
              <div className={styles.inputGroup}>
                <input 
                  type="text" 
                  placeholder=" " 
                  className={styles.input}
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  required
                />
                <label className={styles.label}>Nome do Agente</label>
              </div>
            )}
            
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
                {loading ? 'Processando...' : (isRegistering ? 'Criar Conta' : 'Autorizar Acesso')}
              </span>
              <span className={styles.btnScanner}></span>
            </button>
          </form>
          
          <p className={styles.switchMode} onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? 'Já possui credencial? Fazer login' : 'Primeiro acesso? Solicitar credencial'}
          </p>
        </div>
      </div>
      
    </div>
  );
};

export default Login;
