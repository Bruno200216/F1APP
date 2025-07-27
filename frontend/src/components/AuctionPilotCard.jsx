import React, { useEffect, useState } from 'react';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelIcon from '@mui/icons-material/Gavel';

export default function AuctionPilotCard({
  photo,
  name,
  team,
  valorBase,
  pujaActual,
  tiempoRestante,
  numBids,
  onBid,
  disabled,
  showBidButton = true
}) {
  const [seconds, setSeconds] = useState(tiempoRestante);

  // Función para formatear números con puntos
  const formatNumberWithDots = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(num);
  };

  useEffect(() => {
    setSeconds(tiempoRestante);
  }, [tiempoRestante]);

  useEffect(() => {
    if (seconds <= 0) return;
    const interval = setInterval(() => {
      setSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const formatTime = s => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <Paper elevation={3} sx={{ display: 'flex', alignItems: 'center', p: 2, mb: 2, background: '#181c24', color: '#fff' }}>
      <Avatar src={photo} alt={name} sx={{ width: 64, height: 64, mr: 2, border: '2px solid #fff' }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: 18 }}>{name}</Typography>
        <Typography variant="body2" color="#b0b0b0" sx={{ fontWeight: 500 }}>{team}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 18, mr: 0.5, color: '#fbc02d' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#fbc02d', mr: 2 }}>{formatTime(seconds)}</Typography>
          <GavelIcon sx={{ fontSize: 18, mr: 0.5, color: '#90caf9' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#90caf9' }}>{numBids} pujas</Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right', minWidth: 120 }}>
        <Typography variant="body2" color="#b0b0b0">Valor</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>{formatNumberWithDots(valorBase)} €</Typography>
        <Typography variant="body2" color="#b0b0b0">Puja actual</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#f44336' }}>{formatNumberWithDots(pujaActual)} €</Typography>
      </Box>
      {showBidButton && (
        <Button
          variant="contained"
          color="error"
          sx={{ ml: 2, fontWeight: 700, fontSize: 16, px: 3, py: 1 }}
          disabled={seconds === 0 || disabled}
          onClick={onBid}
        >
          PUJAR
        </Button>
      )}
    </Paper>
  );
} 