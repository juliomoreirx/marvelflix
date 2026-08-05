import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, updateDoc, onSnapshot, addDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '../firebase';
import Header from '../components/Header/Header';
import { FaUserPlus, FaUserShield, FaBan, FaCheck, FaExclamationTriangle, FaFilm, FaTrash, FaCheckSquare } from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import useUIStore from '../store/uiStore';
import styles from './Admin.module.css';
import mcuData from '../data/mcu_full.json';
import outrosFilmes from '../data/outros_filmes.json';

const Admin = ({ userDoc, user }) => {
  const [activeTab, setActiveTab] = useState('users'); // 'users' ou 'messages'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Estados para criacao de usuario
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  // Estados para nova mensagem global
  const [msgTitle, setMsgTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgType, setMsgType] = useState('info'); // info, warning, danger, success
  const [msgTarget, setMsgTarget] = useState('dev'); // dev, all
  const [messages, setMessages] = useState([]);

  // Estados de Gerenciamento de Conteudo
  const customContent = useUIStore(state => state.customContent);
  const [contentId, setContentId] = useState('');
  const [contentType, setContentType] = useState('movie'); // movie ou series
  const [contentCategory, setContentCategory] = useState('outros');
  const [contentOrder, setContentOrder] = useState('');
  const [customPoster, setCustomPoster] = useState('');
  const [customBackdrop, setCustomBackdrop] = useState('');
  const [contentMsg, setContentMsg] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContents, setSelectedContents] = useState([]);
  const [modalConfig, setModalConfig] = useState(null);
  
  const VPS_URL = import.meta.env.VITE_API_URL || 'https://marvel.viewflix.space';

  const fullCatalog = React.useMemo(() => {
    let baseCatalog = [...mcuData, ...outrosFilmes];
    
    if (customContent && customContent.length > 0) {
      const overridesMap = {};
      customContent.forEach(c => {
        const id = c.info?.id || c.name || c.id;
        overridesMap[id] = c;
      });
      
      baseCatalog = baseCatalog.map(item => {
        const id = item.info?.id || item.name || item.id;
        if (overridesMap[id]) {
          const override = overridesMap[id];
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
      
      customContent.forEach(c => {
        const id = c.info?.id || c.name || c.id;
        const exists = baseCatalog.find(item => (item.info?.id || item.name || item.id) === id);
        if (!exists) {
          baseCatalog.push(c);
        }
      });
    }
    
    return baseCatalog.filter(c => {
       const name = (c.info?.name || c.name || '').toLowerCase();
       return name.includes(searchTerm.toLowerCase());
    });
  }, [customContent, searchTerm]);

  useEffect(() => {
    // Segurança da Rota
    const isDev = window.location.hostname.includes('dev') || window.location.hostname === 'localhost';
    if (!user || userDoc?.role !== 'admin' || !isDev) {
      navigate('/home');
      return;
    }

    // Carregar Usuarios
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const usersData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    });

    // Carregar Mensagens
    const unsubscribeMessages = onSnapshot(collection(db, 'global_messages'), (snap) => {
      const msgData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar pelas mais recentes
      msgData.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(msgData);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeMessages();
    };
  }, [user, userDoc, navigate]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    try {
      // Usar a instancia secundaria para nao deslogar o admin
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      await secondaryAuth.signOut(); // Desloga do secondary imediatamente

      // Cria o documento no firestore
      await setDoc(doc(db, 'users', userCred.user.uid), {
        email: newEmail,
        role: 'user',
        status: 'active',
        lastLogin: ''
      });

      setCreateMsg('Usuário criado com sucesso!');
      setNewEmail('');
      setNewPassword('');
    } catch (error) {
      console.error(error);
      setCreateMsg('Erro ao criar usuário: ' + error.message);
    }
  };

  const toggleUserStatus = async (uid, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    await updateDoc(doc(db, 'users', uid), {
      status: newStatus
    });
  };

  const handleCreateMessage = async (e) => {
    e.preventDefault();
    if (msgTarget === 'all') {
      const confirm = window.confirm("ATENÇÃO: Vai ser enviado pra TODOS os usuários no LIVE, tem certeza disso?");
      if (!confirm) return;
    }

    try {
      await addDoc(collection(db, 'global_messages'), {
        title: msgTitle,
        message: msgText,
        type: msgType,
        target: msgTarget,
        active: true,
        createdAt: Date.now(),
        createdBy: user.email
      });
      setMsgTitle('');
      setMsgText('');
      alert("Aviso global criado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao criar aviso.");
    }
  };

  const handleDeleteMessage = async (id) => {
    try {
      await deleteDoc(doc(db, 'global_messages', id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    if (!contentId) return;
    setContentMsg('Buscando dados...');
    
    try {
      const action = contentType === 'series' ? 'get_series_info' : 'get_vod_info';
      const response = await fetch(`${VPS_URL}/api/info?action=${action}&id=${contentId}`);
      if (!response.ok) throw new Error('Falha ao buscar ID na VPS');
      const data = await response.json();
      
      if (!data || !data.info) {
        throw new Error('Conteúdo não encontrado ou inválido.');
      }
      
      const newContent = {
        ...data,
        type: contentType,
        category: contentCategory,
        orderIndex: contentOrder ? parseInt(contentOrder, 10) : null
      };
      
      if (customPoster) {
        newContent.info.cover_big = customPoster;
        newContent.info.movie_image = customPoster;
      }
      
      if (customBackdrop) {
        newContent.info.backdrop_path = [customBackdrop];
      }
      
      await setDoc(doc(db, 'custom_content', contentId.toString()), newContent);
      setContentMsg('Conteúdo adicionado com sucesso!');
      setContentId('');
      setCustomPoster('');
      setCustomBackdrop('');
      setContentOrder('');
    } catch (err) {
      setContentMsg(`Erro: ${err.message}`);
    }
  };

  const handleSelectContent = (id) => {
    setSelectedContents(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  const handleDeleteContent = (content) => {
    const id = content.info?.id || content.name || content.id;
    setModalConfig({
      title: content.deleted ? 'Restaurar Conteúdo' : 'Ocultar / Remover Conteúdo',
      message: content.deleted 
        ? 'Tem certeza que deseja restaurar e exibir este conteúdo novamente para os usuários?' 
        : 'Tem certeza que deseja ocultar este conteúdo globalmente do catálogo? (Isto não apaga do Cloudflare R2)',
      isDanger: !content.deleted,
      onConfirm: async () => {
        try {
          if (content.deleted) {
             await setDoc(doc(db, 'custom_content', id.toString()), { deleted: false, id: id }, { merge: true });
             setContentMsg(`✅ Conteúdo '${id}' restaurado com sucesso!`);
          } else {
             await setDoc(doc(db, 'custom_content', id.toString()), { deleted: true, id: id }, { merge: true });
             setContentMsg(`✅ Conteúdo '${id}' ocultado com sucesso!`);
          }
        } catch (e) { 
          console.error('Erro ao modificar conteúdo', e); 
          setContentMsg(`Erro: ${e.message}`);
        }
        setModalConfig(null);
        setTimeout(() => setContentMsg(''), 4000);
      },
      onCancel: () => setModalConfig(null)
    });
  };
  
  const handleBulkDelete = () => {
    if (selectedContents.length === 0) return;
    setModalConfig({
      title: 'Excluir Selecionados',
      message: `Tem certeza que deseja ocultar ${selectedContents.length} conteúdos? (Isto não apaga do Cloudflare R2)`,
      isDanger: true,
      onConfirm: async () => {
        for (const id of selectedContents) {
           await setDoc(doc(db, 'custom_content', id.toString()), { deleted: true, id: id }, { merge: true });
        }
        setContentMsg(`✅ ${selectedContents.length} conteúdos ocultados com sucesso!`);
        setSelectedContents([]);
        setModalConfig(null);
        setTimeout(() => setContentMsg(''), 4000);
      },
      onCancel: () => setModalConfig(null)
    });
  };

  if (loading) return <div className="loader" style={{display:'flex', height:'100vh', justifyContent:'center', alignItems:'center'}}></div>;

  return (
    <div className={styles.adminContainer}>
      <Header user={user} userDoc={userDoc} onLogout={() => navigate('/login')} />
      
      <div className={styles.adminContent}>
        <div className={styles.adminHeader}>
          <h1><FaUserShield /> Painel Administrativo</h1>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'users' ? styles.active : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Usuários
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'messages' ? styles.active : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              Avisos Globais
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'content' ? styles.active : ''}`}
              onClick={() => setActiveTab('content')}
            >
              Gerenciar Conteúdo
            </button>
          </div>
        </div>

        {activeTab === 'users' && (
          <div className={styles.tabContent}>
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h2>Criar Novo Agente</h2>
                <form onSubmit={handleCreateUser} className={styles.adminForm}>
                  <input 
                    type="email" 
                    placeholder="E-mail" 
                    value={newEmail} 
                    onChange={e => setNewEmail(e.target.value)} 
                    required 
                  />
                  <input 
                    type="password" 
                    placeholder="Senha" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    required 
                  />
                  <button type="submit" className={styles.primaryBtn}><FaUserPlus /> Adicionar Usuário</button>
                  {createMsg && <p className={styles.msgText}>{createMsg}</p>}
                </form>
              </div>

              <div className={styles.card}>
                <h2>Agentes Cadastrados ({users.length})</h2>
                <div className={styles.userList}>
                  {users.map(u => (
                    <div key={u.uid} className={styles.userItem}>
                      <div className={styles.userInfo}>
                        <strong>{u.email}</strong>
                        <span>Papel: {u.role}</span>
                        <span>Último Login: {u.lastLogin ? new Date(u.lastLogin).toLocaleString('pt-BR') : 'Nunca'}</span>
                      </div>
                      <div className={styles.userActions}>
                        {u.uid !== user.uid && (
                          <button 
                            className={`${styles.statusBtn} ${u.status === 'active' ? styles.btnDanger : styles.btnSuccess}`}
                            onClick={() => toggleUserStatus(u.uid, u.status)}
                          >
                            {u.status === 'active' ? <><FaBan /> Bloquear</> : <><FaCheck /> Desbloquear</>}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className={styles.tabContent}>
             <div className={styles.grid2}>
              <div className={styles.card}>
                <h2>Criar Aviso Global</h2>
                <form onSubmit={handleCreateMessage} className={styles.adminForm}>
                  <input 
                    type="text" 
                    placeholder="Título do Aviso" 
                    value={msgTitle} 
                    onChange={e => setMsgTitle(e.target.value)} 
                    required 
                  />
                  <textarea 
                    placeholder="Mensagem..." 
                    value={msgText} 
                    onChange={e => setMsgText(e.target.value)} 
                    required 
                    rows="4"
                  />
                  <select value={msgType} onChange={e => setMsgType(e.target.value)}>
                    <option value="info">Azul (Informação)</option>
                    <option value="success">Verde (Sucesso/Novidade)</option>
                    <option value="warning">Amarelo (Alerta)</option>
                    <option value="danger">Vermelho (Crítico/Erro)</option>
                  </select>
                  <select value={msgTarget} onChange={e => setMsgTarget(e.target.value)}>
                    <option value="dev">Apenas DEV (Testes)</option>
                    <option value="all">TODOS OS USUÁRIOS (LIVE)</option>
                  </select>
                  <button type="submit" className={styles.primaryBtn}><FaExclamationTriangle /> Disparar Aviso</button>
                </form>
              </div>

              <div className={styles.card}>
                <h2>Histórico de Avisos (Lidos 1 vez por usuário)</h2>
                <div className={styles.userList}>
                  {messages.map(m => (
                    <div key={m.id} className={styles.userItem}>
                      <div className={styles.userInfo}>
                        <div>
                          <strong>{m.title}</strong>
                          <span style={{opacity: 0.8}}>{m.message}</span>
                          <span style={{fontSize: '0.8rem', color: '#888'}}>Alvo: {m.target} | Tipo: {m.type}</span>
                        </div>
                      </div>
                      <div className={styles.userActions}>
                          <button 
                            className={`${styles.statusBtn} ${styles.btnDanger}`}
                            onClick={() => handleDeleteMessage(m.id)}
                            title="Apagar Aviso do Histórico"
                          >
                            <FaTrash />
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className={styles.tabContent}>
            <div className={styles.grid2}>
              <div className={styles.card}>
                <h2>Adicionar Conteúdo</h2>
                <form onSubmit={handleAddContent} className={styles.adminForm}>
                  <input 
                    type="number" 
                    placeholder="ID do Conteúdo" 
                    value={contentId} 
                    onChange={e => setContentId(e.target.value)} 
                    required 
                  />
                  
                  <select value={contentType} onChange={e => setContentType(e.target.value)}>
                    <option value="movie">Filme</option>
                    <option value="series">Série</option>
                  </select>

                  <select value={contentCategory} onChange={e => setContentCategory(e.target.value)}>
                    <option value="era1">Cronologia - Era 1 (Origem)</option>
                    <option value="era2">Cronologia - Era 2 (Expansão)</option>
                    <option value="era3">Cronologia - Era 3 (Multiverso)</option>
                    <option value="movies4k">Universo Cinematográfico (4K)</option>
                    <option value="moviesLeg">Universo Cinematográfico (Legendado)</option>
                    <option value="moviesStd">Universo Cinematográfico (Padrão/Dublado)</option>
                    <option value="moviesCinema">Qualidade CINEMA</option>
                    <option value="outros">Outros Filmes (Expandido)</option>
                    <option value="series">Séries Expandidas</option>
                  </select>

                  {['era1', 'era2', 'era3'].includes(contentCategory) && (
                    <input 
                      type="number" 
                      placeholder="Posição na Ordem (Ex: 0 = primeiro, vazio = final)" 
                      value={contentOrder} 
                      onChange={e => setContentOrder(e.target.value)} 
                    />
                  )}

                  <input 
                    type="url" 
                    placeholder="URL da Capa (Opcional)" 
                    value={customPoster} 
                    onChange={e => setCustomPoster(e.target.value)} 
                  />
                  
                  <input 
                    type="url" 
                    placeholder="URL do Fundo/Backdrop (Opcional)" 
                    value={customBackdrop} 
                    onChange={e => setCustomBackdrop(e.target.value)} 
                  />

                  <button type="submit" className={styles.primaryBtn}><FaFilm /> Buscar e Adicionar</button>
                  {contentMsg && <p className={styles.msgText}>{contentMsg}</p>}
                </form>
              </div>

              <div className={styles.card}>
                <h2>Catálogo Unificado ({fullCatalog.length})</h2>
                <input 
                  type="text" 
                  placeholder="Pesquisar filme ou série..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: 'none', background: '#333', color: '#fff'}}
                />
                
                {selectedContents.length > 0 && (
                  <button className={`${styles.statusBtn} ${styles.btnDanger}`} onClick={handleBulkDelete} style={{marginBottom: '10px', width: '100%'}}>
                    <FaTrash /> Ocultar {selectedContents.length} selecionados
                  </button>
                )}
                
                <div className={styles.userList}>
                  {fullCatalog.map(c => {
                    const id = c.info?.id || c.name || c.id;
                    return (
                      <div key={id || Math.random()} className={`${styles.userItem} ${c.deleted ? styles.msgInactive : ''}`}>
                        <div className={styles.userInfo} style={{flexDirection: 'row', alignItems: 'center', gap: '15px'}}>
                          <input 
                            type="checkbox" 
                            checked={selectedContents.includes(id)}
                            onChange={() => handleSelectContent(id)}
                          />
                          <img 
                            src={c.info?.cover_big || c.info?.movie_image || '/marvelflix_logo.png'} 
                            alt="Capa" 
                            style={{width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px', opacity: c.deleted ? 0.4 : 1, background: '#111'}}
                            onError={(e) => { e.target.src = '/marvelflix_logo.png'; }}
                          />
                          <div>
                            <strong>{c.info?.name || c.name} {c.deleted ? <span style={{color:'red'}}>(DELETADO)</span> : ''}</strong>
                            <span>ID: {c.info?.id} | Cat: {c.category} {c.orderIndex !== undefined ? `(Posição: ${c.orderIndex})` : ''}</span>
                          </div>
                        </div>
                        <div className={styles.userActions}>
                            <button 
                              className={`${styles.statusBtn} ${c.deleted ? styles.btnSuccess : styles.btnDanger}`}
                              onClick={() => handleDeleteContent(c)}
                              title={c.deleted ? "Restaurar Conteúdo" : "Ocultar Conteúdo"}
                            >
                              {c.deleted ? <FaCheckSquare /> : <FaTrash />}
                            </button>
                        </div>
                      </div>
                    );
                  })}
                  {fullCatalog.length === 0 && (
                    <p style={{color: '#888', textAlign: 'center'}}>Nenhum conteúdo encontrado.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {modalConfig && (
        <ConfirmModal 
          {...modalConfig}
        />
      )}
    </div>
  );
};

export default Admin;
