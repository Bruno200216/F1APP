import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import { useLeague } from '../context/LeagueContext';
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerRaceCard from '../components/EngineerRaceCard';
import TeamRaceCard from '../components/TeamRaceCard';
import EngineerActionsMenu from '../components/EngineerActionsMenu';
import TeamConstructorActionsMenu from '../components/TeamConstructorActionsMenu';
import { useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';

export default function TeamPilotsPage() {
  const { selectedLeague } = useLeague();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0); // 0: Alineación, 1: Plantilla, 2: Puntos
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [openSellModal, setOpenSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loadingSell, setLoadingSell] = useState(false);

  const [teamData, setTeamData] = useState({
    pilots: [],
    track_engineers: [],
    chief_engineers: [],
    team_constructors: []
  });

  useEffect(() => {
    const fetchTeamData = async () => {
      setLoading(true);
      try {
        const player_id = localStorage.getItem('player_id');
        
        if (!player_id) {
          setError('Debes iniciar sesión');
          setLoading(false);
          return;
        }

        if (!selectedLeague) {
          setError('Debes seleccionar una liga');
          setLoading(false);
          return;
        }

        // Usar el nuevo endpoint que devuelve toda la plantilla
        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const teamData = await teamRes.json();
        
        if (teamData.team) {
          setTeamData({
            pilots: teamData.team.pilots || [],
            track_engineers: teamData.team.track_engineers || [],
            chief_engineers: teamData.team.chief_engineers || [],
            team_constructors: teamData.team.team_constructors || []
          });
          // Para compatibilidad con el código existente, mantener drivers como pilotos
          setDrivers(teamData.team.pilots || []);
        } else {
          setTeamData({
            pilots: [],
            track_engineers: [],
            chief_engineers: [],
            team_constructors: []
          });
          setDrivers([]);
        }
      } catch (err) {
        setError('Error cargando equipo: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [selectedLeague]);

  const handleActionsClick = (event, driver) => {
    setAnchorEl(event.currentTarget);
    setSelectedDriver(driver);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAddToMarket = () => {
    setOpenSellModal(true);
    setSellPrice(selectedDriver?.value || '');
    handleCloseMenu();
  };

  const handleCloseSellModal = () => {
    setOpenSellModal(false);
    setSellPrice('');
    setSelectedDriver(null);
  };

  const handleConfirmSell = async () => {
    if (!selectedDriver || !sellPrice || isNaN(Number(sellPrice)) || Number(sellPrice) <= 0) {
      setSnackbar({ open: true, message: 'Introduce un precio válido', severity: 'error' });
      return;
    }
    setLoadingSell(true);
    const token = localStorage.getItem('token');
    console.log("TOKEN EN LOCALSTORAGE:", localStorage.getItem('token'));
    console.log("Enviando token:", token);
    console.log("Driver seleccionado:", selectedDriver);
    // Cuando se selecciona un piloto para acciones, el objeto driver ya tiene el id correcto (pilot_by_leagues)
    // En el payload de venta y logs, usa driver.id
    console.log("Payload:", {
      pilot_by_league_id: selectedDriver.id, // <-- este es el id correcto de pilot_by_leagues
      venta: Number(sellPrice)
    });
    try {
      // Asegurarse de que el token está en una sola línea y sin espacios extra
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      console.log("[FRONTEND] Token en localStorage:", token);
      console.log("[FRONTEND] Authorization header que se envía:", authHeader);
      const res = await fetch('/api/pilotbyleague/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          pilot_by_league_id: selectedDriver.id, // <-- usar el id correcto
          venta: Number(sellPrice)
        })
      });
      const text = await res.clone().text();
      console.log("Respuesta del backend:", res.status, text);
      const data = JSON.parse(text);
      if (res.ok) {
        setSnackbar({ open: true, message: 'Piloto puesto a la venta', severity: 'success' });
        handleCloseSellModal();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al poner a la venta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    } finally {
      setLoadingSell(false);
    }
  };

  // Estilos para tabs superiores
  const tabStyles = {
    minWidth: 0,
    flex: 1,
    color: '#b0b0b0',
    fontWeight: 700,
    fontSize: 16,
    '&.Mui-selected': {
      color: '#FFD600',
      borderBottom: '3px solid #FFD600',
      background: 'rgba(255,214,0,0.07)'
    },
    background: 'transparent',
    borderRadius: 0,
    px: 0
  };

  // Parrilla F1 para alineación
  const renderF1Grid = () => (
    <Box sx={{ mt: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ width: 320, height: 420, background: 'linear-gradient(180deg, #18192a 60%, #23243a 100%)', borderRadius: 4, boxShadow: 3, p: 2, position: 'relative' }}>
        {/* Parrilla de F1: 2 filas de 5, 1 fila de 2 (ajustable según número de pilotos) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(0, 2).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 2 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 64, height: 64, border: '3px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{driver.driver_name}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(2, 6).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 1 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 56, height: 56, border: '2px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{driver.driver_name}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(6, 10).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 1 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 48, height: 48, border: '2px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>{driver.driver_name}</Typography>
            </Box>
          ))}
        </Box>
        {/* Puedes ajustar el número de filas/columnas según el máximo de pilotos */}
      </Box>
    </Box>
  );

  // Plantilla: lista completa del equipo
  const renderPlantilla = () => (
    <Box sx={{ mt: 2 }}>
      {/* Pilotos */}
      <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18, mb: 2, textAlign: 'center' }}>
        🏎️ PILOTOS ({teamData.pilots.length})
      </Typography>
      {teamData.pilots.length === 0 ? (
        <Typography sx={{ color: '#b0b0b0', textAlign: 'center', mb: 3 }}>No tienes pilotos en tu equipo</Typography>
      ) : (
        teamData.pilots.map(driver => (
          <Box key={driver.id} sx={{ display: 'flex', alignItems: 'center', background: '#23243a', borderRadius: 3, p: 2, mb: 2, boxShadow: 2 }}>
            <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 56, height: 56, mr: 2, border: '2px solid #FFD600' }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ color: '#fff', fontWeight: 700 }}>{driver.driver_name}</Typography>
              <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>{driver.team}</Typography>
              <Typography sx={{ color: '#4caf50', fontSize: 12 }}>Piloto</Typography>
            </Box>
            <Typography sx={{ color: '#FFD600', fontWeight: 700, mr: 2 }}>
              €{Number(driver.value).toLocaleString('es-ES')}
            </Typography>
            <Button variant="contained" color="warning" sx={{ fontWeight: 700, borderRadius: 2 }} onClick={e => handleActionsClick(e, driver)}>Acciones</Button>
          </Box>
        ))
      )}

      {/* Track Engineers */}
      <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18, mb: 2, textAlign: 'center', mt: 3 }}>
        🔧 INGENIEROS DE PISTA ({teamData.track_engineers.length})
      </Typography>
      {teamData.track_engineers.length === 0 ? (
        <Typography sx={{ color: '#b0b0b0', textAlign: 'center', mb: 3 }}>No tienes ingenieros de pista</Typography>
      ) : (
        <Grid container spacing={2}>
          {teamData.track_engineers.map(engineer => (
            <Grid item xs={12} sm={6} md={4} key={engineer.id}>
              <EngineerRaceCard
                engineer={engineer}
                type="track_engineer"
                showStats={true}
                isOwned={true}
                leagueId={selectedLeague?.id}
                onClick={() => navigate(`/engineer/track/${engineer.id}?league_id=${selectedLeague?.id}`)}
                bidActionsButton={
                  <EngineerActionsMenu 
                    engineer={{ ...engineer, type: 'track_engineer' }}
                    onSell={() => {
                      // Recargar datos del equipo
                      const fetchTeamData = async () => {
                        const player_id = localStorage.getItem('player_id');
                        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
                        const teamData = await teamRes.json();
                        if (teamData.team) {
                          setTeamData({
                            pilots: teamData.team.pilots || [],
                            track_engineers: teamData.team.track_engineers || [],
                            chief_engineers: teamData.team.chief_engineers || [],
                            team_constructors: teamData.team.team_constructors || []
                          });
                        }
                      };
                      fetchTeamData();
                    }}
                  />
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Chief Engineers */}
      <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18, mb: 2, textAlign: 'center', mt: 3 }}>
        👨‍💼 INGENIEROS JEFE ({teamData.chief_engineers.length})
      </Typography>
      {teamData.chief_engineers.length === 0 ? (
        <Typography sx={{ color: '#b0b0b0', textAlign: 'center', mb: 3 }}>No tienes ingenieros jefe</Typography>
      ) : (
        <Grid container spacing={2}>
          {teamData.chief_engineers.map(engineer => (
            <Grid item xs={12} sm={6} md={4} key={engineer.id}>
              <EngineerRaceCard
                engineer={engineer}
                type="chief_engineer"
                showStats={true}
                isOwned={true}
                leagueId={selectedLeague?.id}
                onClick={() => navigate(`/engineer/chief/${engineer.id}?league_id=${selectedLeague?.id}`)}
                bidActionsButton={
                  <EngineerActionsMenu 
                    engineer={{ ...engineer, type: 'chief_engineer' }}
                    onSell={() => {
                      // Recargar datos del equipo
                      const fetchTeamData = async () => {
                        const player_id = localStorage.getItem('player_id');
                        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
                        const teamData = await teamRes.json();
                        if (teamData.team) {
                          setTeamData({
                            pilots: teamData.team.pilots || [],
                            track_engineers: teamData.team.track_engineers || [],
                            chief_engineers: teamData.team.chief_engineers || [],
                            team_constructors: teamData.team.team_constructors || []
                          });
                        }
                      };
                      fetchTeamData();
                    }}
                  />
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Team Constructors */}
      <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18, mb: 2, textAlign: 'center', mt: 3 }}>
        🏁 EQUIPOS ({teamData.team_constructors.length})
      </Typography>
      {teamData.team_constructors.length === 0 ? (
        <Typography sx={{ color: '#b0b0b0', textAlign: 'center', mb: 3 }}>No tienes equipos</Typography>
      ) : (
        <Grid container spacing={2}>
          {teamData.team_constructors.map(team => (
            <Grid item xs={12} sm={6} md={4} key={team.id}>
              <TeamRaceCard
                team={team}
                showStats={true}
                isOwned={true}
                leagueId={selectedLeague?.id}
                onClick={() => navigate(`/team/${team.id}?league_id=${selectedLeague?.id}`)}
                bidActionsButton={
                  <TeamConstructorActionsMenu 
                    team={team}
                    onSell={() => {
                      // Recargar datos del equipo
                      const fetchTeamData = async () => {
                        const player_id = localStorage.getItem('player_id');
                        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
                        const teamData = await teamRes.json();
                        if (teamData.team) {
                          setTeamData({
                            pilots: teamData.team.pilots || [],
                            track_engineers: teamData.team.track_engineers || [],
                            chief_engineers: teamData.team.chief_engineers || [],
                            team_constructors: teamData.team.team_constructors || []
                          });
                        }
                      };
                      fetchTeamData();
                    }}
                  />
                }
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Menú contextual de acciones */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleAddToMarket}>Añadir al mercado</MenuItem>
      </Menu>
      {/* Modal de fijar precio de venta */}
      <Dialog open={openSellModal} onClose={handleCloseSellModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
          Fijar el precio de venta
        </DialogTitle>
        <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
          {selectedDriver && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <img
                src={selectedDriver.image_url ? `/images/${selectedDriver.image_url}` : ''}
                alt={selectedDriver.driver_name}
                style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16 }}
              />
              <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>VALOR DE MERCADO</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1 }}>{Number(selectedDriver.value).toLocaleString('es-ES')}</Typography>
              <Typography sx={{ color: '#f44336', fontWeight: 700, fontSize: 15 }}>VALOR DE CLÁUSULA</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 2 }}>{selectedDriver.clausula}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', background: '#23243a', borderRadius: 2, px: 2, py: 1, mb: 2, width: '100%' }}>
                <Typography sx={{ color: '#b0b0b0', fontWeight: 700, mr: 1 }}>€</Typography>
                <TextField
                  variant="standard"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  InputProps={{ disableUnderline: true, style: { color: '#fff', fontWeight: 700, fontSize: 18, background: 'transparent' } }}
                  sx={{ flex: 1, input: { textAlign: 'right' } }}
                  placeholder={Number(selectedDriver.value).toLocaleString('es-ES')}
                  type="number"
                  inputProps={{ min: 1 }}
                  disabled={loadingSell}
                />
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
                onClick={handleConfirmSell}
                disabled={loadingSell}
              >
                Añadir al mercado
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );

  // Puntos: alineación con puntos (por ahora solo muestra la parrilla y puntos en 0)
  const renderPuntos = () => (
    <Box sx={{ mt: 4, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ width: 320, height: 420, background: 'linear-gradient(180deg, #18192a 60%, #23243a 100%)', borderRadius: 4, boxShadow: 3, p: 2, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(0, 2).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 2 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 64, height: 64, border: '3px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{driver.driver_name}</Typography>
              <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>0 pts</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(2, 6).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 1 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 56, height: 56, border: '2px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{driver.driver_name}</Typography>
              <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>0 pts</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          {teamData.pilots.slice(6, 10).map((driver, i) => (
            <Box key={driver.id} sx={{ mx: 1 }}>
              <Avatar src={driver.image_url ? `/images/${driver.image_url}` : ''} sx={{ width: 48, height: 48, border: '2px solid #FFD600', mb: 1 }} />
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>{driver.driver_name}</Typography>
              <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 14, textAlign: 'center' }}>0 pts</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Typography sx={{ color: '#b0b0b0', mt: 4 }}>No hay jornadas jugadas.</Typography>
      </Box>
    );

  return (
    <Box sx={{ background: '#18192a', minHeight: '100vh', pb: 8 }}>
      {/* Tabs superiores */}
      <Box sx={{ background: '#18192a', px: 0, pt: 2, borderBottom: '1px solid #23243a' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: 48 }}
        >
          <Tab label="Alineación" sx={tabStyles} />
          <Tab label="Plantilla" sx={tabStyles} />
          <Tab label="Puntos" sx={tabStyles} />
        </Tabs>
      </Box>
      <Divider sx={{ background: '#23243a', height: 2 }} />
      {/* Contenido según tab */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ color: '#fff' }}>🏁 Cargando tu equipo...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>
      ) : !selectedLeague ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: '#fff' }}>Por favor selecciona una liga para ver tus pilotos</Typography>
        </Box>
      ) : (
        <>
          {tab === 0 && renderF1Grid()}
          {tab === 1 && renderPlantilla()}
          {tab === 2 && renderPuntos()}
        </>
      )}
    </Box>
  );
} 