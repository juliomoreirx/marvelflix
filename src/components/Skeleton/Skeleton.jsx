import React from 'react';
import styles from './Skeleton.module.css';
import logoUrl from '../../assets/logo.svg';

const Skeleton = () => {
  return (
    <div className={styles.skeletonContainer}>
      {/* Header Skeleton */}
      <header className={styles.header}>
        <div className={styles.logo}>
           <img src={logoUrl} alt="MarvelFlix Logo" className={styles.logoImg} />
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.shimmerBox} ${styles.icon}`} />
          <div className={`${styles.shimmerBox} ${styles.icon}`} />
          <div className={`${styles.shimmerBox} ${styles.avatar}`} />
        </div>
      </header>

      {/* Hero Skeleton */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={`${styles.shimmerBox} ${styles.badge}`} />
          <div className={`${styles.shimmerBox} ${styles.title}`} />
          <div className={`${styles.shimmerBox} ${styles.titleRow2}`} />
          <div className={`${styles.shimmerBox} ${styles.desc}`} />
          <div className={`${styles.shimmerBox} ${styles.desc}`} />
          <div className={styles.heroButtons}>
            <div className={`${styles.shimmerBox} ${styles.btn}`} />
            <div className={`${styles.shimmerBox} ${styles.btn}`} />
          </div>
        </div>
      </div>

      {/* Row Skeleton */}
      <div className={styles.row}>
        <div className={`${styles.shimmerBox} ${styles.rowTitle}`} />
        <div className={styles.cardsScroll}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`${styles.shimmerBox} ${styles.card}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
