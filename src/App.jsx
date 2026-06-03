import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [timeDisplay, setTimeDisplay] = useState("00:00:00");
  const [history, setHistory] = useState({});
  const [statusText, setStatusText] = useState("Selecciona quién va a evacuar...");

  // 1. Al arrancar: Comprobar si había sesión activa y cargar el histórico de Supabase
  useEffect(() => {
    const savedSession = localStorage.getItem('poop_active_session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setCurrentUser(session.user);
      setStartTime(new Date(session.startTime));
      setIsActive(true);
      setStatusText(`💩 ${session.user} está en el trono...`);
    }
    fetchHistory();
  }, []);

  // 2. Efecto para controlar el segundero del cronómetro
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

  // 3. Traer datos desde Supabase
  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_caca')
        .select('*')
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;

      // Agrupar los datos por fecha en un objeto similar al que usábamos en LocalStorage
      const grouped = {};
      data.forEach(item => {
        // Protección: si por algún motivo no hay fecha válida, saltar al siguiente
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

    // Guardamos en LocalStorage por si el móvil se apaga o recarga a mitad de sesión
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

    // Preparar strings para el formato SQL de Supabase
    const dateString = endTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const startTimeString = startTime.toTimeString().split(' ')[0]; // HH:MM:SS
    const endTimeString = endTime.toTimeString().split(' ')[0]; // HH:MM:SS

    setStatusText("Subiendo datos a la nube... ☁️");

    try {
      // Mandar a Supabase
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

      // Limpiar estados locales
      localStorage.removeItem('poop_active_session');
      setIsActive(false);
      setStartTime(null);
      setTimeDisplay("00:00:00");
      setStatusText(`Sesión de ${currentUser} guardada con éxito en la nube.`);

      // Forzar recarga del histórico
      await fetchHistory();

    } catch (error) {
      alert("Error al guardar en la nube: " + error.message);
      setStatusText("Error al guardar. Reinténtalo.");
    }
  };

  // Helper para formatear milisegundos a formato HH:MM:SS
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

  return (
    <div className="body-wrapper">
      <div className="container">
        <header>
          <h1><span className="poop-floating">💩</span> Las Cacas del Puesto 3 <span className="poop-floating">💩</span></h1>
          <p>Control de productividad en la nube</p>
        </header>

        {/* Selector de Usuario */}
        <div className="user-selector">
          <button
            className={`user-btn ${currentUser === 'Vir' ? 'active' : ''}`}
            data-user="Vir"
            onClick={() => selectUser('Vir')}
            disabled={isActive && currentUser !== 'Vir'}
          >
            <span className="avatar">👩‍💻</span>
            <span>Vir</span>
          </button>
          <button
            className={`user-btn ${currentUser === 'Ainoha' ? 'active' : ''}`}
            data-user="Ainoha"
            onClick={() => selectUser('Ainoha')}
            disabled={isActive && currentUser !== 'Ainoha'}
          >
            <span className="avatar">👩‍🎨</span>
            <span>Ainoha</span>
          </button>
        </div>

        {/* Panel de Control */}
        <div className="control-panel">
          <div className="current-status">{statusText}</div>
          <div className="timer">{timeDisplay}</div>

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
            <button className="clear-btn" onClick={fetchHistory}>🔄 Sincronizar</button>
          </div>
          <div className="history-list">
            {Object.keys(history).length === 0 ? (
              <div className="empty-state">No hay registros todavía o se están descargando de la nube...</div>
            ) : (
              Object.keys(history).map(date => {
                const records = history[date];
                const totals = { Vir: { count: 0, ms: 0 }, Ainoha: { count: 0, ms: 0 } };

                records.forEach(r => {
                  if (totals[r.user]) {
                    totals[r.user].count++;
                    totals[r.user].ms += r.durationMs;
                  }
                });

                return (
                  <div className="day-group" key={date}>
                    <div className="day-title">📅 {date}</div>
                    {records.map(r => (
                      <div className="history-item" key={r.id}>
                        <div className={`item-user user-tag-${r.user}`}>
                          {r.user === 'Vir' ? '👩‍💻' : '👩‍🎨'} {r.user} 💩
                        </div>
                        <div className="item-stats">
                          <div><strong>{formatMs(r.durationMs)}</strong></div>
                          <div className="item-time">{r.timeRange}</div>
                        </div>
                      </div>
                    ))}
                    <div className="day-summary">
                      Resumen: {totals.Vir.count > 0 && `Vir: ${totals.Vir.count}x (⏱️${formatMs(totals.Vir.ms)})`}
                      {totals.Vir.count > 0 && totals.Ainoha.count > 0 && ' | '}
                      {totals.Ainoha.count > 0 && `Ainoha: ${totals.Ainoha.count}x (⏱️${formatMs(totals.Ainoha.ms)})`}
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