import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaTimes, FaSpinner } from 'react-icons/fa';
import gsap from 'gsap';
import posterPlaceholder from '../assets/poster_placeholder.jpg';
import episodePlaceholder from '../assets/episode_placeholder.jpg';
import { getProxyImageUrl } from '../api';
import styles from './Modal.module.css';

const Modal = ({ item, onClose, onPlay }) => {
  const [preparing, setPreparing] = useState(false);
  
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    // GSAP Animação de entrada
    const ctx = gsap.context(() => {
      gsap.fromTo(modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
      gsap.fromTo(contentRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' }
      );
    });
    return () => ctx.revert();
  }, []);

  // Removing the old checking effect that pinged pub-09ab98d17ea14b829ca0167c510176c5.r2.dev

  if (!item) return null;

  const isSeries = item.type === 'series' || !!item.episodes;
  const info = item.info || item;
  
  const handlePlay = (id, ext, episodeInfo = null) => {
    if (!isSeries) setPreparing(true);
    onPlay({
      id,
      type: isSeries ? 'series' : 'movie',
      ext,
      title: episodeInfo ? `${info.name} - ${episodeInfo.title}` : info.name,
      poster: isSeries ? (info.cover_big || info.cover || item.poster) : (info.cover_big || info.movie_image || info.cover || item.poster),
      episodes: isSeries ? item.episodes : null,
      currentEpisodeId: id
    });
  };

  const handleClose = () => {
    // Animação de saída antes de desmontar
    gsap.to(modalRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
    gsap.to(contentRef.current, { y: 20, scale: 0.95, duration: 0.3, ease: 'power2.in' });
  };

  const backdropUrl = info.backdrop_path?.[0] ? getProxyImageUrl(info.backdrop_path[0]) : null;
  const posterUrl = info.cover_big || info.movie_image || info.cover;
  const poster = posterUrl ? getProxyImageUrl(posterUrl) : posterPlaceholder;
  const bgStyle = backdropUrl ? `url(${backdropUrl})` : `url(${poster})`;

  return (
    <div className={styles.modalOverlay} ref={modalRef} onClick={handleClose}>
      <div className={styles.modalContent} ref={contentRef} onClick={e => e.stopPropagation()}>
        
        <button className={styles.closeBtn} onClick={handleClose}>
          <FaTimes />
        </button>
        
        <div className={styles.modalHeader} style={{ backgroundImage: bgStyle }}>
          <div className={styles.headerGradient}></div>
          <div className={styles.headerInfo}>
            <div className={styles.titleWrapper}>
              <h2 className={styles.title}>{info.name}</h2>
              <div className={styles.metaRow}>
                {(info.rating || info.rating_5based) && <span className={styles.badge}>Avaliação: {info.rating || info.rating_5based}</span>}
                {(info.releasedate || info.release_date || info.year) && (
                  <span className={styles.badge}>{info.releasedate || info.release_date || info.year}</span>
                )}
                {info.duration && <span className={styles.badge}>{info.duration}</span>}
              </div>
            </div>
            
            {!isSeries && (
              <div className={styles.actionGroup}>
                <button 
                  className={styles.playBtn} 
                  onClick={() => handlePlay(item.stream_id || item.id, item.container_extension || 'mp4')}
                  disabled={preparing}
                >
                  {preparing ? (
                    <><FaSpinner className="fa-spin" /> Preparando...</>
                  ) : (
                    <><FaPlay /> Iniciar Missão</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.infoGrid}>
            <div className={styles.posterWrapper}>
              <img src={poster} alt={info.name} onError={(e) => { e.target.src = posterPlaceholder; }} />
            </div>
            
            <div className={styles.details}>
              <div className={styles.plotBox}>
                <h3 className={styles.sectionTitle}>Sinopse do Arquivo</h3>
                <p className={styles.plot}>{info.plot || info.description || "Nenhum dado disponível."}</p>
              </div>

              {info.name && info.name.includes('4K') && (
                <div className={styles.warningBox}>
                  <strong>[AVISO S.H.I.E.L.D.] Compressão 4K HEVC:</strong>
                  <p>Arquivo codificado com compressão H.265. Se enfrentar tela preta no PC, instale a extensão nativa HEVC. Caso contrário, acesse por um dispositivo compatível.</p>
                </div>
              )}
              
              <div className={styles.metaGrid}>
                {info.genre && <div><span className={styles.metaLabel}>Categoria</span><br/>{info.genre}</div>}
                {info.director && <div><span className={styles.metaLabel}>Diretor</span><br/>{info.director}</div>}
                {info.cast && <div style={{gridColumn: '1 / -1'}}><span className={styles.metaLabel}>Agentes Designados</span><br/>{info.cast}</div>}
              </div>
            </div>
          </div>

          {isSeries && item.episodes && (
            <div className={styles.episodesSection}>
              <h3 className={styles.sectionTitle}>Arquivos de Episódios</h3>
              
              {Object.keys(item.episodes).map(seasonNum => (
                <div key={seasonNum} className={styles.seasonBlock}>
                  <h4 className={styles.seasonTitle}>Temporada {seasonNum}</h4>
                  
                  <div className={styles.episodeList}>
                    {item.episodes[seasonNum].map(ep => (
                      <div key={ep.id} className={styles.episodeCard} onClick={() => handlePlay(ep.id, ep.container_extension, ep)}>
                        <div className={styles.episodeThumbWrapper}>
                          <img 
                            src={ep.info.movie_image ? getProxyImageUrl(ep.info.movie_image) : episodePlaceholder} 
                            alt={ep.title} 
                            onError={(e) => { e.target.src = episodePlaceholder; }}
                          />
                          <div className={styles.episodeOverlay}><FaPlay className={styles.episodePlayIcon} /></div>
                        </div>
                        <div className={styles.episodeInfo}>
                          <span className={styles.episodeNum}>{ep.title}</span>
                          <span className={styles.episodePlot}>{ep.info.plot ? ep.info.plot.substring(0, 60) + '...' : `Episódio ${ep.episode_num}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
