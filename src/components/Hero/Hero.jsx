import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { FaPlay, FaInfoCircle } from 'react-icons/fa';
import { getProxyImageUrl } from '../../api';
import styles from './Hero.module.css';

const Hero = ({ user, featuredItems, onPlay, onInfo }) => {
  const containerRef = useRef(null);
  const bootRef = useRef(null);
  const contentRef = useRef(null);
  const [bootComplete, setBootComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Só roda a boot sequence uma vez por montagem (ou sessão, se quisermos usar sessionStorage depois)
    const tl = gsap.timeline({
      onComplete: () => setBootComplete(true)
    });

    // Estado inicial: Hero invisível, Boot visível
    gsap.set(contentRef.current, { opacity: 0, scale: 1.05 });
    
    tl.to(bootRef.current, {
      opacity: 1,
      duration: 0.1
    })
    .to(bootRef.current, {
      opacity: 0,
      duration: 0.3,
      delay: 0.7, // 700ms de texto "ACESSO CONCEDIDO"
      ease: "power2.inOut"
    })
    .to(contentRef.current, {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: "power3.out"
    }, "-=0.1"); // Começa a revelar o hero pouco antes do boot sumir totalmente

  }, []);

  // Carousel Automático a cada 10 segundos
  useEffect(() => {
    if (!bootComplete || !featuredItems || featuredItems.length <= 1) return;
    
    const interval = setInterval(() => {
       gsap.to(contentRef.current, { 
          opacity: 0, 
          duration: 0.4, 
          ease: "power2.in",
          onComplete: () => {
             setCurrentIndex(prev => (prev + 1) % featuredItems.length);
             // Trazemos de volta com fade e um pequeno zoom in
             gsap.fromTo(contentRef.current, 
                { opacity: 0, scale: 1.02 }, 
                { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }
             );
          }
       });
    }, 10000);
    
    return () => clearInterval(interval);
  }, [bootComplete, featuredItems]);

  if (!featuredItems || featuredItems.length === 0) return null;

  const featuredItem = featuredItems[currentIndex];
  const info = featuredItem.info || featuredItem;
  const backdropUrl = info.backdrop_path?.[0] ? getProxyImageUrl(info.backdrop_path[0]) : null;
  const agentName = user ? user.email?.split('@')[0].toUpperCase() : 'VISITANTE';

  return (
    <section className={styles.heroContainer} ref={containerRef}>
      
      {!bootComplete && (
        <div className={styles.bootSequence} ref={bootRef}>
          <div className={styles.scanline}></div>
          <div className={styles.bootText}>
            <span className={styles.systemLog}>INICIANDO PROTOCOLOS DE ACESSO...</span>
            <span className={styles.accessGranted}>ACESSO CONCEDIDO</span>
            <span className={styles.agentId}>AGENTE {agentName}</span>
          </div>
        </div>
      )}

      <div 
        className={styles.heroBackground} 
        ref={contentRef}
        style={{ backgroundImage: `url(${backdropUrl})` }}
      >
        <div className={styles.heroOverlay}></div>
        <div className={styles.heroContent}>
          <div className={styles.badges}>
            {featuredItem.category === "Qualidade CINEMA" && (
              <span className={styles.badgeGold}>QUALIDADE CINEMA</span>
            )}
            <span className={styles.badgeStandard}>{featuredItem.type === 'series' ? 'SÉRIE' : 'FILME'}</span>
          </div>
          
          <h1 className={styles.title}>{info.name || info.title}</h1>
          
          <p className={styles.plot}>
            {info.plot || info.description || 'Nenhum relatório disponível no dossiê.'}
          </p>
          
          <div className={styles.actions}>
            <button 
              className={styles.btnPrimary} 
              onClick={() => onPlay(featuredItem)}
            >
              <FaPlay /> INICIAR MISSÃO
            </button>
            <button className={styles.btnSecondary} onClick={() => onInfo(featuredItem)}>
              <FaInfoCircle /> ACESSAR DOSSIÊ
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
