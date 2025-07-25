import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
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

export default function AuctionPilotBidPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [auction, setAuction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [pilot, setPilot] = useState(null);

  useEffect(() => {
    const fetchPilotAndAuction = async () => {
      setLoading(true);
      setError('');
      try {
        // Obtener datos del piloto en la liga
        let pilotRes = await fetch(`/api/pilot-by-league/${id}`);
        let pilotData = await pilotRes.json();
        if (!pilotRes.ok || !pilotData.pilot) throw new Error('Piloto no encontrado');
        setPilot({ ...pilotData.pilot, ...pilotData.pilot_by_league });
        // Intentar obtener subasta existente
        let auctionRes = await fetch(`/api/auctions/by-item?item_type=pilot&item_id=${id}&league_id=${selectedLeague?.id}`);
        let auctionData = await auctionRes.json();
        if (auctionRes.ok && auctionData.auction) {
          setAuction(auctionData.auction);
        } else {
          setAuction(null);
        }
      } catch (err) {
        setError('Error cargando datos del piloto');
      } finally {
        setLoading(false);
      }
    };
    if (id && selectedLeague?.id) fetchPilotAndAuction();
  }, [id, selectedLeague]);

  useEffect(() => {
    // Obtener saldo al abrir el modal
    const fetchSaldo = async () => {
      setSaldoLoading(true);
      try {
        const player_id = localStorage.getItem('player_id');
        if (player_id && selectedLeague) {
          const res = await fetch(`/api/playerbyleague?player_id=${player_id}&league_id=${selectedLeague.id}`);
          const data = await res.json();
          setSaldo(data.player_by_league?.money ?? 0);
        }
      } catch (e) {
        setSaldo(0);
      } finally {
        setSaldoLoading(false);
      }
    };
    fetchSaldo();
  }, [selectedLeague]);

  // Calcular mínimo de puja
  let minBid = pilot ? pilot.value : 0;
  if (auction && auction.bids && auction.bids.length > 0) {
    try {
      const bidsArr = JSON.parse(auction.bids);
      minBid = Math.max(...bidsArr.map(b => b.valor)) + 1;
    } catch {
      minBid = pilot.value;
    }
  }

  // Inicializar el input de puja solo la primera vez que hay datos
  useEffect(() => {
    if (amount === '' && pilot) {
      setAmount(minBid);
    }
    // eslint-disable-next-line
  }, [pilot, auction]);

  const handleBid = async () => {
    setMsg('');
    setError('');
    const player_id = localStorage.getItem('player_id');
    // Validar datos antes de enviar
    if (!id || !selectedLeague?.id || !player_id || !amount) {
      setError('Faltan datos para pujar');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Introduce una cantidad válida');
      return;
    }
    setSubmitting(true);
    try {
      // Si no existe subasta, crearla y añadir la puja
      let res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'pilot',
          item_id: Number(id),
          league_id: Number(selectedLeague.id),
          player_id: Number(player_id),
          valor: Number(amount)
        })
      });
      let data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al pujar');
      setMsg('¡Puja realizada!');
      setTimeout(() => navigate('/market'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate(`/market/auction/${id}`);
  };

  // Render condicional después de los hooks
  if (loading) return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#080705', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <Typography sx={{ 
        color: '#FFFFFF', 
        fontSize: 20, 
        fontWeight: 600,
        fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}>
        🏁 Cargando puja...
      </Typography>
    </Box>
  );

  if (error || !pilot) return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#080705', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <Alert severity="error" sx={{ 
        background: '#1E1A1E',
        color: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 2,
        fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}>
        {error || 'Piloto no encontrado'}
      </Alert>
    </Box>
  );

  const teamColor = teamColors[pilot?.team] || { primary: '#666666', secondary: '#444444' };

  // Colores para el modo
  const modeColors = {
    R: '#EA5455', // Rojo (error state)
    Q: '#9D4EDD', // Morado (accent main)
    P: '#28C76F', // Verde (success state)
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: '#080705', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'flex-start', 
      pt: 4,
      fontFamily: "'Inter', 'Segoe UI', sans-serif"
    }}>
      <IconButton 
        onClick={() => navigate(-1)} 
        sx={{ 
          position: 'absolute', 
          top: 24, 
          left: 24, 
          color: '#FFFFFF', 
          background: '#1E1A1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 2,
          '&:hover': {
            background: '#121012'
          }
        }}
      >
        <CloseIcon />
      </IconButton>
      
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#FFFFFF', 
          fontWeight: 700, 
          mb: 3, 
          mt: 2,
          fontSize: 24,
          fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}
      >
        Puja por {pilot?.driver_name}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        mb: 4, 
        position: 'relative' 
      }}>
        <img
          src={pilot?.image_url ? `/images/${pilot.image_url}` : ''}
          alt={pilot?.driver_name}
          style={{ 
            width: 100, 
            height: 100, 
            borderRadius: '50%', 
            objectFit: 'cover', 
            border: '4px solid #FFFFFF', 
            marginBottom: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
          }}
        />
        {/* Badge de modo */}
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 'calc(50% - 60px)',
          background: modeColors[pilot?.mode?.toUpperCase()] || '#bbb',
          color: '#FFFFFF',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 18,
          border: '2px solid #FFFFFF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
        }}>
          {pilot?.mode?.toUpperCase()}
        </Box>
      </Box>
      
      <Box sx={{ 
        width: '100%', 
        maxWidth: 320, 
        mb: 3,
        background: '#1E1A1E',
        borderRadius: 3,
        padding: 3,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2 
        }}>
          <Typography sx={{ 
            color: '#C9A9DD', 
            fontWeight: 600, 
            fontSize: 14,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}>
            VALOR DE MERCADO
          </Typography>
          <Typography sx={{ 
            color: '#FFFFFF', 
            fontWeight: 700, 
            fontSize: 16,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}>
            {Number(pilot.value).toLocaleString('es-ES')}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3 
        }}>
          <Typography sx={{ 
            color: '#C9A9DD', 
            fontWeight: 600, 
            fontSize: 14,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}>
            PRECIO SOLICITADO
          </Typography>
          <Typography sx={{ 
            color: '#FFFFFF', 
            fontWeight: 700, 
            fontSize: 16,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}>
            {Number(pilot.value).toLocaleString('es-ES')}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: '#121012', 
          borderRadius: 2, 
          px: 2, 
          py: 1.5, 
          mb: 2,
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Typography sx={{ 
            color: '#C9A9DD', 
            fontWeight: 600, 
            mr: 1,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}>
            €
          </Typography>
          <TextField
            variant="standard"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            InputProps={{ 
              disableUnderline: true, 
              style: { 
                color: '#FFFFFF', 
                fontWeight: 700, 
                fontSize: 18, 
                background: 'transparent',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
              } 
            }}
            sx={{ 
              flex: 1, 
              input: { 
                textAlign: 'right',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
              } 
            }}
            placeholder={Number(pilot.value).toLocaleString('es-ES')}
            type="number"
            inputProps={{ min: minBid }}
          />
        </Box>
      </Box>
      
      <Button
        variant="contained"
        fullWidth
        sx={{
          background: '#9D4EDD',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: 16,
          borderRadius: 3,
          mt: 2,
          mb: 3,
          maxWidth: 320,
          padding: '12px 20px',
          boxShadow: '0 0 8px #640160, 0 0 16px #640160',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          '&:hover': { 
            background: '#E0AAFF',
            boxShadow: '0 0 12px #640160, 0 0 20px #640160'
          },
          '&:disabled': {
            background: '#1E1A1E',
            color: '#C9A9DD',
            boxShadow: 'none'
          }
        }}
        onClick={handleBid}
        disabled={submitting || !amount || Number(amount) < minBid}
      >
        {submitting ? 'Realizando puja...' : 'Hacer puja'}
      </Button>
      
      {Number(amount) < minBid && (
        <Typography sx={{ 
          color: '#EA5455', 
          fontWeight: 600, 
          fontSize: 14, 
          mt: 1,
          fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}>
          El importe es inferior al mínimo permitido
        </Typography>
      )}
      
      <Typography sx={{ 
        color: '#28C76F', 
        fontWeight: 600, 
        fontSize: 16, 
        mt: 2, 
        mb: 1,
        fontFamily: "'Inter', 'Segoe UI', sans-serif"
      }}>
        Tu saldo: {saldoLoading ? <CircularProgress size={18} sx={{ color: '#28C76F' }} /> : saldo?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
      </Typography>
      
      {msg && (
        <Alert 
          severity="success" 
          sx={{ 
            mt: 2,
            background: '#1E1A1E',
            color: '#28C76F',
            border: '1px solid rgba(40, 199, 111, 0.3)',
            borderRadius: 2,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}
        >
          {msg}
        </Alert>
      )}
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            background: '#1E1A1E',
            color: '#EA5455',
            border: '1px solid rgba(234, 84, 85, 0.3)',
            borderRadius: 2,
            fontFamily: "'Inter', 'Segoe UI', sans-serif"
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
} 