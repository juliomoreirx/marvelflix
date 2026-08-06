import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import mcuData from '../data/mcu_full.json';
import outrosFilmes from '../data/outros_filmes.json';
import { getProxyImageUrl } from '../api';
import posterPlaceholder from '../assets/poster_placeholder.webp';
import appLogo from '../assets/logo.svg';
import Modal from '../components/Modal';
import PlayerModal from '../components/PlayerModal';
import Header from '../components/Header/Header';
import MobileNav from '../components/MobileNav/MobileNav';
import SearchOverlay from '../components/SearchOverlay/SearchOverlay';
import Hero from '../components/Hero/Hero';
import Row from '../components/Row/Row';
import Skeleton from '../components/Skeleton/Skeleton';
import Footer from '../components/Footer/Footer';
import WelcomeModal from '../components/WelcomeModal/WelcomeModal';
import useUIStore from '../store/uiStore';
import { auth, db } from '../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { FaSignOutAlt, FaBars, FaPlay, FaBell, FaSearch } from 'react-icons/fa';
import './Home.css';

const Home = ({ userDoc }) => {
  const [movies4k, setMovies4k] = useState([]);
  const [moviesLeg, setMoviesLeg] = useState([]);
  const [moviesStd, setMoviesStd] = useState([]);
  const [moviesCinema, setMoviesCinema] = useState([]);
  const [seriesData, setSeriesData] = useState([]);
  const [outrosData, setOutrosData] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [availableMovieIds, setAvailableMovieIds] = useState([]);
  const [era1, setEra1] = useState([]);
  const [era2, setEra2] = useState([]);
  const [era3, setEra3] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [heroItems, setHeroItems] = useState([]);

  const { isChronologicalMode, setPlayerOpen, customContent } = useUIStore();
  
  const [selectedItem, setSelectedItem] = useState(null); 
  const [playingItem, setPlayingItem] = useState(null); 
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const navigate = useNavigate();
  const notificationsContext = useNotification();
  const notifications = notificationsContext ? notificationsContext.notifications : [];
  const addNotification = notificationsContext ? notificationsContext.addNotification : () => {};
  const markAllAsRead = notificationsContext ? notificationsContext.markAllAsRead : () => {};
  const VPS_URL = import.meta.env.VITE_API_URL || 'https://marvel.viewflix.space';

  useEffect(() => {
    setPlayerOpen(!!playingItem);
  }, [playingItem, setPlayerOpen]);

  useEffect(() => {
    const hideWelcome = localStorage.getItem('marvelflix_hide_welcome') || userDoc?.hideWelcome;
    if (!hideWelcome) {
      setShowWelcomeModal(true);
    }
  }, [userDoc]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Mesclar catálogo base (mcuData + outrosFilmes) com overrides do Firestore (customContent)
        let baseCatalog = [...mcuData, ...outrosFilmes];
        
        if (customContent && customContent.length > 0) {
          const overridesMap = {};
          customContent.forEach(c => {
            const id = c.info?.id || c.name || c.id;
            overridesMap[id] = c;
          });
          
          // Aplica os overrides aos itens originais
          baseCatalog = baseCatalog.map(item => {
            const id = item.info?.id || item.name || item.id;
            if (overridesMap[id]) {
              const override = overridesMap[id];
              // Se foi deletado pelo painel
              if (override.deleted) return { ...item, deleted: true };
              
              // Mescla os dados
              return {
                ...item,
                ...override,
                info: {
                  ...item.info,
                  ...override.info
                },
                category: override.category || item.category,
                orderIndex: override.orderIndex !== undefined ? override.orderIndex : item.orderIndex
              };
            }
            return item;
          });
          
          // Adiciona os que NÃO estavam no catálogo base (conteúdos novos)
          customContent.forEach(c => {
            const id = c.info?.id || c.name || c.id;
            const exists = baseCatalog.find(item => (item.info?.id || item.name || item.id) === id);
            if (!exists && !c.deleted) {
              baseCatalog.push(c);
            }
          });
        }
        
        // Remove os deletados
        const fullCatalog = baseCatalog.filter(item => !item.deleted);

        // --- Hero Items (Com Capa Horizontal / Backdrop) ---
        const itemsWithBackdrop = fullCatalog.filter(m => {
          if (!m.info || !m.info.backdrop_path || m.info.backdrop_path.length === 0) return false;
          if (m.type === 'series') return false;
          const title = (m.info.name || m.name || "").toLowerCase();
          if (title.includes('4k') || title.includes('uhd')) return false;
          if (title.includes('[l]') || title.includes('legendado')) return false;
          if (m.category === "Qualidade CINEMA") return false;
          return true;
        });
        // Embaralha e pega 10 filmes pro Hero
        const shuffled = itemsWithBackdrop.sort(() => 0.5 - Math.random());
        setHeroItems(shuffled.slice(0, 10));

        const m4k = [];
        const mLeg = [];
        const mStd = [];
        const mCin = [];
        const mOutros = [];
        const mSeries = [];

        fullCatalog.forEach(m => {
          if (m.category === "Qualidade CINEMA") {
            mCin.push(m);
          } else if (m.category === "movies4k" || (m.info?.name || m.name || "").toLowerCase().includes('4k')) {
            m4k.push(m);
          } else if (m.category === "moviesLeg" || (m.info?.name || m.name || "").toLowerCase().includes('[l]')) {
            mLeg.push(m);
          } else if (m.category === "outros") {
            mOutros.push(m);
          } else if (m.type === "series" || m.category === "series") {
            mSeries.push(m);
          } else {
            mStd.push(m);
          }
        });

        setMovies4k(m4k);
        setMoviesLeg(mLeg);
        setMoviesStd(mStd);
        setMoviesCinema(mCin);
        setOutrosData(mOutros);
        setSeriesData(mSeries);

        // --- Lógica do Modo Cronológico ---
        const list1 = [
          "Capitão América: O Primeiro Vingador", "Agente Carter", "Capitã Marvel", 
          "Homem de Ferro", "Homem de Ferro 2", "O Incrível Hulk", "Thor", 
          "Os Vingadores", "Homem de Ferro 3"
        ];
        
        const list2 = [
          "Thor: O Mundo Sombrio", "Capitão América: O Soldado Invernal", 
          "Guardiões da Galáxia", "Guardiões da Galáxia Vol. 2", "Eu Sou Groot", 
          "Vingadores: Era de Ultron", "Homem-Formiga", "Capitão América: Guerra Civil", 
          "Viúva Negra", "Pantera Negra", "Homem-Aranha: De Volta ao Lar", 
          "Doutor Estranho", "Thor: Ragnarok", "Homem-Formiga e a Vespa", 
          "Vingadores: Guerra Infinita", "Vingadores: Ultimato"
        ];
        
        const list3 = [
          "Loki", "What If...?", "WandaVision", "Shang-Chi e a Lenda dos Dez Anéis", 
          "Falcão e o Soldado Invernal", "Eternos", "Homem-Aranha: Longe de Casa", 
          "Homem-Aranha: Sem Volta para Casa", "Doutor Estranho no Multiverso da Loucura", 
          "Gavião Arqueiro", "Cavaleiro da Lua", "Ms. Marvel", "Thor: Amor e Trovão", 
          "Pantera Negra: Wakanda Para Sempre", "Mulher Hulk", 
          "Homem-Formiga e a Vespa: Quantumania", "Guardiões da Galáxia Vol. 3", 
          "Invasão Secreta", "As Marvels", "Deadpool & Wolverine", "Agatha Desde Sempre", 
          "Capitão América: Admirável Mundo Novo", "Demolidor: Renascido", "Thunderbolts", "Magnum",
          "Homem-Aranha: Um Novo Dia"
        ];

        const matchItem = (target, fullData) => {
          let targetName = target.toLowerCase().replace(/\(\d{4}(–\d{4})?\)/g, '').trim();
          const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
          const nTarget = norm(targetName);

          const candidates = fullData.filter(item => {
             let itemName = (item.info?.name || item.name || "").toLowerCase();
             const nItem = norm(itemName);
             
             if (nItem === nTarget) return true;
             if (nItem.startsWith(nTarget)) {
                const remainder = nItem.replace(nTarget, '');
                if (remainder.match(/^(4k|hdr|l|legendado|cinema|dublado|hybrid)+$/)) return true;
             }
             if (nTarget === 'osvingadores' && nItem.startsWith('osvingadorestheavengers')) return true;
             if (nTarget.includes('mulherhulk') && nItem.includes('mulherhulk')) return true;
             if (nTarget.includes('umnovodia') && nItem.includes('umnovodia')) return true;
             if (nTarget === 'guardioesdagalaxiavol3' && nItem.startsWith('guardioesdagalaxiavol3')) return true;
             if (nTarget === 'guardioesdagalaxiavol2' && nItem.startsWith('guardioesdagalaxiavol2')) return true;
             return false;
          });

          if (candidates.length === 0) return null;

          const fourK = candidates.find(c => {
             const t = (c.info?.name || c.name || "").toLowerCase();
             return t.includes('4k') || t.includes('uhd');
          });
          if (fourK) return fourK;

          const standard = candidates.find(c => {
             const t = (c.info?.name || c.name || "").toLowerCase();
             return !t.includes('[l]') && c.category !== "Qualidade CINEMA";
          });
          if (standard) return standard;

          return candidates[0];
        };

        const e1 = list1.map(t => matchItem(t, fullCatalog)).filter(Boolean);
        const e2 = list2.map(t => matchItem(t, fullCatalog)).filter(Boolean);
        const e3 = list3.map(t => matchItem(t, fullCatalog)).filter(Boolean);

        (customContent || []).filter(c => !c.deleted).forEach(c => {
           const order = c.orderIndex !== undefined && c.orderIndex !== null ? parseInt(c.orderIndex, 10) : -1;
           if (c.category === 'era1') {
             if (order >= 0 && order <= e1.length) e1.splice(order, 0, c);
             else e1.push(c);
           } else if (c.category === 'era2') {
             if (order >= 0 && order <= e2.length) e2.splice(order, 0, c);
             else e2.push(c);
           } else if (c.category === 'era3') {
             if (order >= 0 && order <= e3.length) e3.splice(order, 0, c);
             else e3.push(c);
           }
        });

        setEra1(e1);
        setEra2(e2);
        setEra3(e3);

      } catch (e) {
        console.error("Error loading home data", e);
      }
      setLoading(false);
    };

    fetchAllData();
  }, [customContent]); // Run when customContent from Firebase changes

  // Auth & Continue Watching Effect
  useEffect(() => {
    let cwUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (cwUnsubscribe) {
        cwUnsubscribe();
        cwUnsubscribe = null;
      }
      
      if (user) {
        const cwRef = collection(db, `users/${user.uid}/continue_watching`);
        cwUnsubscribe = onSnapshot(cwRef, (snap) => {
          const cwData = snap.docs.map(doc => doc.data());
          cwData.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          setContinueWatching(cwData.slice(0, 10));
        }, (error) => {
          console.error("Erro no onSnapshot do CW", error);
        });
      } else {
        setContinueWatching([]);
      }
    });

    return () => {
      authUnsubscribe();
      if (cwUnsubscribe) cwUnsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const getAgentName = () => {
    const name = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleBell = () => {
    setBellOpen(!bellOpen);
    if (!bellOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const getPoster = (item) => {
    const info = item.info || item;
    return info.cover_big || info.movie_image || info.cover || item.poster;
  };

  const handlePlayRequest = async (playData) => {
    // Agora o PlayerModal se encarrega de pedir o token seguro e falar com a Cloudflare.
    setPlayingItem(playData);
    setSelectedItem(null);
  };

  const handleContinuePlay = (item) => {
     let episodes = undefined;
     let currentEpisodeId = undefined;
     
     if (item.type === 'series') {
       // Procura em qual série este episódio pertence para resgatar a lista inteira
       const allSeries = mcuData.filter(m => m.type === 'series' && m.episodes);
       for (const s of allSeries) {
         for (const season of Object.values(s.episodes)) {
           const ep = season.find(e => String(e.id) === String(item.videoId));
           if (ep) {
             episodes = s.episodes;
             currentEpisodeId = ep.id;
             break;
           }
         }
         if (episodes) break;
       }
     }

     handlePlayRequest({
        id: item.videoId,
        title: item.title,
        poster: item.poster,
        type: item.type,
        savedTime: item.time,
        episodes: episodes,
        currentEpisodeId: currentEpisodeId
     });
  };

  // Old render methods removed

  if (loading) {
    return <Skeleton />;
  }

  return (
    <>
      <Helmet>
        <title>Catálogo | MarvelFlix</title>
        <meta name="description" content="Explore o universo cinematográfico da Marvel. Filmes, séries, cronologia oficial e lançamentos em 4K." />
      </Helmet>
      <div className="home-container">
      <Header user={auth.currentUser} userDoc={userDoc} onLogout={handleLogout} />
      <MobileNav />
      <SearchOverlay onCardClick={setSelectedItem} />

      {heroItems.length > 0 && (
        <div id="hero">
          <Hero 
            user={auth.currentUser} 
            featuredItems={heroItems} 
            onPlay={handlePlayRequest} 
            onInfo={setSelectedItem}
          />
        </div>
      )}

        <div className="catalog-container">
          <Row 
            title="Continue Assistindo" 
            items={continueWatching} 
            isContinueWatching={true} 
            onCardClick={handleContinuePlay} 
          />
          
          {isChronologicalMode ? (
            <>
              <Row 
                id="era-1"
                title="A Origem dos Heróis e a formação dos Vingadores" 
                items={era1} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                id="era-2"
                title="A Expansão do Universo e as Joias do Infinito" 
                items={era2} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                id="era-3"
                title="A Saga do Multiverso e o Novo Cenário Global" 
                items={era3} 
                onCardClick={setSelectedItem} 
              />
            </>
          ) : (
            <>
              <Row 
                title="Qualidade CINEMA" 
                items={moviesCinema} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                id="filmes-4k"
                title="Universo Cinematográfico (4K)" 
                items={movies4k} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                title="Universo Cinematográfico (Legendado)" 
                items={moviesLeg} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                title="Universo Cinematográfico (Padrão/Dublado)" 
                items={moviesStd} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                id="outros"
                title="Outros Filmes (Expandido)" 
                items={outrosData} 
                onCardClick={setSelectedItem} 
              />
              <Row 
                id="series"
                title="Séries Expandidas" 
                items={seriesData} 
                onCardClick={setSelectedItem} 
              />
            </>
          )}
        </div>

      {selectedItem && (
        <Modal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onPlay={handlePlayRequest}
        />
      )}

      {playingItem && (
        <PlayerModal 
          playData={playingItem} 
          onClose={() => {
             setPlayingItem(null);
             // onSnapshot fará o trabalho de atualizar a Home automaticamente!
          }} 
          onNextEpisode={(nextEpData) => {
             setPlayingItem(null);
             handlePlayRequest(nextEpData);
          }}
        />
      )}

      <Footer />

      {showWelcomeModal && (
        <WelcomeModal onClose={() => setShowWelcomeModal(false)} />
      )}
    </div>
    </>
  );
};

export default Home;
