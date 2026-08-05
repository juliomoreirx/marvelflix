import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaBell, FaUserCircle, FaBars } from 'react-icons/fa';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import useUIStore from '../../store/uiStore';
import { useNotification } from '../../context/NotificationContext';
import appLogo from '../../assets/logo.svg';
import CTAButton from '../CTAButton/CTAButton';
import styles from './Header.module.css';

gsap.registerPlugin(ScrollToPlugin);

const Header = ({ user, userDoc, onLogout }) => {
  const { 
    toggleMobileMenu, 
    toggleSearch, 
    isChronologicalMode, 
    toggleChronologicalMode,
    openDonation
  } = useUIStore();
  const { notifications, markAllAsRead } = useNotification();
  const [isScrolled, setIsScrolled] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleBell = (e) => {
    e.stopPropagation();
    setBellOpen(!bellOpen);
    if (!bellOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

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
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.left}>
          <button 
            className={styles.mobileToggle} 
            onClick={toggleMobileMenu}
            aria-label="Abrir menu"
          >
            <FaBars />
          </button>
          
          <Link to="/home" className={styles.logo} onClick={(e) => scrollToId('hero', e)}>
            <img src={appLogo} alt="MarvelFlix Logo" />
          </Link>

          <nav className={styles.desktopNav}>
            <Link to="/home" onClick={(e) => scrollToId('hero', e)}>Início</Link>
            {isChronologicalMode ? (
              <Link to="/home" onClick={(e) => scrollToId('era-1', e)}>Filmes</Link>
            ) : (
              <>
                <Link to="/home" onClick={(e) => scrollToId('filmes-4k', e)}>Filmes</Link>
                <Link to="/home" onClick={(e) => scrollToId('series', e)}>Séries</Link>
              </>
            )}
            {userDoc?.role === 'admin' && (window.location.hostname.includes('dev') || window.location.hostname === 'localhost') && (
              <Link to="/admin" className={styles.adminLink}>Painel Administrativo</Link>
            )}
          </nav>
        </div>

        <div className={styles.right}>
          <CTAButton onClick={openDonation} className={styles.donateBtn} />

          <div className={styles.toggleWrapper} onClick={toggleChronologicalMode} title="Modo Cronológico">
            <span className={styles.toggleLabel}>Cronológico</span>
            <div className={`${styles.toggleSwitch} ${isChronologicalMode ? styles.active : ''}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>

          <button className={styles.iconBtn} aria-label="Buscar" onClick={toggleSearch}>
            <FaSearch />
          </button>
          
          <div className={styles.bellContainer} onClick={toggleBell}>
            <FaBell className={styles.iconBtn} />
            {unreadCount > 0 && <span className={styles.bellBadge}>{unreadCount}</span>}
            
            {bellOpen && (
              <div className={styles.notificationsDropdown} onClick={e => e.stopPropagation()}>
                <h4>Notificações</h4>
                <div className={styles.notificationsList}>
                  {notifications.length === 0 ? (
                    <div className={styles.notifEmpty}>Nenhuma notificação no momento</div>
                  ) : (
                    [...notifications].reverse().map(n => (
                      <div key={n.id} className={`${styles.notifItem} ${n.unread ? styles.unread : ''}`}>
                        <div className={styles.toastText}>
                          <strong>{n.title}</strong>
                          <p>{n.status === 'ready' ? 'Sessão pronta para assistir!' : n.status === 'error' ? 'Falha na sincronização (Erro na VPS)' : `Preparando sessão... ${n.progress}%`}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.profileDropdown}>
            <button className={styles.profileBtn}>
              <FaUserCircle className={styles.avatar} />
              <span className={styles.agentName}>
                {user ? `Agente ${user.email?.split('@')[0] || ''}` : 'Visitante'}
              </span>
            </button>
            <div className={styles.dropdownMenu}>
              <button onClick={onLogout} className={styles.logoutBtn}>
                Sair do Terminal
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
