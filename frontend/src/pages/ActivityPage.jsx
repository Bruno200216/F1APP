import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

function formatDate(fecha) {
  const d = new Date(fecha);
  return isNaN(d) ? '' : d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getPhrase({ Tipo, PlayerName, CounterName, PilotName, PilotMode, ValorPagado }) {
  const modo = PilotMode ? PilotMode.charAt(0).toUpperCase() + PilotMode.slice(1) : '';
  const valor = ValorPagado?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  if (Tipo === 'fichaje') {
    return `${PlayerName} ha comprado a ${CounterName} a ${PilotName} (${modo}) por ${valor}`;
  } else if (Tipo === 'venta') {
    return `${PlayerName} ha vendido a ${CounterName} a ${PilotName} (${modo}) por ${valor}`;
  }
  return '';
}

export default function ActivityPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        setHistory(data.history || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <Box sx={{ background: '#18192a', minHeight: '100vh', p: 0 }}>
      <Typography variant="h5" sx={{ color: '#FFD600', fontWeight: 700, textAlign: 'center', pt: 3, pb: 2 }}>
        Operación de mercado
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
          <CircularProgress color="warning" />
        </Box>
      ) : (
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 1 }}>
          {history.length === 0 ? (
            <Typography sx={{ color: '#fff', textAlign: 'center', mt: 6 }}>No hay actividad reciente.</Typography>
          ) : (
            history.map((item, idx) => (
              <Paper key={idx} elevation={2} sx={{ background: '#23243a', mb: 2, p: 2, borderRadius: 3, boxShadow: 3 }}>
                <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15, mb: 0.5 }}>
                  Operación de mercado
                </Typography>
                <Typography sx={{ color: '#fff', fontWeight: 500, fontSize: 15, mb: 1 }}>
                  {getPhrase(item)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', color: '#b0b0b0', fontSize: 13 }}>
                  <AccessTimeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  {formatDate(item.Fecha)}
                </Box>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Box>
  );
} 