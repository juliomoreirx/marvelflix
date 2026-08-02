import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import anime from 'animejs';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import useUIStore from '../../store/uiStore';
import styles from './MobileNav.module.css';

gsap.registerPlugin(ScrollToPlugin);

const MobileNav = () => {
  const { isMobileMenuOpen, closeMobileMenu, isChronologicalMode, toggleChronologicalMode } = useUIStore();
  const overlayRef = useRef(null);
  const menuItemsRef = useRef([]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      // Animação de Entrada
      anime({
        targets: overlayRef.current,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
        begin: () => {
          overlayRef.current.style.visibility = 'visible';
        }
      });

      anime({
        targets: menuItemsRef.current,
        translateY: [20, 0],
        opacity: [0, 1],
        delay: anime.stagger(80, { start: 100 }),
        duration: 400,
        easing: 'easeOutCubic'
      });

      // Focus Trap & Esc Listener
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') closeMobileMenu();
      };
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    } else if (overlayRef.current) {
      // Animação de Saída
      anime({
        targets: overlayRef.current,
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInQuad',
        complete: () => {
          if (overlayRef.current) {
            overlayRef.current.style.visibility = 'hidden';
          }
        }
      });
    }
  }, [isMobileMenuOpen, closeMobileMenu]);

  const scrollToId = (id, e) => {
    const element = document.getElementById(id);
    if (element) {
      e.preventDefault();
      gsap.to(window, {
        duration: 1,
        scrollTo: { y: element, offsetY: 80 },
        ease: 'power3.inOut'
      });
    }
  };

  return (
    <div 
      className={styles.overlay} 
      ref={overlayRef}
      style={{ visibility: 'hidden', opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu Principal"
    >
      <button 
        className={styles.closeBtn} 
        onClick={closeMobileMenu}
        aria-label="Fechar menu"
      >
        <FaTimes />
      </button>

      <nav className={styles.nav}>
        <Link 
          to="/home" 
          className={styles.navLink}
          onClick={(e) => {
            closeMobileMenu();
            scrollToId('hero', e);
          }}
          ref={el => menuItemsRef.current[0] = el}
        >
          Início
        </Link>
        
        <Link 
          to="/home" 
          className={styles.navLink}
          onClick={(e) => {
            closeMobileMenu();
            scrollToId(isChronologicalMode ? 'era-1' : 'filmes-4k', e);
          }}
          ref={el => menuItemsRef.current[1] = el}
        >
          Filmes
        </Link>

        <Link 
          to="/home" 
          className={styles.navLink}
          onClick={(e) => {
            closeMobileMenu();
            scrollToId('series', e);
          }}
          ref={el => menuItemsRef.current[2] = el}
          style={{ display: isChronologicalMode ? 'none' : 'block' }}
        >
          Séries
        </Link>

        <div 
          className={styles.toggleWrapper} 
          onClick={toggleChronologicalMode} 
          ref={el => menuItemsRef.current[3] = el}
        >
          <span className={styles.toggleLabel}>Modo Cronológico</span>
          <div className={`${styles.toggleSwitch} ${isChronologicalMode ? styles.active : ''}`}>
            <div className={styles.toggleKnob}></div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MobileNav;
