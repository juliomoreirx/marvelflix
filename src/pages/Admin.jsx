import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, setDoc, updateDoc, onSnapshot, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '../firebase';
import Header from '../components/Header/Header';
import { FaUserPlus, FaUserShield, FaBan, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import styles from './Admin.module.css';

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

  const toggleMessageActive = async (id, currentActive) => {
    await updateDoc(doc(db, 'global_messages', id), {
      active: !currentActive
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
                <h2>Avisos Criados</h2>
                <div className={styles.userList}>
                  {messages.map(m => (
                    <div key={m.id} className={`${styles.userItem} ${m.active ? styles.msgActive : styles.msgInactive}`}>
                      <div className={styles.userInfo}>
                        <strong>{m.title}</strong>
                        <span>Alvo: {m.target === 'all' ? 'LIVE' : 'DEV'} | Cor: {m.type}</span>
                        <span>{new Date(m.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className={styles.userActions}>
                          <button 
                            className={`${styles.statusBtn} ${m.active ? styles.btnDanger : styles.btnSuccess}`}
                            onClick={() => toggleMessageActive(m.id, m.active)}
                          >
                            {m.active ? 'Desativar' : 'Ativar'}
                          </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
