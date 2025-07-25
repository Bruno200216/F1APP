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

export default function AuctionTeamBidPage() {
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
  const [team, setTeam] = useState(null);

  useEffect(() => {
    const fetchTeamAndAuction = async () => {
      setLoading(true);
      setError('');
      try {
        // Obtener equipo específico por ID
        let teamRes = await fetch(`/api/teamconstructorsbyleague?id=${id}&league_id=${selectedLeague?.id}`);
        let teamData = await teamRes.json();
        
        if (!teamRes.ok) throw new Error('Equipo no encontrado');
        
        // Los datos vienen según la estructura del backend
        const teamMainData = teamData.team_constructor;
        setTeam({
          ...teamMainData,
          // Agregar datos de la relación por liga para cláusulas, etc.
          team_by_league: teamData.team
        });
        
        // Intentar obtener subasta existente
        let auctionRes = await fetch(`/api/auctions/by-item?item_type=team_constructor&item_id=${id}&league_id=${selectedLeague?.id}`);
        let auctionData = await auctionRes.json();
        if (auctionRes.ok && auctionData.auction) {
          setAuction(auctionData.auction);
        } else {
          setAuction(null);
        }
      } catch (err) {
        setError('Error cargando datos del equipo');
      } finally {
        setLoading(false);
      }
    };
    if (id && selectedLeague?.id) fetchTeamAndAuction();
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
      let minBid = team ? team.Value : 0;
  if (auction && auction.bids && auction.bids.length > 0) {
    try {
      const bidsArr = JSON.parse(auction.bids);
      minBid = Math.max(...bidsArr.map(b => b.valor)) + 1;
    } catch {
      minBid = team.Value;
    }
  }

  // Inicializar el input de puja solo la primera vez que hay datos
  useEffect(() => {
    if (amount === '' && team) {
      setAmount(minBid);
    }
    // eslint-disable-next-line
  }, [team, auction]);

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
      let res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'team_constructor',
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

  if (!team) return (
    <Box sx={{ minHeight: '100vh', background: '#18192a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>Equipo no encontrado</Typography>
    </Box>
  );

  // Obtener colores del equipo
  const teamColor = teamColors[team.Name] || { primary: '#666666', secondary: '#444444' };

  return (
    <Box sx={{ minHeight: '100vh', background: '#18192a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 20, right: 20, color: '#fff' }}>
        <CloseIcon />
      </IconButton>
      
      <Avatar
        src={`/images/equipos/${team.LogoURL}`}
        alt={team.Name}
        sx={{ 
          width: 120, 
          height: 120, 
          mb: 3,
          border: `3px solid ${teamColor.primary}`,
          boxShadow: `0 0 20px ${teamColor.primary}40`
        }}
      />
      
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 24, mb: 1, textAlign: 'center' }}>
        {team.Name}
      </Typography>
      
      <Typography sx={{ color: teamColor.primary, fontWeight: 700, fontSize: 18, mb: 1, textAlign: 'center' }}>
        EQUIPO CONSTRUCTOR
      </Typography>

      {team.Pilots && team.Pilots.length > 0 && (
        <Typography sx={{ color: '#b0b0b0', fontWeight: 700, fontSize: 14, mb: 3, textAlign: 'center' }}>
          Pilotos: {team.Pilots.join(', ')}
        </Typography>
      )}

      <Box sx={{ width: '100%', maxWidth: 320, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>VALOR DE MERCADO</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{Number(team.Value).toLocaleString('es-ES')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography sx={{ color: '#4CAF50', fontWeight: 700, fontSize: 15 }}>PRECIO SOLICITADO</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{Number(team.Value).toLocaleString('es-ES')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', background: '#23243a', borderRadius: 2, px: 2, py: 1, mb: 2 }}>
          <Typography sx={{ color: '#b0b0b0', fontWeight: 700, mr: 1 }}>€</Typography>
          <TextField
            variant="standard"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            InputProps={{ disableUnderline: true, style: { color: '#fff', fontWeight: 700, fontSize: 18, background: 'transparent' } }}
            sx={{ flex: 1, input: { textAlign: 'right' } }}
            placeholder={Number(team.Value).toLocaleString('es-ES')}
            type="number"
            inputProps={{ min: minBid }}
          />
        </Box>
      </Box>
      <Button
        variant="contained"
        fullWidth
        sx={{
          background: '#1ed760',
          color: '#fff',
          fontWeight: 700,
          fontSize: 20,
          borderRadius: 2,
          mt: 2,
          mb: 2,
          maxWidth: 320,
          boxShadow: '0 2px 8px rgba(30,215,96,0.15)',
          '&:hover': { background: '#17b34a' }
        }}
        onClick={handleBid}
        disabled={submitting || !amount || Number(amount) < minBid}
      >
        HACER PUJA
      </Button>
      {Number(amount) < minBid && (
        <Typography sx={{ color: '#f44336', fontWeight: 700, fontSize: 15, mt: 1 }}>
          El importe es inferior al mínimo permitido
        </Typography>
      )}
      <Typography sx={{ color: '#1ed760', fontWeight: 700, fontSize: 16, mt: 2, mb: 1 }}>
        Tu saldo: {saldoLoading ? <CircularProgress size={18} /> : saldo?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
      </Typography>
      {msg && <Alert severity="success" sx={{ mt: 2 }}>{msg}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
} 