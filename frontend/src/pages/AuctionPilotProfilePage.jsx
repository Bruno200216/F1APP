import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GavelIcon from '@mui/icons-material/Gavel';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { useLeague } from '../context/LeagueContext';

// Colores de equipos de F1
const teamColors = {
  'Red Bull Racing': { primary: '#3671C6', secondary: '#1E41C3' },
  'Mercedes': { primary: '#6CD3BF', secondary: '#00D2BE' },
  'McLaren': { primary: '#FF8700', secondary: '#FF5800' },
  'Ferrari': { primary: '#DC0000', secondary: '#B80000' },
  'Aston Martin': { primary: '#358C75', secondary: '#006F62' },
  'Alpine': { primary: '#0090FF', secondary: '#0051FF' },
  'Stake F1 Team Kick Sauber': { primary: '#52E252', secondary: '#37BEDD' },
  'Haas': { primary: '#FFFFFF', secondary: '#E8E8E8' },
  'Williams': { primary: '#37BEDD', secondary: '#005AFF' },
  'Visa Cash App RB': { primary: '#5E8FAA', secondary: '#1E41C3' }
};

export default function AuctionPilotProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const fetchAuction = async () => {
      setLoading(true);
      try {
        const player_id = localStorage.getItem('player_id');
        let url = '/api/auctions';
        if (player_id && selectedLeague) {
          url = `/api/auctions?player_id=${player_id}&league_id=${selectedLeague.id}`;
        } else if (selectedLeague) {
          url = `/api/auctions?league_id=${selectedLeague.id}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        const found = (data.auctions || []).find(a => String(a.id) === String(id));
        setAuction(found);
        if (found) {
          const t = Math.max(0, Math.floor((new Date(found.fin_subasta).getTime() - Date.now()) / 1000));
          setSeconds(t);
        }
      } catch (err) {
        setError('Error cargando la subasta');
      } finally {
        setLoading(false);
      }
    };
    fetchAuction();
    // Opcional: refrescar cada 10s
    const interval = setInterval(fetchAuction, 10000);
    return () => clearInterval(interval);
  }, [id, selectedLeague]);

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

  const handleClose = () => {
    navigate('/market');
  };

  if (loading) return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000 
    }}>
      <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>🏁 Cargando perfil...</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000 
    }}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  if (!auction) return (
    <Box sx={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      zIndex: 1000 
    }}>
      <Alert severity="warning">🏁 Piloto no encontrado en subasta.</Alert>
    </Box>
  );

  const { driver } = auction;
  const teamColor = teamColors[driver?.team] || { primary: '#666666', secondary: '#444444' };

  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        zIndex: 1000 
      }}
      onClick={handleClose}
    >
      <Box 
        sx={{ 
          maxWidth: 600, 
          width: '90%',
          p: 4, 
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)', 
          borderRadius: 4, 
          color: '#fff', 
          boxShadow: `0 20px 40px rgba(0,0,0,0.8), 0 0 20px rgba(${teamColor.primary}, 0.3)`,
          position: 'relative',
          border: `2px solid ${teamColor.primary}`,
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
          }
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: '#fff',
            background: 'rgba(0,0,0,0.3)',
            '&:hover': {
              background: 'rgba(0,0,0,0.5)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>
        
        {/* Header con foto y nombre */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar 
            src={driver?.image_url ? `/images/${driver.image_url}` : ''} 
            alt={driver?.driver_name} 
            sx={{ 
              width: 100, 
              height: 100, 
              mr: 3, 
              border: `4px solid ${teamColor.primary}`,
              boxShadow: `0 8px 20px rgba(${teamColor.primary}, 0.4)`
            }} 
          />
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                mb: 1
              }}
            >
              {driver?.driver_name}
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: teamColor.primary,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
            >
              {driver?.team}
            </Typography>
          </Box>
        </Box>

        {/* Información de subasta */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 3,
          p: 2,
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 2,
          border: `1px solid ${teamColor.primary}`
        }}>
          <AccessTimeIcon sx={{ fontSize: 24, mr: 1, color: '#fbc02d' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#fbc02d', mr: 4 }}>
            {formatTime(seconds)}
          </Typography>
          <GavelIcon sx={{ fontSize: 24, mr: 1, color: '#90caf9' }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#90caf9' }}>
            {auction.num_bids} pujas
          </Typography>
        </Box>

        {/* Valores */}
        <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: 2,
            border: '1px solid #4CAF50'
          }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
              Valor Base
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#4CAF50' }}>
              {auction.valor_base.toLocaleString()} €
            </Typography>
          </Box>
          <Box sx={{ 
            flex: 1, 
            p: 2, 
            background: 'rgba(0,0,0,0.2)', 
            borderRadius: 2,
            border: '1px solid #f44336'
          }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
              {auction.mi_puja_maxima > 0 ? 'Mi puja máxima' : 'Puja actual'}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#f44336' }}>
              {auction.mi_puja_maxima > 0 ? auction.mi_puja_maxima.toLocaleString() : auction.puja_visible.toLocaleString()} €
            </Typography>
          </Box>
        </Box>

        {/* Botón de puja */}
        <Button
          variant="contained"
          sx={{ 
            fontWeight: 700, 
            fontSize: 20, 
            px: 6, 
            py: 2, 
            mt: 2,
            width: '100%',
            background: `linear-gradient(45deg, ${teamColor.primary}, ${teamColor.secondary})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${teamColor.secondary}, ${teamColor.primary})`,
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 20px rgba(${teamColor.primary}, 0.4)`
            },
            '&:disabled': {
              background: '#666666',
              transform: 'none'
            }
          }}
          disabled={seconds === 0}
          onClick={() => navigate(`/market/auction/${auction.id}/bid`)}
        >
          {seconds === 0 ? '🏁 SUBASTA FINALIZADA' : '🏆 PUJAR AHORA'}
        </Button>

        {/* Línea decorativa inferior */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
            opacity: 0.8
          }}
        />
      </Box>
    </Box>
  );
} 