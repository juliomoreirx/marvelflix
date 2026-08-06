import React from 'react';
import { FaPlay } from 'react-icons/fa';
import { getProxyImageUrl } from '../../api';
import posterPlaceholder from '../../assets/poster_placeholder.webp';
import styles from './Card.module.css';

const Card = ({ item, onClick, isContinueWatching = false }) => {
  const info = item.info || item;
  
  // Extrai o poster
  const rawPoster = info.cover_big || info.movie_image || info.cover || item.poster;
  const posterUrl = rawPoster ? getProxyImageUrl(rawPoster) : posterPlaceholder;

  // Extrai o título
  const title = info.name || info.title || item.title || "Desconhecido";

  // Se for card de Continue Assistindo, calcula o progresso
  const percent = isContinueWatching && item.duration 
    ? (item.time / item.duration) * 100 
    : 0;

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.imgWrapper}>
        <img 
          src={posterUrl} 
          alt={title} 
          loading="lazy" 
          onError={(e) => { e.target.src = posterPlaceholder; }}
        />
        <div className={styles.overlay}>
          <FaPlay className={styles.playIcon} />
          <h4 className={styles.hoverTitle}>{title}</h4>
        </div>
      </div>
      
      {isContinueWatching ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${percent}%` }}></div>
        </div>
      ) : (
        <h4 className={styles.title}>{title}</h4>
      )}
    </div>
  );
};

export default Card;
