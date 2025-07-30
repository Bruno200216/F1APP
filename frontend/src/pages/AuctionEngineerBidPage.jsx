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

export default function AuctionEngineerBidPage() {
  const { type, id } = useParams(); // type: 'track' o 'chief'
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
  const [engineer, setEngineer] = useState(null);

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
    const fetchEngineerAndAuction = async () => {
      setLoading(true);
      setError('');
      try {
        // Determinar el endpoint basándose en el tipo
        const endpoint = type === 'track' ? 
          `/api/trackengineersbyleague?id=${id}&league_id=${selectedLeague?.id}` :
          `/api/chiefengineersbyleague?id=${id}&league_id=${selectedLeague?.id}`;
        
        let engineerRes = await fetch(endpoint);
        let engineerData = await engineerRes.json();
        
        if (!engineerRes.ok) throw new Error('Ingeniero no encontrado');
        
        // Los datos vienen en la nueva estructura según el tipo de ingeniero
        const engineerMainData = type === 'track' ? engineerData.track_engineer : engineerData.chief_engineer;
        if (!engineerMainData) {
          throw new Error('Datos del ingeniero no encontrados');
        }
        
        // Combinar los datos del ingeniero principal con los datos de la liga
        setEngineer({
          ...engineerMainData,
          // Asegurar que los campos principales estén disponibles
          Name: engineerMainData.name,
          Value: engineerMainData.value,
          ImageURL: engineerMainData.image_url,
          Team: engineerMainData.team || ''
        });
        
        // Intentar obtener subasta existente
        const itemType = type === 'track' ? 'track_engineer' : 'chief_engineer';
        let auctionRes = await fetch(`/api/auctions/by-item?item_type=${itemType}&item_id=${id}&league_id=${selectedLeague?.id}`);
        let auctionData = await auctionRes.json();
        if (auctionRes.ok && auctionData.auction) {
          setAuction(auctionData.auction);
        } else {
          setAuction(null);
        }
      } catch (err) {
        setError('Error cargando datos del ingeniero');
      } finally {
        setLoading(false);
      }
    };
    if (id && selectedLeague?.id && type) fetchEngineerAndAuction();
  }, [id, selectedLeague, type]);

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
      let minBid = engineer ? engineer.Value : 0;
  if (auction && auction.bids && auction.bids.length > 0) {
    try {
      const bidsArr = JSON.parse(auction.bids);
      minBid = Math.max(...bidsArr.map(b => b.valor)) + 1;
    } catch {
      minBid = engineer.Value;
    }
  }

  // Inicializar el input de puja solo la primera vez que hay datos
  useEffect(() => {
    if (amount === '' && engineer) {
      setAmount(minBid);
    }
    // eslint-disable-next-line
  }, [engineer, auction]);

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
      const itemType = type === 'track' ? 'track_engineer' : 'chief_engineer';
      let res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: itemType,
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
    navigate('/market');
  };

  // Render condicional después de los hooks
  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#18192a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>🏁 Cargando puja...</Typography>
    </Box>
  );

  if (error) return (
    <Box sx={{ minHeight: '100vh', background: '#18192a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#f44336', fontSize: '1.2rem' }}>{error}</Typography>
    </Box>
  );

  if (!engineer) return (
    <Box sx={{ minHeight: '100vh', background: '#18192a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>Ingeniero no encontrado</Typography>
    </Box>
  );

  // Obtener colores del equipo
  const teamColor = teamColors[engineer.Team] || { primary: '#666666', secondary: '#444444' };

  return (
    <Box sx={{ minHeight: '100vh', background: '#080705', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 20, right: 20, color: '#fff' }}>
        <CloseIcon />
      </IconButton>
      
      <Avatar
        src={`/images/ingenierosdepista/${engineer.ImageURL}`}
        alt={engineer.Name}
        sx={{ 
          width: 120, 
          height: 120, 
          mb: 3,
          border: `3px solid #9D4EDD`,
          boxShadow: `0 0 20px #9D4EDD40`
        }}
      />
      
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 24, mb: 1, textAlign: 'center' }}>
        {engineer.Name}
      </Typography>
      
      <Typography sx={{ color: '#9D4EDD', fontWeight: 700, fontSize: 18, mb: 3, textAlign: 'center' }}>
        {type === 'track' ? 'INGENIERO DE PISTA' : 'INGENIERO JEFE'}
      </Typography>

      <Box sx={{ width: '100%', maxWidth: 320, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ color: '#E0AAFF', fontWeight: 700, fontSize: 15 }}>VALOR DE MERCADO</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{formatNumberWithDots(engineer.Value)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ color: '#28C76F', fontWeight: 700, fontSize: 15 }}>PRECIO SOLICITADO</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{formatNumberWithDots(engineer.Value)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', background: '#1E1A1E', borderRadius: 2, px: 2, py: 1, mb: 2, border: '1px solid #9D4EDD' }}>
          <Typography sx={{ color: '#C9A9DD', fontWeight: 700, mr: 1 }}>€</Typography>
          <TextField
            variant="standard"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            InputProps={{ disableUnderline: true, style: { color: '#fff', fontWeight: 700, fontSize: 18, background: 'transparent' } }}
            sx={{ flex: 1, input: { textAlign: 'right' } }}
            placeholder={formatNumberWithDots(engineer.Value)}
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
          color: '#fff',
          fontWeight: 700,
          fontSize: 20,
          borderRadius: 2,
          mt: 2,
          mb: 2,
          maxWidth: 320,
          boxShadow: '0 2px 8px #9D4EDD40',
          '&:hover': { background: '#E0AAFF' }
        }}
        onClick={handleBid}
        disabled={submitting || !amount || Number(amount) < minBid}
      >
        HACER PUJA
      </Button>
      {Number(amount) < minBid && (
        <Typography sx={{ color: '#EA5455', fontWeight: 700, fontSize: 15, mt: 1 }}>
          El importe es inferior al mínimo permitido
        </Typography>
      )}
      <Typography sx={{ color: '#9D4EDD', fontWeight: 700, fontSize: 16, mt: 2, mb: 1 }}>
        Tu saldo: {saldoLoading ? <CircularProgress size={18} /> : `€${formatNumberWithDots(saldo)}`}
      </Typography>
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
} 