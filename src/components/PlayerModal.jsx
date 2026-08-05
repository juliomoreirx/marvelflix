import React, { useRef, useState, useEffect } from 'react';
import { FaTimes, FaStepForward } from 'react-icons/fa';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import Hls from 'hls.js';
import { db, auth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import './PlayerModal.css';

const PlayerModal = ({ playData, onClose, onNextEpisode }) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const [currentPlayData, setCurrentPlayData] = useState(playData);
  const [debugError, setDebugError] = useState(null);
  const [showHevcWarning, setShowHevcWarning] = useState(false);
  
  // Guardamos o tempo atual do player em uma ref para usar no unmount
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const maxWatchedRef = useRef(0); // para saber se assistiu o suficiente para salvar
  
  const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
  const nextEpisodeRef = useRef(null);
  const handleNextEpisodeRef = useRef(null);

  useEffect(() => {
    setCurrentPlayData(playData);
    if (playData?.title?.toLowerCase().includes('4k')) {
      setShowHevcWarning(true);
      const timer = setTimeout(() => setShowHevcWarning(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowHevcWarning(false);
    }
  }, [playData]);

  useEffect(() => {
    // Esconde a barra de rolagem do fundo
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const saveProgress = (currentTime, duration) => {
    if (!auth.currentUser || !currentTime || !currentPlayData) return;
    const { id, type, poster } = currentPlayData;
    const uid = auth.currentUser.uid;
    const docRef = doc(db, `users/${uid}/continue_watching/${id}`);
    
    const safeTitle = currentPlayData.title || currentPlayData.name || currentPlayData.info?.name || currentPlayData.info?.title || 'Filme Desconhecido';
    const safePoster = poster || currentPlayData.info?.cover || '';

    setDoc(docRef, {
       videoId: id,
       title: safeTitle,
       poster: safePoster,
       time: currentTime,
       duration: duration || 100,
       updatedAt: Date.now(),
       type: type || 'movie'
    }, { merge: true })
    .catch(e => {
        console.error("❌ FALHA CRÍTICA AO SALVAR NO SERVIDOR FIREBASE:", e);
    });
  };

  useEffect(() => {
    if (!currentPlayData || !containerRef.current) return;

    // Limpa qualquer resquício anterior para evitar duplicidade
    containerRef.current.innerHTML = '';

    // Cria o video em Vanilla JS (Imune a bugs do React)
    const videoElement = document.createElement('video');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('autoplay', '');
    containerRef.current.appendChild(videoElement);

    const { id, type, ext, cfUrl, savedTime, poster } = currentPlayData;
    
    currentTimeRef.current = savedTime || 0;
    maxWatchedRef.current = 0;

    const defaultOptions = {
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
      settings: ['quality', 'speed'],
    };

    const initPlayer = () => {
      try {
        if (playerRef.current) {
          playerRef.current.destroy();
        }
        
        // Cria a instância do Plyr
        playerRef.current = new Plyr(videoElement, defaultOptions);
        
        let lastSaveTime = currentTimeRef.current;

      playerRef.current.on('timeupdate', async () => {
        if (!playerRef.current) return;
        const currentTime = playerRef.current.currentTime;
        const duration = playerRef.current.duration;
        
        currentTimeRef.current = currentTime;
        durationRef.current = duration;
        maxWatchedRef.current = Math.max(maxWatchedRef.current, currentTime);
        
        // Salva aos 2 segundos iniciais para garantir que apareça na lista logo de cara
        if (currentTime > 2 && lastSaveTime === 0 && auth.currentUser) {
           lastSaveTime = currentTime;
           saveProgress(currentTime, duration);
        }
        
        // Depois salva a cada 10 segundos
        if (currentTime - lastSaveTime > 10 && auth.currentUser) {
           lastSaveTime = currentTime;
           saveProgress(currentTime, duration);
        }

        // Lógica Estilo Netflix: Mostra o botão nos últimos 15 segundos
        const timeLeft = duration - currentTime;
        
        if (duration > 0 && timeLeft <= 15) {
           if (nextEpisodeRef.current) {
             setShowNextEpisodePrompt(true);
           }
        } else {
           setShowNextEpisodePrompt(false);
        }
      });
      
      playerRef.current.on('ended', () => {
         if (nextEpisodeRef.current && handleNextEpisodeRef.current) {
            handleNextEpisodeRef.current();
         }
      });
      
      if (savedTime) {
        playerRef.current.once('loadedmetadata', () => {
          playerRef.current.currentTime = savedTime;
        });
      }
      } catch (err) {
        setDebugError('Plyr error: ' + err.message);
        videoElement.setAttribute('controls', 'true'); // fallback imediato
      }
    };

    const loadVideo = async () => {
      try {
        // 1. Inicia o Plyr incondicionalmente para garantir a UI premium
        initPlayer();

        // 2. Solicita Token de Curta Duração da VPS (IP Bound)
        const user = auth.currentUser;
        if (!user) throw new Error("Usuário não autenticado");

        const VPS_URL = import.meta.env.VITE_API_URL || 'https://marvel.viewflix.space';
        const tokenRes = await fetch(`${VPS_URL}/api/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid })
        });
        
        if (!tokenRes.ok) throw new Error("Acesso Negado: Falha na licença");
        const { token } = await tokenRes.json();

        // 3. Monta a URL Segura passando pelo Porteiro (Cloudflare Worker)
        const finalUrl = `https://assets.marvel.viewflix.space/videos/${id}/index.m3u8?token=${token}`;

        if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          videoElement.src = finalUrl;
        } else if (Hls.isSupported()) {
          if (hlsRef.current) hlsRef.current.destroy();
          const hls = new Hls({ maxMaxBufferLength: 30 });
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
             hls.loadSource(finalUrl);
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setDebugError('Erro fatal no stream da Cloudflare. ' + (data.details || ''));
                  break;
              }
            }
          });
        } else {
          videoElement.src = finalUrl;
        }
      } catch (err) {
         setDebugError(err.message);
         videoElement.setAttribute('controls', 'true');
      }
    };

    loadVideo();

    return () => {
      // Força o salvamento ao fechar o player
      if (maxWatchedRef.current > 0 && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current, durationRef.current);
      }
      
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [currentPlayData]);

  if (!currentPlayData) return null;

  const { type, title, episodes, currentEpisodeId } = currentPlayData;
  let nextEpisode = null;

  if (type === 'series' && episodes && currentEpisodeId) {
    const allEps = [];
    Object.keys(episodes).sort((a,b) => parseInt(a)-parseInt(b)).forEach(seasonNum => {
      episodes[seasonNum].forEach(ep => {
        allEps.push(ep);
      });
    });

    const currentIndex = allEps.findIndex(ep => ep.id === currentEpisodeId);
    if (currentIndex !== -1 && currentIndex < allEps.length - 1) {
      nextEpisode = allEps[currentIndex + 1];
    }
  }

  const handleNextEpisode = () => {
    if (nextEpisode) {
      // Salva o progresso do episódio atual antes de trocar
      if (maxWatchedRef.current > 0 && currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current, durationRef.current);
        maxWatchedRef.current = 0;
        currentTimeRef.current = 0;
      }
      
      setShowNextEpisodePrompt(false);
      
      if (onNextEpisode) {
        onNextEpisode({
          id: nextEpisode.id,
          type: 'series',
          ext: nextEpisode.container_extension,
          title: `${title.split(' - ')[0]} - ${nextEpisode.title}`,
          poster: currentPlayData.poster,
          episodes: episodes,
          currentEpisodeId: nextEpisode.id
        });
      }
    }
  };

  nextEpisodeRef.current = nextEpisode;
  handleNextEpisodeRef.current = handleNextEpisode;

  return (
    <div className="player-modal-overlay">
      <div className="player-modal-header">
        <h3 className="player-modal-title">{title}</h3>
        <button className="player-close-btn" onClick={onClose}><FaTimes /></button>
      </div>

      {showHevcWarning && (
        <div className="hevc-disclaimer">
          ⚠️ <strong>Conteúdo 4K (HEVC) detectado:</strong> Se a tela estiver preta e sair apenas áudio, instale a <a href="https://apps.microsoft.com/detail/9nmzlz57r3t7" target="_blank" rel="noreferrer">Extensão de Vídeo HEVC</a> e use o Microsoft Edge ou Safari.
        </div>
      )}

      {debugError && (
        <div style={{ position: 'absolute', top: '100px', left: '20px', color: 'red', zIndex: 9999, background: 'black', padding: '10px' }}>
          {debugError}
        </div>
      )}

      <div className="player-modal-video-container" ref={containerRef}>
      </div>

      {(nextEpisode && showNextEpisodePrompt) && (
        <button className="btn-next-episode" onClick={handleNextEpisode}>
          <FaStepForward /> Próximo: {nextEpisode.title}
        </button>
      )}
    </div>
  );
};

export default PlayerModal;
