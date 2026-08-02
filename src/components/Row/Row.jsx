import React, { useRef, useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Card from '../Card/Card';
import styles from './Row.module.css';

gsap.registerPlugin(ScrollTrigger);

const Row = ({ id, title, items, isContinueWatching = false, onCardClick }) => {
  const rowRef = useRef(null);
  const sectionRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    // GSAP ScrollTrigger Animation (Fade up on scroll)
    const ctx = gsap.context(() => {
      if (sectionRef.current) {
        gsap.fromTo(sectionRef.current, 
          { opacity: 0, y: 50 },
          {
            opacity: 1, 
            y: 0, 
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 90%",
              toggleActions: "play none none none"
            }
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [items]);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [items]);

  const handleScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5); // 5px tolerance
    }
  };

  const scroll = (direction) => {
    if (rowRef.current) {
      const { clientWidth } = rowRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth + 100 : clientWidth - 100;
      rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section id={id} className={styles.rowSection} ref={sectionRef}>
      <h2 className={styles.rowTitle}>{title}</h2>
      
      <div className={styles.rowContainer}>
        {showLeftArrow && (
          <button 
            className={`${styles.arrowBtn} ${styles.leftArrow}`} 
            onClick={() => scroll('left')}
            aria-label="Rolar para esquerda"
          >
            <FaChevronLeft />
          </button>
        )}

        <div className={styles.cardsScroll} ref={rowRef} onScroll={handleScroll}>
          {items.map((item, idx) => (
            <Card 
              key={idx} 
              item={item} 
              isContinueWatching={isContinueWatching} 
              onClick={() => onCardClick(item)} 
            />
          ))}
        </div>

        {showRightArrow && (
          <button 
            className={`${styles.arrowBtn} ${styles.rightArrow}`} 
            onClick={() => scroll('right')}
            aria-label="Rolar para direita"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </section>
  );
};

export default Row;
