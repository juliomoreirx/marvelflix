import React, { forwardRef } from 'react';
import styles from './CTAButton.module.css';

const CTAButton = forwardRef(({ onClick, className }, ref) => {
  return (
    <button ref={ref} className={`${styles.ctaBtn} ${className || ''}`} onClick={onClick} title="Apoiar o Projeto">
      <div className={styles.glowEffect}></div>
      <span className={styles.icon}>❤️</span>
      <span className={styles.text}>
        <span className={styles.letter} style={{'--i': 1}}>A</span>
        <span className={styles.letter} style={{'--i': 2}}>p</span>
        <span className={styles.letter} style={{'--i': 3}}>o</span>
        <span className={styles.letter} style={{'--i': 4}}>i</span>
        <span className={styles.letter} style={{'--i': 5}}>a</span>
        <span className={styles.letter} style={{'--i': 6}}>r</span>
      </span>
    </button>
  );
});

export default CTAButton;
