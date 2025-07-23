import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
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

export default function TeamProfilePage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [auction, setAuction] = useState(null);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [teamPilots, setTeamPilots] = useState([]);

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      setError('');
      try {
        // Obtener equipos de la liga
        let teamRes = await fetch(`/api/teamconstructorsbyleague?league_id=${selectedLeague?.id}`);
        let teamData = await teamRes.json();
        
        if (!teamRes.ok) throw new Error('Equipo no encontrado');
        
        // Buscar el equipo específico por ID
        const foundTeam = teamData.team_constructors.find(team => team.id === parseInt(id));
        
        if (!foundTeam) throw new Error('Equipo no encontrado');
        
        setTeam(foundTeam);
        
        // Intentar obtener subasta existente
        let auctionRes = await fetch(`/api/auctions/by-item?item_type=team_constructor&item_id=${id}&league_id=${selectedLeague?.id}`);
        let auctionData = await auctionRes.json();
        if (auctionRes.ok && auctionData.auction) {
          setAuction(auctionData.auction);
        } else {
          setAuction(null);
        }

        // Obtener pilotos del equipo
        try {
          let pilotsRes = await fetch(`/api/pilotsbyleague?league_id=${selectedLeague?.id}`);
          let pilotsData = await pilotsRes.json();
          if (pilotsRes.ok && pilotsData.pilots) {
            const teamPilots = pilotsData.pilots.filter(pilot => pilot.team === foundTeam.name);
            setTeamPilots(teamPilots);
          }
        } catch (e) {
          console.error('Error cargando pilotos del equipo:', e);
        }
      } catch (err) {
        setError('Error cargando datos del equipo');
      } finally {
        setLoading(false);
      }
    };
    if (id && selectedLeague?.id) fetchTeamData();
  }, [id, selectedLeague]);

  useEffect(() => {
    // Obtener saldo al cargar la página
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

  const handleBid = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setMsg('Por favor ingresa una cantidad válida');
      return;
    }

    setSubmitting(true);
    setMsg('');

    try {
      const player_id = localStorage.getItem('player_id');
      
      const response = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: parseInt(player_id),
          league_id: selectedLeague.id,
          item_type: 'team_constructor',
          item_id: parseInt(id),
          amount: parseFloat(amount)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMsg('Puja realizada con éxito');
        setAmount('');
        // Recargar datos de la subasta
        setAuctionLoading(true);
        try {
          let auctionRes = await fetch(`/api/auctions/by-item?item_type=team_constructor&item_id=${id}&league_id=${selectedLeague?.id}`);
          let auctionData = await auctionRes.json();
          if (auctionRes.ok && auctionData.auction) {
            setAuction(auctionData.auction);
          }
        } catch (e) {
          console.error('Error recargando subasta:', e);
        } finally {
          setAuctionLoading(false);
        }
      } else {
        setMsg(data.error || 'Error al realizar la puja');
      }
    } catch (error) {
      setMsg('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const teamColor = teamColors[team.name] || { primary: '#666666', secondary: '#444444' };

  // Calcular mínimo de puja
  let minBid = team ? team.value : 0;
  if (auction && auction.bids && auction.bids.length > 0) {
    try {
      const maxBid = Math.max(...auction.bids.map(bid => parseFloat(bid.amount)));
      minBid = maxBid + 1;
    } catch (e) {
      minBid = team.value + 1;
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      p: 2
    }}>
      <Paper
        elevation={8}
        sx={{
          maxWidth: 600,
          mx: 'auto',
          background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
          border: `2px solid ${teamColor.primary}`,
          borderRadius: 3,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Header con botón de cerrar */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`
        }}>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700 }}>
            Perfil del Equipo
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Contenido principal */}
        <Box sx={{ p: 3 }}>
          {/* Información del equipo */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar
              src={team.image_url ? `/images/${team.image_url}` : ''}
              alt={team.name}
              sx={{
                width: 80,
                height: 80,
                mr: 3,
                border: `4px solid ${teamColor.primary}`,
                boxShadow: `0 6px 20px rgba(${teamColor.primary}, 0.4)`
              }}
            />
            <Box>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                {team.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ color: '#b0b0b0', mr: 1 }}>
                  Equipo Constructor
                </Typography>
                <Box sx={{ fontSize: '1.2rem' }}>🏎️</Box>
              </Box>
            </Box>
          </Box>

          {/* Estadísticas */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
              Estadísticas
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Paper sx={{ p: 2, background: '#333', border: `1px solid ${teamColor.primary}` }}>
                <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                  Valor
                </Typography>
                <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                  {(team.value || 0).toLocaleString()} €
                </Typography>
              </Paper>
              <Paper sx={{ p: 2, background: '#333', border: `1px solid ${teamColor.primary}` }}>
                <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                  Posición esperada
                </Typography>
                <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 700 }}>
                  {team.exp_pos_mean || 'N/A'}
                </Typography>
              </Paper>
            </Box>
          </Box>

          {/* Pilotos del equipo */}
          {teamPilots.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
                Pilotos del Equipo
              </Typography>
              <Paper sx={{ p: 2, background: '#333', border: `1px solid ${teamColor.primary}` }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {teamPilots.map((pilot, index) => (
                    <Box
                      key={pilot.id}
                      sx={{
                        background: '#444',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        border: `1px solid ${teamColor.secondary}`
                      }}
                    >
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        {pilot.driver_name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          )}

          {/* Estado de la subasta */}
          {auction && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
                Estado de la Subasta
              </Typography>
              <Paper sx={{ p: 2, background: '#333', border: `1px solid ${teamColor.primary}` }}>
                <Typography variant="body2" sx={{ color: '#b0b0b0', mb: 1 }}>
                  Pujas actuales: {auction.bids?.length || 0}
                </Typography>
                {auction.bids && auction.bids.length > 0 && (
                  <Typography variant="body2" sx={{ color: '#FFD600', fontWeight: 600 }}>
                    Puja más alta: {Math.max(...auction.bids.map(bid => parseFloat(bid.amount))).toLocaleString()} €
                  </Typography>
                )}
              </Paper>
            </Box>
          )}

          {/* Formulario de puja */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 600 }}>
              Realizar Puja
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <TextField
                label="Cantidad (€)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': {
                      borderColor: teamColor.primary,
                    },
                    '&:hover fieldset': {
                      borderColor: teamColor.secondary,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#b0b0b0',
                  },
                }}
                inputProps={{
                  min: minBid,
                  step: 1
                }}
              />
              <Button
                variant="contained"
                onClick={handleBid}
                disabled={submitting || !amount || parseFloat(amount) < minBid}
                sx={{
                  background: '#DC0000',
                  '&:hover': {
                    background: '#B80000',
                  },
                  '&:disabled': {
                    background: '#666',
                  }
                }}
              >
                {submitting ? <CircularProgress size={20} /> : 'Pujar'}
              </Button>
            </Box>
            {minBid > team.value && (
              <Typography variant="body2" sx={{ color: '#FF9800', mt: 1 }}>
                Puja mínima: {minBid.toLocaleString()} €
              </Typography>
            )}
          </Box>

          {/* Mensajes */}
          {msg && (
            <Alert 
              severity={msg.includes('éxito') ? 'success' : 'error'} 
              sx={{ mb: 2 }}
            >
              {msg}
            </Alert>
          )}

          {/* Saldo del jugador */}
          {!saldoLoading && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#b0b0b0' }}>
                Tu saldo actual:
              </Typography>
              <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                {saldo?.toLocaleString()} €
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
} 