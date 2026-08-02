import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaSearch } from 'react-icons/fa';
import anime from 'animejs';
import useUIStore from '../../store/uiStore';
import Card from '../Card/Card';
import mcuData from '../../data/mcu_full.json';
import outrosData from '../../data/outros_filmes.json';
import styles from './SearchOverlay.module.css';

const SearchOverlay = ({ onCardClick }) => {
  const { isSearchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  const overlayRef = useRef(null);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Animação de entrada/saída
  useEffect(() => {
    if (isSearchOpen) {
      anime({
        targets: overlayRef.current,
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
        begin: () => {
          overlayRef.current.style.visibility = 'visible';
          // Pequeno delay para focar o input após a animação iniciar
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      });
      
      // Focus Trap e Esc listener
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') closeSearch();
      };
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    } else if (overlayRef.current) {
      anime({
        targets: overlayRef.current,
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInQuad',
        complete: () => {
          if (overlayRef.current) overlayRef.current.style.visibility = 'hidden';
          setQuery('');
          setResults([]);
        }
      });
    }
  }, [isSearchOpen, closeSearch]);

  // Lógica de busca
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const allData = [...mcuData, ...outrosData];
    const filtered = allData.filter(item => {
      const title = (item.info?.name || item.name || item.title || '').toLowerCase();
      return title.includes(q);
    });

    setResults(filtered);
  }, [query]);

  // Animação Stagger dos resultados toda vez que mudam
  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      const cards = resultsRef.current.children;
      anime({
        targets: cards,
        translateY: [20, 0],
        opacity: [0, 1],
        delay: anime.stagger(50),
        duration: 400,
        easing: 'easeOutCubic'
      });
    }
  }, [results]);

  const handleCardClick = (item) => {
    if (onCardClick) {
      onCardClick(item);
    }
  };

  return (
    <div 
      className={styles.overlay} 
      ref={overlayRef}
      style={{ visibility: 'hidden', opacity: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <button className={styles.closeBtn} onClick={closeSearch}>
        <FaTimes />
      </button>

      <div className={styles.searchContainer}>
        <div className={styles.inputWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text"
            className={styles.searchInput}
            placeholder="Qual arquivo deseja acessar, Agente?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            ref={inputRef}
          />
        </div>

        <div className={styles.resultsArea}>
          {query && results.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.glitchText}>ARQUIVO NÃO ENCONTRADO</span>
              <p>Verifique sua credencial ou os termos da busca.</p>
            </div>
          ) : (
            <div className={styles.resultsGrid} ref={resultsRef}>
              {results.map((item, idx) => (
                <div key={idx} style={{ opacity: 0 }}>
                  <Card item={item} onClick={() => handleCardClick(item)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
