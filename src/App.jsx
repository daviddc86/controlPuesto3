import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

// Banco de emojis predefinidos para los nuevos usuarios
const EMOJI_POOL = ['👩‍💻', '👩‍🎨', '👨‍💼', '👩‍🚀', '👨‍🎤', '🕵️‍♂️', '🥷', '🧙‍♂️', '🧛‍♂️', '🤠'];
const defaultTiemDispaly = "00:00:00";

function App() {
  const [usersList, setUsersList] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeDisplay, setTimeDisplay] = useState(defaultTiemDispaly);
  const [history, setHistory] = useState({});
  const [statusText, setStatusText] = useState("Selecciona quién va a evacuar...");

  // Estados para la creación de nuevos usuarios
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");

  // 🟢 NUEVO ESTADO: 'time' para ver tiempos, 'wc' para modo discreto (defautl)
  const [viewMode, setViewMode] = useState('wc');

  useEffect(() => {
    initApp();

    const savedSession = localStorage.getItem('poop_active_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setCurrentUser(session.user);
      setStartTime(new Date(session.startTime));
      setIsActive(true);
      setStatusText(`💩 ${session.user} está en el trono...`);
    }
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive && startTime) {
      interval = setInterval(() => {
        const diffMs = new Date() - new Date(startTime);
        setTimeDisplay(formatMs(diffMs));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const initApp = async () => {
    await fetchUsers();
    await fetchHistory();
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios_caca')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      setUsersList(data || []);
    } catch (error) {
      console.error("Error cargando usuarios:", error.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_caca')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;

      const grouped = {};
      data.forEach(item => {
        if (!item.fecha) return;
        const [year, month, day] = item.fecha.split('-');
        const dateKey = `${day}/${month}/${year}`;

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          id: item.id,
          user: item.usuario,
          timeRange: `${item.hora_inicio ? item.hora_inicio.slice(0, 5) : '00:00'} - ${item.hora_fin ? item.hora_fin.slice(0, 5) : '00:00'}`,
          durationMs: (item.duracion_segundos || 0) * 1000
        });
      });

      setHistory(grouped);
    } catch (error) {
      console.error("Error cargando histórico:", error.message);
    }
  };

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    const nameTrimmed = newUserName.trim();
    if (!nameTrimmed) return;

    if (usersList.some(u => u.nombre.toLowerCase() === nameTrimmed.toLowerCase())) {
      alert("¡Ese usuario ya existe en el Puesto 3!");
      return;
    }

    const nextEmoji = EMOJI_POOL[usersList.length % EMOJI_POOL.length];

    try {
      const { error } = await supabase
        .from('usuarios_caca')
        .insert([{ nombre: nameTrimmed, avatar: nextEmoji }]);

      if (error) throw error;

      setNewUserName("");
      setShowAddUser(false);
      await fetchUsers();
      setStatusText(`¡Bienvenido/a al equipo, ${nameTrimmed}!`);
    } catch (error) {
      alert("Error al crear usuario: " + error.message);
    }
  };

  const selectUser = (user) => {
    if (isActive) return;
    setCurrentUser(user);
    setStatusText(`Listo para registrar a ${user}`);
  };

  const startSession = () => {
    if (!currentUser || isActive) return;
    const now = new Date();
    setStartTime(now);
    setIsActive(true);
    setStatusText(`💩 ${currentUser} está en el trono...`);

    localStorage.setItem('poop_active_session', JSON.stringify({
      user: currentUser,
      startTime: now
    }));
  };

  const stopSession = async () => {
    if (!isActive) return;

    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationSeconds = Math.floor(durationMs / 1000);

    const dateString = endTime.toISOString().split('T')[0];
    const startTimeString = startTime.toTimeString().split(' ')[0];
    const endTimeString = endTime.toTimeString().split(' ')[0];

    setStatusText("Subiendo datos a la nube... ☁️");

    try {
      const { error } = await supabase
        .from('registros_caca')
        .insert([
          {
            usuario: currentUser,
            fecha: dateString,
            hora_inicio: startTimeString,
            hora_fin: endTimeString,
            duracion_segundos: durationSeconds
          }
        ]);

      if (error) throw error;

      localStorage.removeItem('poop_active_session');
      setIsActive(false);
      setStartTime(null);
      setTimeDisplay(defaultTiemDispaly);
      setStatusText(`Sesión de ${currentUser} guardada con éxito.`);
      await fetchHistory();

    } catch (error) {
      alert("Error al guardar en la nube: " + error.message);
    }
  };

  const formatMs = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const getUserAvatar = (username) => {
    const userObj = usersList.find(u => u.nombre === username);
    return userObj ? userObj.avatar : '💩';
  };

  return (
    <div className="body-wrapper">
      <div className="container">
        <header>
          <h1><span className="poop-floating">💩</span> Las Cacas del Puesto 3 <span className="poop-floating">💩</span></h1>
          <p>Control de productividad cooperativo en la nube</p>
        </header>

        {/* 🟢 NUEVA SECCIÓN: Botones de modo de visualización */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px' }}>
          <button
            className={`clear-btn ${viewMode === 'time' ? 'active-mode' : ''}`}
            onClick={() => setViewMode('time')}
            style={{ fontSize: '16px', padding: '6px 12px', borderRadius: '20px', border: viewMode === 'time' ? '1px solid var(--primary)' : '1px solid transparent', background: viewMode === 'time' ? '#fcf8f5' : 'transparent', fontWeight: viewMode === 'time' ? 'bold' : 'normal' }}
          >
            ⏱️ Ver Tiempos
          </button>
          <button
            className={`clear-btn ${viewMode === 'wc' ? 'active-mode' : ''}`}
            onClick={() => setViewMode('wc')}
            style={{ fontSize: '16px', padding: '6px 12px', borderRadius: '20px', border: viewMode === 'wc' ? '1px solid var(--primary)' : '1px solid transparent', background: viewMode === 'wc' ? '#fcf8f5' : 'transparent', fontWeight: viewMode === 'wc' ? 'bold' : 'normal' }}
          >
            🚽 Modo Discreto
          </button>
        </div>

        {/* Selector de Usuarios */}
        <div className="user-selector" style={{ flexWrap: 'wrap' }}>
          {usersList.map(user => (
            <button
              key={user.id}
              className={`user-btn ${currentUser === user.nombre ? 'active' : ''}`}
              onClick={() => selectUser(user.nombre)}
              disabled={isActive && currentUser !== user.nombre}
              style={{ minWidth: '100px', margin: '2px' }}
            >
              <span className="avatar">{user.avatar}</span>
              <span>{user.nombre}</span>
            </button>
          ))}

          {!isActive && (
            <button className="user-btn add-user-trigger" onClick={() => setShowAddUser(!showAddUser)}>
              <span className="avatar">➕</span>
              <span>Añadir</span>
            </button>
          )}
        </div>

        {showAddUser && (
          <form onSubmit={handleAddUserSubmit} className="add-user-form">
            <input
              type="text"
              placeholder="Nombre del nuevo recluta..."
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              maxLength={15}
              required
            />
            <button type="submit" className="btn-save-user">Dar de alta</button>
          </form>
        )}

        {/* Panel de Control */}
        <div className="control-panel">
          <div className="current-status">{statusText}</div>

          {/* 🟢 CONDICIONAL: Oculta el cronómetro si el modo discreto está activo */}
          {/* 🟢 Si viewMode es 'wc', se añade la clase 'timer-discreto' */}
          <div className={`timer ${viewMode === 'wc' ? 'timer-discreto' : ''}`}>
            {viewMode === 'time' ? timeDisplay : (timeDisplay === defaultTiemDispaly ? 'En el Puesto' : 'En el Baño')}
          </div>

          <div className="action-buttons">
            <button className="btn btn-start" onClick={startSession} disabled={!currentUser || isActive}>
              🚀 Iniciar Operación
            </button>
            <button className="btn btn-stop" onClick={stopSession} disabled={!isActive}>
              🛑 Fin de Misión
            </button>
          </div>
        </div>

        {/* Histórico */}
        <div className="history-panel">
          <div className="history-header">
            <h2>📊 Histórico Realtime</h2>
            <button className="clear-btn" onClick={initApp}>🔄 Sincronizar</button>
          </div>
          <div className="history-list">
            {Object.keys(history).length === 0 ? (
              <div className="empty-state">No hay registros todavía...</div>
            ) : (
              Object.keys(history).map(date => {
                const records = history[date];

                const totals = {};
                records.forEach(r => {
                  if (!totals[r.user]) totals[r.user] = { count: 0, ms: 0 };
                  totals[r.user].count++;
                  totals[r.user].ms += r.durationMs;
                });

                return (
                  <div className="day-group" key={date}>
                    <div className="day-title">📅 {date}</div>
                    {records.map(r => (
                      <div className="history-item" key={r.id}>
                        <div className="item-user">
                          {getUserAvatar(r.user)} {r.user} 💩
                        </div>
                        <div className="item-stats">
                          {/* 🟢 CONDICIONAL: Oculta la duración individual del registro */}
                          <div><strong>{viewMode === 'time' ? formatMs(r.durationMs) : '🚽 Misión'}</strong></div>
                          <div className="item-time">{r.timeRange}</div>
                        </div>
                      </div>
                    ))}
                    <div className="day-summary">
                      Resumen: {Object.keys(totals).map(user => {
                        const conteo = totals[user].count;
                        if (viewMode === 'time') {
                          return `${user}: ${conteo}x (⏱️${formatMs(totals[user].ms)})`;
                        } else {
                          return `${user}: ${conteo}x (🚽)`;
                        }
                      }).join(' | ')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;