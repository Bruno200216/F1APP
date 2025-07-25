import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { cn, formatCurrency, formatTime, getTeamColor } from '../lib/utils';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// Icons
import { Clock, Users, Settings, TrendingUp, Search, Filter, Plus, Trash2, X } from 'lucide-react';

// Components
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerCard from '../components/EngineerCard';
import TeamCard from '../components/TeamCard';
import TextField from '@mui/material/TextField';
import MuiTabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DialogActions from '@mui/material/DialogActions';
import BidActionsMenu from '../components/BidActionsMenu';
import EditBidDialog from '../components/EditBidDialog';
import DeleteBidDialog from '../components/DeleteBidDialog';

// Material-UI Components (legacy - some still in use)
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Helper function
const getItemType = (item) => {
  if (item.type) return item.type;
  if (item.driver_name) return 'pilot';
  if (item.track_engineer_id) return 'track_engineer';
  if (item.chief_engineer_id) return 'chief_engineer';
  if (item.team_constructor_id) return 'team_constructor';
  return 'pilot';
};

// Función para limpiar la ruta de imagen
const cleanImageUrl = (url) => {
  if (!url) return '';
  
  // Convertir a string y normalizar separadores
  let cleanUrl = String(url).replace(/\\/g, '/');
  
  // Eliminar todos los prefijos posibles de forma más robusta
  const prefixesToRemove = [
    'images/ingenierosdepista/',
    'images/equipos/',
    'images/',
    'ingenierosdepista/',
    'equipos/'
  ];
  
  for (const prefix of prefixesToRemove) {
    if (cleanUrl.startsWith(prefix)) {
      cleanUrl = cleanUrl.substring(prefix.length);
      break; // Solo eliminar el primer prefijo encontrado
    }
  }
  
  return cleanUrl;
};

// Función para obtener la ruta correcta de imagen según el tipo
const getImageUrl = (item, type) => {
  const imageUrl = item.image_url || item.ImageURL;
  if (!imageUrl) return '';
  
  const cleanUrl = cleanImageUrl(imageUrl);
  const finalUrl = (() => {
    switch (type) {
      case 'team_constructor':
        return `/images/equipos/${cleanUrl}`;
      case 'track_engineer':
      case 'chief_engineer':
        return `/images/ingenierosdepista/${cleanUrl}`;
      case 'pilot':
      default:
        return `/images/${cleanUrl}`;
    }
  })();
  
  return finalUrl;
};

export default function MarketPage() {
  const { selectedLeague } = useLeague();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Admin check state
  const [isAdmin, setIsAdmin] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDrivers, setOpenDrivers] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [trackEngineers, setTrackEngineers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversError, setDriversError] = useState('');

  // Track Engineers modal state
  const [openTrackEngineers, setOpenTrackEngineers] = useState(false);
  const [trackEngineersByLeague, setTrackEngineersByLeague] = useState([]);
  const [loadingTrackEngineers, setLoadingTrackEngineers] = useState(false);
  const [errorTrackEngineers, setErrorTrackEngineers] = useState('');

  // Chief Engineers modal state
  const [openChiefEngineers, setOpenChiefEngineers] = useState(false);
  const [chiefEngineersByLeague, setChiefEngineersByLeague] = useState([]);
  const [loadingChiefEngineers, setLoadingChiefEngineers] = useState(false);
  const [errorChiefEngineers, setErrorChiefEngineers] = useState('');

  // Team Constructors modal state
  const [openTeamConstructors, setOpenTeamConstructors] = useState(false);
  const [teamConstructorsByLeague, setTeamConstructorsByLeague] = useState([]);
  const [loadingTeamConstructors, setLoadingTeamConstructors] = useState(false);
  const [errorTeamConstructors, setErrorTeamConstructors] = useState('');
  const [openFichar, setOpenFichar] = useState(false);
  const [selectedPilot, setSelectedPilot] = useState(null);
  const [playerMoney, setPlayerMoney] = useState(0);
  const [puja, setPuja] = useState('');
  const navigate = useNavigate();
  const [nextRefresh, setNextRefresh] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentTab, setCurrentTab] = useState('market');
  const [opsTab, setOpsTab] = useState(0);
  const [myBids, setMyBids] = useState([]);
  const [mySales, setMySales] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [openOffersModal, setOpenOffersModal] = useState(false);
  const [selectedSalePilot, setSelectedSalePilot] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBidPilot, setSelectedBidPilot] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openEditBid, setOpenEditBid] = useState(false);
  const [editBidValue, setEditBidValue] = useState('');
  const [anchorElMarket, setAnchorElMarket] = useState(null);
  const [openRemoveFromMarketDialog, setOpenRemoveFromMarketDialog] = useState(false);

  // Create localStorage user key if it doesn't exist
  if (!localStorage.getItem('user') && localStorage.getItem('player_id') && localStorage.getItem('token')) {
    localStorage.setItem('user', JSON.stringify({
      id: Number(localStorage.getItem('player_id')),
      token: localStorage.getItem('token')
    }));
  }

  // Check if current user is admin
  const checkAdminStatus = async () => {
    const token = localStorage.getItem('token');
    const player_id = localStorage.getItem('player_id');
    if (!token || !player_id) return;
    
    try {
      const response = await fetch(`/api/players/${player_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.player?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

  // Fetch players
  const fetchPlayers = async () => {
    if (!selectedLeague) return;
    try {
      // Get players from league classification
      const response = await fetch(`/api/leagues/${selectedLeague.id}/classification`);
      const data = await response.json();
      setPlayers(data.players || []);

      // Get current player's money from playerbyleague
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.id && user?.token) {
        const playerResponse = await fetch(`/api/playerbyleague?player_id=${user.id}&league_id=${selectedLeague.id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        const {player_by_league} = await playerResponse.json();
        console.log('Player data response:', player_by_league); // Debug log

        // Try different possible property names for money
        const money = player_by_league.money || player_by_league.Money || player_by_league.dinero || player_by_league.saldo || 0;
        console.log("player data", player_by_league)
        setPlayerMoney(money);
        console.log('Setting player money to:', money); // Debug log
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  // Fetch market pilots
  const fetchMarketPilots = async () => {
    if (!selectedLeague) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/market?league_id=${selectedLeague.id}`);
      const data = await response.json();
      console.log('📊 Datos del mercado recibidos:', data);
      setAuctions(data.market || []);
    } catch (err) {
      setError('Error al cargar el mercado');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishAllAuctions = async () => {
    if (!selectedLeague) return;
    try {
      const res = await fetch(`/api/market/refresh-and-finish?league_id=${selectedLeague.id}`, { method: 'POST' });
      const data = await res.json();
      fetchMarketPilots();
      setSnackbar({ open: true, message: data.message || 'Mercado reiniciado y subastas finalizadas', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al finalizar subastas', severity: 'error' });
    }
  };

  const handleGenerateFIAOffers = async () => {
    if (!selectedLeague) return;
    try {
      const res = await fetch(`/api/generate-fia-offers?league_id=${selectedLeague.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Ofertas de la FIA generadas correctamente', severity: 'success' });
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al generar ofertas de la FIA', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const handleGenerateFIAOffersOwned = async () => {
    if (!selectedLeague) return;
    try {
      const res = await fetch(`/api/generate-fia-offers-owned?league_id=${selectedLeague.id}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Ofertas de la FIA para elementos con propietario generadas correctamente', severity: 'success' });
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al generar ofertas de la FIA', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const handleDriverClick = (driver) => {
    // Buscar si el piloto está en subasta
    const auction = auctions.find(a => a.driver?.id === driver.id);
    if (auction) {
      navigate(`/market/auction/${auction.id}`);
    }
  };

  const handleUpdateValues = async () => {
    try {
      const res = await fetch('/api/drivers/update-values', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: data.message || 'Valores actualizados', severity: 'success' });
        fetchDrivers();
        fetchMarketPilots();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error actualizando valores', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error actualizando valores', severity: 'error' });
    }
  };

  const handlePuja = async () => {
    if (!selectedPilot || !puja || Number(puja) <= 0) {
      setSnackbar({ open: true, message: 'Introduce un importe válido', severity: 'error' });
      return;
    }
    if (Number(puja) > playerMoney) {
      setSnackbar({ open: true, message: 'No tienes suficiente saldo para esta puja', severity: 'error' });
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.id) {
        setSnackbar({ open: true, message: 'Usuario no autenticado', severity: 'error' });
        return;
      }
      
      const itemType = getItemType(selectedPilot);
      
      const res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: itemType,
          item_id: selectedPilot.id,
          player_id: user.id,
          league_id: selectedLeague.id,
          valor: Number(puja)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: data.message || 'Puja registrada', severity: 'success' });
        setOpenFichar(false);
        fetchMarketPilots();
        // Actualizar saldo tras la puja
        const moneyRes = await fetch(`/api/playerbyleague?player_id=${user.id}&league_id=${selectedLeague.id}`);
        const moneyData = await moneyRes.json();
        setPlayerMoney(moneyData.player_by_league?.money || 0);
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al registrar la puja', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión con el backend', severity: 'error' });
    }
  };

  const handleShowOffers = (item) => {
    setSelectedSalePilot(item);
    setOpenOffersModal(true);
  };

  // --- Lógica para aceptar/rechazar oferta de la liga ---
  const handleAcceptLeagueOffer = async () => {
    if (!selectedSalePilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Determinar el endpoint según el tipo de elemento
      let endpoint = '';
      let payload = {};
      
      switch(selectedSalePilot.type) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/accept-league-offer';
          payload = { pilot_by_league_id: selectedSalePilot.id };
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/accept-league-offer';
          payload = { track_engineer_by_league_id: selectedSalePilot.id };
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/accept-league-offer';
          payload = { chief_engineer_by_league_id: selectedSalePilot.id };
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/accept-league-offer';
          payload = { team_constructor_by_league_id: selectedSalePilot.id };
          break;
        default:
          setSnackbar({ open: true, message: 'Tipo de elemento no soportado', severity: 'error' });
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const elementType = selectedSalePilot.type === 'pilot' ? 'Piloto' : 
                           selectedSalePilot.type === 'track_engineer' ? 'Ingeniero de Pista' :
                           selectedSalePilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 'Equipo Constructor';
        setSnackbar({ open: true, message: `Oferta aceptada. ${elementType} vendido a la FIA.`, severity: 'success' });
        setOpenOffersModal(false);
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
        fetchMoney(); // Actualizar saldo del jugador
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al aceptar la oferta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const handleRejectLeagueOffer = async () => {
    if (!selectedSalePilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Determinar el endpoint según el tipo de elemento
      let endpoint = '';
      let payload = {};
      
      switch(selectedSalePilot.type) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/reject-league-offer';
          payload = { pilot_by_league_id: selectedSalePilot.id };
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/reject-league-offer';
          payload = { track_engineer_by_league_id: selectedSalePilot.id };
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/reject-league-offer';
          payload = { chief_engineer_by_league_id: selectedSalePilot.id };
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/reject-league-offer';
          payload = { team_constructor_by_league_id: selectedSalePilot.id };
          break;
        default:
          setSnackbar({ open: true, message: 'Tipo de elemento no soportado', severity: 'error' });
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Oferta rechazada.', severity: 'success' });
        setOpenOffersModal(false);
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al rechazar la oferta', severity: 'error' });
      }
    } catch (err) {
      console.error('Error fetching my bids:', err);
      setMyBids([]);
    }
  };

  // --- Funciones para manejar ofertas específicas de otros jugadores ---
  const handleAcceptPlayerOffer = async (offerId, offerAmount) => {
    if (!selectedSalePilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Determinar el endpoint según el tipo de elemento
      let endpoint = '';
      let payload = {
        offer_id: offerId,
        offer_amount: offerAmount,
        league_id: selectedLeague.id
      };
      
      switch(selectedSalePilot.type) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/accept-player-offer';
          payload.pilot_by_league_id = selectedSalePilot.id;
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/accept-player-offer';
          payload.track_engineer_by_league_id = selectedSalePilot.id;
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/accept-player-offer';
          payload.chief_engineer_by_league_id = selectedSalePilot.id;
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/accept-player-offer';
          payload.team_constructor_by_league_id = selectedSalePilot.id;
          break;
        default:
          setSnackbar({ open: true, message: 'Tipo de elemento no soportado', severity: 'error' });
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        const elementType = selectedSalePilot.type === 'pilot' ? 'Piloto' : 
                           selectedSalePilot.type === 'track_engineer' ? 'Ingeniero de Pista' :
                           selectedSalePilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 'Equipo Constructor';
        setSnackbar({ open: true, message: `Oferta aceptada. ${elementType} vendido.`, severity: 'success' });
        setOpenOffersModal(false);
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
        fetchMoney(); // Actualizar saldo del jugador
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al aceptar la oferta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const handleRejectPlayerOffer = async (offerId) => {
    if (!selectedSalePilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Determinar el endpoint según el tipo de elemento
      let endpoint = '';
      let payload = {
        offer_id: offerId,
        league_id: selectedLeague.id
      };
      
      switch(selectedSalePilot.type) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/reject-player-offer';
          payload.pilot_by_league_id = selectedSalePilot.id;
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/reject-player-offer';
          payload.track_engineer_by_league_id = selectedSalePilot.id;
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/reject-player-offer';
          payload.chief_engineer_by_league_id = selectedSalePilot.id;
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/reject-player-offer';
          payload.team_constructor_by_league_id = selectedSalePilot.id;
          break;
        default:
          setSnackbar({ open: true, message: 'Tipo de elemento no soportado', severity: 'error' });
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Oferta rechazada.', severity: 'success' });
        setOpenOffersModal(false);
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al rechazar la oferta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // --- Función para quitar del mercado ---
  const handleRemoveFromMarket = async () => {
    if (!selectedSalePilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Estrategia temporal: usar venta: -1 como señal para quitar del mercado
      // El backend debería interpretar valores negativos como "quitar del mercado"
      // y poner Venta = nil, VentaExpiresAt = nil
      
      let endpoint = '';
      let payload = {};
      
      switch(selectedSalePilot.type) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/sell';
          payload = {
            pilot_by_league_id: selectedSalePilot.id,
            venta: -1 // Valor especial para indicar "quitar del mercado"
          };
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/sell';
          payload = {
            track_engineer_by_league_id: selectedSalePilot.id,
            venta: -1
          };
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/sell';
          payload = {
            chief_engineer_by_league_id: selectedSalePilot.id,
            venta: -1
          };
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/sell';
          payload = {
            team_constructor_by_league_id: selectedSalePilot.id,
            venta: -1
          };
          break;
        default:
          setSnackbar({ open: true, message: 'Tipo de elemento no soportado', severity: 'error' });
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        // Verificar si el backend realmente quitó del mercado o solo cambió el precio
        if (data.message && data.message.includes('retirado del mercado')) {
          // Backend confirmó que quitó del mercado
          const elementType = selectedSalePilot.type === 'pilot' ? 'Piloto' : 
                             selectedSalePilot.type === 'track_engineer' ? 'Ingeniero de Pista' :
                             selectedSalePilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 'Equipo Constructor';
          setSnackbar({ open: true, message: `${elementType} retirado del mercado.`, severity: 'success' });
        } else if (data.message && data.message.includes('puesto a la venta')) {
          // Backend aún no soporta quitar del mercado (versión antigua)
          setSnackbar({ 
            open: true, 
            message: 'ATENCIÓN: El backend aún no soporta quitar del mercado. Se necesita implementar esta funcionalidad.', 
            severity: 'warning' 
          });
        } else {
          // Respuesta genérica exitosa
          const elementType = selectedSalePilot.type === 'pilot' ? 'Piloto' : 
                             selectedSalePilot.type === 'track_engineer' ? 'Ingeniero de Pista' :
                             selectedSalePilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 'Equipo Constructor';
          setSnackbar({ open: true, message: `${elementType} retirado del mercado.`, severity: 'success' });
        }
        setOpenRemoveFromMarketDialog(false);
        // Actualizar datos sin cambiar de página
        fetchOps(); // Recargar elementos en venta
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al retirar del mercado', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // --- Lógica para quitar puja en compra ---
  const handleRemoveBid = async (pilot) => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(pilot);
      
      const res = await fetch('/api/auctions/remove-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          item_type: itemType,
          item_id: pilot.id, 
          league_id: selectedLeague.id 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Puja eliminada correctamente.', severity: 'success' });
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la puja', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // --- Lógica para abrir menú de acciones ---
  const handleActionsClick = (event, pilot) => {
    setAnchorEl(event.currentTarget);
    setSelectedBidPilot(pilot);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };
  // --- Lógica para abrir diálogo de confirmación ---
  const handleDeleteBidClick = () => {
    setOpenDeleteDialog(true);
    setAnchorEl(null);
  };
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  // --- Lógica para quitar puja en compra (confirmada) ---
  const handleRemoveBidConfirmed = async () => {
    if (!selectedBidPilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      const res = await fetch('/api/auctions/remove-bid', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Puja eliminada correctamente.', severity: 'success' });
        setOpenDeleteDialog(false);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la puja', severity: 'error' });
      }
    } catch (err) {
      console.error('Error fetching my sales:', err);
      setMySales([]);
    }
  };

  // Fetch all drivers for the modal
  const fetchDrivers = async () => {
    if (!selectedLeague) return;
    setLoadingDrivers(true);
    setDriversError('');

    try {
      console.log('🔄 Fetching drivers for league:', selectedLeague.id);
      const response = await fetch(`/api/pilotsbyleague?league_id=${selectedLeague.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Drivers data received:', data);
      
      setDrivers(data.pilots || []);
      setDriversError('');
    } catch (err) {
      console.error('Error fetching drivers:', err);
      setDriversError('Error al cargar los pilotos');
      setDrivers([]);
    } finally {
      setLoadingDrivers(false);
    }
  };

  // --- Handlers para el market general ---
  const handleCloseMenuMarket = () => {
    setAnchorElMarket(null);
  };
  const handleEditBidClickMarket = () => {
    if (selectedBidPilot?.my_bid) {
      setEditBidValue(String(selectedBidPilot.my_bid));
    } else {
      setEditBidValue('');
    }
    setOpenEditBid(true);
    setAnchorElMarket(null);
  };
  const handleDeleteBidClickMarket = () => {
    if (selectedBidPilot) {
      setOpenDeleteDialog(true);
      setAnchorElMarket(null);
    }
  };
  const handleCloseEditBidMarket = () => {
    setOpenEditBid(false);
    setEditBidValue('');
  };
  const handleEditBidSubmitMarket = async () => {
    if (!selectedBidPilot || !editBidValue || Number(editBidValue) <= 0) {
      setSnackbar({ open: true, message: 'Introduce un importe válido', severity: 'error' });
      return;
    }
    if (Number(editBidValue) > playerMoney) {
      setSnackbar({ open: true, message: 'No tienes suficiente saldo para esta puja', severity: 'error' });
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      // El endpoint POST /api/auctions/bid maneja tanto crear como actualizar pujas
      const res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          item_type: itemType,
          item_id: selectedBidPilot.id,
          player_id: user.id,
          league_id: selectedLeague.id,
          valor: Number(editBidValue)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: data.message || 'Puja actualizada correctamente', severity: 'success' });
        setOpenEditBid(false);
        setEditBidValue('');
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
        fetchMoney(); // Actualizar saldo del jugador
        fetchMarketPilots(); // También actualizar el mercado
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al actualizar la puja', severity: 'error' });
      }
    } catch (err) {
      console.error('Error updating bid:', err);
      setSnackbar({ open: true, message: 'Error de conexión con el backend', severity: 'error' });
    }
  };
  const handleRemoveBidConfirmedMarket = async () => {
    if (!selectedBidPilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      const res = await fetch('/api/auctions/remove-bid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          item_type: itemType,
          item_id: selectedBidPilot.id, 
          league_id: selectedLeague.id 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Puja eliminada correctamente', severity: 'success' });
        setOpenDeleteDialog(false);
        setSelectedBidPilot(null);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la puja', severity: 'error' });
      }
    } catch (err) {
      console.error('Error removing bid:', err);
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // Fetch my bids (compras activas)
  const fetchMyBids = async () => {
    if (!selectedLeague) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch(`/api/my-market-bids?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      console.log('My bids data:', data);
      setMyBids(data.bids || []);
    } catch (err) {
      console.error('Error fetching my bids:', err);
      setMyBids([]);
    }
  };

  // Fetch my sales (elementos en venta)
  const fetchMySales = async () => {
    if (!selectedLeague) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      // Buscar elementos que el usuario tiene en venta
      const response = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      console.log('My sales data:', data);
      setMySales(data.sales || []);
    } catch (err) {
      console.error('Error fetching my sales:', err);
      setMySales([]);
    }
  };

  // Fetch player money
  const fetchMoney = async () => {
    if (!selectedLeague) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user?.id && user?.token) {
        const playerResponse = await fetch(`/api/playerbyleague?player_id=${user.id}&league_id=${selectedLeague.id}`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        const {player_by_league} = await playerResponse.json();
        const money = player_by_league.money || player_by_league.Money || player_by_league.dinero || player_by_league.saldo || 0;
        setPlayerMoney(money);
      }
    } catch (err) {
      console.error('Error fetching player money:', err);
    }
  };

  // Handle opening menu for market items
  const handleOpenMenuMarket = (event, pilot, myBid) => {
    setAnchorElMarket(event.currentTarget);
    setSelectedBidPilot({ ...pilot, my_bid: myBid?.my_bid });
  };

  // Handle opening track engineers modal
  const handleOpenTrackEngineers = async () => {
    if (!selectedLeague) return;
    setOpenTrackEngineers(true);
    setLoadingTrackEngineers(true);
    setErrorTrackEngineers('');

    try {
      const response = await fetch(`/api/trackengineersbyleague/list?league_id=${selectedLeague.id}`);
      const data = await response.json();
      console.log('🔧 Track engineers recibidos:', data);
      setTrackEngineersByLeague(data.track_engineers || []);
    } catch (err) {
      console.error('Error fetching track engineers:', err);
      setErrorTrackEngineers('Error al cargar los ingenieros de pista');
      setTrackEngineersByLeague([]);
    } finally {
      setLoadingTrackEngineers(false);
    }
  };

  // Handle opening chief engineers modal
  const handleOpenChiefEngineers = async () => {
    if (!selectedLeague) return;
    setOpenChiefEngineers(true);
    setLoadingChiefEngineers(true);
    setErrorChiefEngineers('');

    try {
      const response = await fetch(`/api/chiefengineersbyleague/list?league_id=${selectedLeague.id}`);
      const data = await response.json();
      console.log('👨‍💼 Chief engineers recibidos:', data);
      setChiefEngineersByLeague(data.chief_engineers || []);
    } catch (err) {
      console.error('Error fetching chief engineers:', err);
      setErrorChiefEngineers('Error al cargar los ingenieros jefe');
      setChiefEngineersByLeague([]);
    } finally {
      setLoadingChiefEngineers(false);
    }
  };

  // Handle opening team constructors modal
  const handleOpenTeamConstructors = async () => {
    if (!selectedLeague) return;
    setOpenTeamConstructors(true);
    setLoadingTeamConstructors(true);
    setErrorTeamConstructors('');

    try {
      const response = await fetch(`/api/teamconstructorsbyleague/list?league_id=${selectedLeague.id}`);
      const data = await response.json();
      console.log('🏎️ Team constructors recibidos:', data);
      setTeamConstructorsByLeague(data.team_constructors || []);
    } catch (err) {
      console.error('Error fetching team constructors:', err);
      setErrorTeamConstructors('Error al cargar los equipos');
      setTeamConstructorsByLeague([]);
    } finally {
      setLoadingTeamConstructors(false);
    }
  };

  // Fetch market refresh timer
  const fetchNextRefresh = async () => {
    try {
      const response = await fetch('/api/market/next-refresh');
      const data = await response.json();
      setNextRefresh(data.next_refresh * 1000); // convert to ms
    } catch (err) {
      console.error('Error fetching next refresh:', err);
    }
  };

  // Effects
  useEffect(() => {
    if (selectedLeague) {
      fetchMarketPilots();
      fetchPlayers();
      fetchNextRefresh();
    }
    checkAdminStatus();
  }, [selectedLeague]);

  // Effect for timer countdown
  useEffect(() => {
    if (!nextRefresh) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = nextRefresh - now;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00:00');
        fetchMarketPilots(); // Refresh market when timer reaches 0
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextRefresh]);

  // Fetch operations
    const fetchOps = async () => {
      setLoadingOps(true);
      try {
        if (opsTab === 0) {
          await fetchMyBids();
        } else {
          await fetchMySales();
        }
      } catch (err) {
        console.error('Error fetching operations:', err);
      } finally {
        setLoadingOps(false);
      }
    };

  // Effect for fetching operations based on current tab
  useEffect(() => {
    if (currentTab !== 'operations' || !selectedLeague) return;
    fetchOps();
  }, [currentTab, opsTab, selectedLeague]);

  if (!selectedLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <CardTitle className="mb-2">Selecciona una Liga</CardTitle>
              <p className="text-text-secondary mb-4">
                Debes seleccionar una liga para acceder al mercado
              </p>
              <Button onClick={() => navigate('/leagues')}>
                Ver Ligas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-h1 font-bold text-text-primary mb-2">
              🏁 Mercado F1
            </h1>
            <p className="text-text-secondary">
              Liga: <span className="text-accent-main font-medium">{selectedLeague.name}</span>
            </p>
          </div>

          {/* Player Balance */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-accent-main/20 p-2 rounded-md">
                <TrendingUp className="h-5 w-5 text-accent-main" />
              </div>
              <div>
                <p className="text-small text-text-secondary">Tu saldo</p>
                <p className="text-h3 font-bold text-state-success">
                  {formatCurrency(playerMoney)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Market Refresh Timer */}
        {timeLeft && (
          <Card className="p-4 mb-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-accent-main" />
              <div>
                <p className="text-small text-text-secondary">Próxima actualización</p>
                <p className="text-body font-medium text-text-primary">{timeLeft}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="market">Mercado</TabsTrigger>
          <TabsTrigger value="operations">Mis Operaciones</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Market Tab */}
        <TabsContent value="market" className="space-y-6">
          {/* Admin Action Buttons */}
          {isAdmin && (
            <Card className="p-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleFinishAllAuctions}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Finalizar Subastas
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUpdateValues}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Actualizar Valores
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateFIAOffers}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Generar Ofertas FIA
                </Button>
                <Button
                  variant="outline"
                  onClick={handleGenerateFIAOffersOwned}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Generar Ofertas FIA (Propietarios)
                </Button>
              </div>
            </Card>
          )}

          {/* Search and Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder="Buscar pilotos, ingenieros, equipos..."
                  className="pl-10"
                  // TODO: Implement search functionality
                />
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>
                )}
                <Button variant="outline" onClick={fetchMarketPilots}>
                  Actualizar
                </Button>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                console.log('🖱️ Botón "Todos los Pilotos" clickeado');
                console.log('🏁 Liga seleccionada:', selectedLeague);
                setOpenDrivers(true);
                fetchDrivers();
              }}
              className="flex items-center gap-2"
              disabled={loadingDrivers}
            >
              <Users className="h-4 w-4" />
              {loadingDrivers ? 'Cargando...' : 'Todos los Pilotos'}
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleOpenTrackEngineers}
            >
              <Settings className="h-4 w-4" />
              Ingenieros de Pista
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleOpenChiefEngineers}
            >
              <Settings className="h-4 w-4" />
              Ingenieros Jefe
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleOpenTeamConstructors}
            >
              <Users className="h-4 w-4" />
              Equipos
            </Button>
          </div>

          {/* Market Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4">
                      <div className="rounded-full bg-surface h-12 w-12"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-surface rounded w-3/4"></div>
                        <div className="h-3 bg-surface rounded w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-6">
              <div className="text-center">
                <p className="text-state-error mb-4">{error}</p>
                <Button onClick={fetchMarketPilots}>
                  Reintentar
                </Button>
              </div>
            </Card>
          ) : auctions.length === 0 ? (
            <Card className="p-6">
              <div className="text-center">
                <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <CardTitle className="mb-2">No hay elementos en el mercado</CardTitle>
                <p className="text-text-secondary">
                  El mercado está vacío en este momento
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {auctions.map((item) => {
                const user = JSON.parse(localStorage.getItem('user'));
                const myBid = item.bids?.find(bid => bid.player_id === user?.id);

                if (getItemType(item) === 'pilot') {
                  return (
                    <div key={`pilot-${item.id}`}>
                      <DriverRaceCard
                        driver={{ ...item, my_bid: myBid?.my_bid }}
                        showStats={true}
                        isOwned={false}
                        leagueId={selectedLeague.id}
                        players={players}
                        showBidActions={!!myBid}
                        onFichar={myBid ? undefined : () => {
                          if (item.type === 'pilot') {
                            navigate(`/puja/${item.id}`);
                          } else if (item.type === 'track_engineer') {
                            navigate(`/puja/engineer/track/${item.id}`);
                          } else if (item.type === 'chief_engineer') {
                            navigate(`/puja/engineer/chief/${item.id}`);
                          } else if (item.type === 'team_constructor') {
                            navigate(`/puja/team/${item.id}`);
                          } else {
                            // Fallback for items without specific type
                            navigate(`/puja/${item.id}`);
                          }
                        }}
                        bidActionsButton={myBid ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenMenuMarket(e, item, myBid);
                            }}
                          >
                            ACCIONES
                          </Button>
                        ) : undefined}
                      />
                    </div>
                  );
                } else if (getItemType(item) === 'track_engineer' || getItemType(item) === 'chief_engineer') {
                  // Render engineers using EngineerCard
                  const engineerType = getItemType(item) === 'track_engineer' ? 'track' : 'chief';
                  return (
                    <EngineerCard
                      key={`${item.type}-${item.id}`}
                      engineer={{ ...item, my_bid: myBid?.my_bid }}
                      type={engineerType}
                      showStats={true}
                      isOwned={false}
                      leagueId={selectedLeague.id}
                      players={players}
                      onPujar={!myBid ? (eng, type) => {
                        navigate(`/puja/engineer/${type}/${eng.id}`);
                      } : undefined}
                      bidActionsButton={myBid ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenMenuMarket(e, item, myBid);
                          }}
                        >
                          ACCIONES
                        </Button>
                      ) : undefined}
                    />
                  );
                } else if (getItemType(item) === 'team_constructor') {
                  // Render teams using TeamCard
                  return (
                    <TeamCard
                      key={`${item.type}-${item.id}`}
                      team={{ ...item, my_bid: myBid?.my_bid }}
                      showStats={true}
                      isOwned={false}
                      leagueId={selectedLeague.id}
                      players={players}
                      onPujar={!myBid ? (teamObj) => {
                        navigate(`/puja/team/${teamObj.id}`);
                      } : undefined}
                      bidActionsButton={myBid ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenMenuMarket(e, item, myBid);
                          }}
                        >
                          ACCIONES
                        </Button>
                      ) : undefined}
                    />
                  );
                }
              })}
            </div>
          )}
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
              <CardTitle>Mis Operaciones</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex gap-4 text-small">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-accent-main"></div>
                      <span className="text-text-secondary">
                        {myBids.length} puja{myBids.length !== 1 ? 's' : ''} activa{myBids.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-state-success"></div>
                      <span className="text-text-secondary">
                        {mySales.length} elemento{mySales.length !== 1 ? 's' : ''} en venta
                      </span>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={fetchOps}
                    disabled={loadingOps}
                    className="flex items-center gap-2"
                  >
                    {loadingOps ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-main"></div>
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={opsTab.toString()} onValueChange={(val) => setOpsTab(parseInt(val))}>
                <TabsList>
                  <TabsTrigger value="0">Compras</TabsTrigger>
                  <TabsTrigger value="1">Ventas</TabsTrigger>
                </TabsList>
                <TabsContent value="0">
                  <div className="space-y-4">
                    {loadingOps ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-main mx-auto mb-4"></div>
                        <p className="text-text-secondary">Cargando pujas activas...</p>
                      </div>
                    ) : myBids.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                        <p className="text-text-secondary">No tienes pujas activas</p>
                        <p className="text-small text-text-secondary mt-2">
                          Ve al mercado para hacer pujas en fichajes
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myBids.map((bid) => {
                          // Determinar el tipo de elemento para mostrar la información correcta
                          const isPilot = bid.type === 'pilot';
                          const isTrackEngineer = bid.type === 'track_engineer';
                          const isChiefEngineer = bid.type === 'chief_engineer';
                          const isTeam = bid.type === 'team_constructor';
                          
                          const displayName = isPilot ? bid.driver_name : bid.name;
                          const displayTeam = bid.team;
                          const displayRole = isPilot ? 'Piloto' : 
                                            isTrackEngineer ? 'Ing. Pista' : 
                                            isChiefEngineer ? 'Ing. Jefe' : 'Equipo';
                          
                          // Función para obtener nombre corto (10-12 caracteres)
                          const getShortName = (fullName) => {
                            if (!fullName) return '??';
                            const parts = fullName.trim().split(' ');
                            if (parts.length === 1) return parts[0].substring(0, 12);
                            const firstName = parts[0];
                            const lastName = parts.slice(1).join(' ');
                            const combined = `${firstName} ${lastName}`;
                            return combined.length <= 12 ? combined : combined.substring(0, 12);
                          };
                          
                          // Determinar la URL de imagen correcta según el tipo
                          let imageUrl = '';
                          if (isPilot) {
                            imageUrl = getImageUrl(bid, 'pilot');
                          } else if (isTrackEngineer || isChiefEngineer) {
                            imageUrl = getImageUrl(bid, isTrackEngineer ? 'track_engineer' : 'chief_engineer');
                          } else if (isTeam) {
                            imageUrl = getImageUrl(bid, 'team_constructor');
                          }
                          
                          // Obtener color del equipo
                          const teamColor = getTeamColor(displayTeam);
                          
                          // Determinar letra del badge
                          const badgeLetter = isPilot ? 'P' : 
                                            isTrackEngineer ? 'T' : 
                                            isChiefEngineer ? 'C' : 'E';
                          
                          return (
                            <div key={bid.id} className="bg-surface p-6 rounded-lg border border-border">
                              <div className="flex items-start gap-4">
                                {/* Badge y Avatar en columna */}
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                  <div
                                    className="flex items-center justify-center font-bold"
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      border: `2px solid ${teamColor.primary}`,
                                      background: '#000',
                                      color: teamColor.primary,
                                      fontSize: 16,
                                      boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                                    }}
                                  >
                                    {badgeLetter}
                                  </div>
                                  <Avatar className="w-16 h-16 border-2 border-accent-main">
                                    <AvatarImage 
                                      src={imageUrl}
                                      alt={displayName}
                                    />
                                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                                      {displayName?.substring(0, 2) || '??'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {/* Mi puja debajo de la foto */}
                                  <p className="text-accent-main font-bold text-sm text-center">
                                    Mi puja: €{Number(bid.my_bid).toLocaleString('es-ES')}
                                  </p>
                                </div>
                                
                                {/* Información y botones */}
                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="text-text-primary font-bold text-lg truncate" style={{lineHeight: '1.1'}}>{getShortName(displayName)}</h3>
                                    <p className="text-text-secondary text-sm truncate">{displayTeam}</p>
                                    <p className="text-accent-main text-xs mt-1">{displayRole}</p>
                                    {bid.highest_bid && bid.highest_bid !== bid.my_bid && (
                                      <p className="text-state-warning text-xs mt-1">
                                        Más alta: €{Number(bid.highest_bid).toLocaleString('es-ES')}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Botones */}
                                  <div className="flex flex-col gap-2 flex-shrink-0">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => {
                                        setSelectedBidPilot(bid);
                                        setEditBidValue(String(bid.my_bid || ''));
                                        setOpenEditBid(true);
                                      }}
                                      className="text-xs px-2 py-1 min-w-0"
                                    >
                                      <span className="truncate">Editar Puja</span>
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive" 
                                      onClick={() => {
                                        setSelectedBidPilot(bid);
                                        setOpenDeleteDialog(true);
                                      }}
                                      className="text-xs px-2 py-1 min-w-0"
                                    >
                                      <span className="truncate">Retirar Puja</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="1">
                  <div className="space-y-4">
                    {loadingOps ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-main mx-auto mb-4"></div>
                        <p className="text-text-secondary">Cargando elementos en venta...</p>
                      </div>
                    ) : mySales.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                        <p className="text-text-secondary">No tienes elementos en venta</p>
                        <p className="text-small text-text-secondary mt-2">
                          Ve a tu equipo para poner elementos en el mercado
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mySales.map((sale) => {
                          // Determinar el tipo de elemento para mostrar la información correcta
                          const isPilot = sale.type === 'pilot';
                          const isTrackEngineer = sale.type === 'track_engineer';
                          const isChiefEngineer = sale.type === 'chief_engineer';
                          const isTeam = sale.type === 'team_constructor';
                          
                          const displayName = isPilot ? sale.driver_name : sale.name;
                          const displayTeam = sale.team;
                          const displayRole = isPilot ? 'Piloto' : 
                                            isTrackEngineer ? 'Ing. Pista' : 
                                            isChiefEngineer ? 'Ing. Jefe' : 'Equipo';
                          
                          // Función para obtener nombre corto (10-12 caracteres)
                          const getShortName = (fullName) => {
                            if (!fullName) return '??';
                            const parts = fullName.trim().split(' ');
                            if (parts.length === 1) return parts[0].substring(0, 12);
                            const firstName = parts[0];
                            const lastName = parts.slice(1).join(' ');
                            const combined = `${firstName} ${lastName}`;
                            return combined.length <= 12 ? combined : combined.substring(0, 12);
                          };
                          
                          // Determinar la URL de imagen correcta según el tipo
                          let imageUrl = '';
                          if (isPilot) {
                            imageUrl = getImageUrl(sale, 'pilot');
                          } else if (isTrackEngineer || isChiefEngineer) {
                            imageUrl = getImageUrl(sale, isTrackEngineer ? 'track_engineer' : 'chief_engineer');
                          } else if (isTeam) {
                            imageUrl = getImageUrl(sale, 'team_constructor');
                          }
                          
                          // Obtener color del equipo
                          const teamColor = getTeamColor(displayTeam);
                          
                          // Determinar letra del badge
                          const badgeLetter = isPilot ? 'P' : 
                                            isTrackEngineer ? 'T' : 
                                            isChiefEngineer ? 'C' : 'E';
                          
                          return (
                            <div key={sale.id} className="bg-surface p-6 rounded-lg border border-border">
                              <div className="flex items-start gap-4">
                                {/* Badge y Avatar en columna */}
                                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                                  <div
                                    className="flex items-center justify-center font-bold"
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: '50%',
                                      border: `2px solid ${teamColor.primary}`,
                                      background: '#000',
                                      color: teamColor.primary,
                                      fontSize: 16,
                                      boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                                    }}
                                  >
                                    {badgeLetter}
                                  </div>
                                  <Avatar className="w-16 h-16 border-2 border-accent-main">
                                    <AvatarImage 
                                      src={imageUrl}
                                      alt={displayName}
                                    />
                                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                                      {displayName?.substring(0, 2) || '??'}
                                    </AvatarFallback>
                                  </Avatar>
                                  {/* Valor debajo de la foto */}
                                  <p className="text-accent-main font-bold text-sm text-center">
                                    €{Number(sale.venta || sale.price).toLocaleString('es-ES')}
                                  </p>
                                </div>
                                
                                {/* Información y botón */}
                                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <h3 className="text-text-primary font-bold text-lg truncate" style={{lineHeight: '1.1'}}>{getShortName(displayName)}</h3>
                                    <p className="text-text-secondary text-sm truncate">{displayTeam}</p>
                                    <p className="text-accent-main text-xs mt-1">{displayRole}</p>
                                  </div>
                                  
                                  {/* Botón */}
                                  <div className="flex-shrink-0">
                                    {(() => {
                                      let totalOffers = 0;
                                      if (sale.league_offer_value) totalOffers++;
                                      if (sale.offers_count) totalOffers += sale.offers_count;
                                      
                                      return totalOffers > 0 ? (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedSalePilot(sale);
                                            setOpenOffersModal(true);
                                          }}
                                          className="flex items-center gap-1 text-xs px-2 py-1 min-w-0"
                                        >
                                          <Settings className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">Acciones ({totalOffers})</span>
                                        </Button>
                                      ) : (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={() => {
                                            setSelectedSalePilot(sale);
                                            setOpenRemoveFromMarketDialog(true);
                                          }}
                                          className="flex items-center gap-1 text-xs px-2 py-1 min-w-0"
                                        >
                                          <Trash2 className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">Quitar</span>
                                        </Button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <TrendingUp className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <CardTitle className="mb-2">Histórico</CardTitle>
                <p className="text-text-secondary">
                  El historial de transacciones estará disponible próximamente
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}

      {/* All Drivers Modal */}
      <Dialog open={openDrivers} onOpenChange={setOpenDrivers}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Todos los Pilotos - {selectedLeague?.name}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {loadingDrivers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-surface h-12 w-12"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-surface rounded w-3/4"></div>
                          <div className="h-3 bg-surface rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : driversError ? (
              <div className="text-center py-8">
                <p className="text-state-error mb-4">{driversError}</p>
                <Button onClick={fetchDrivers}>Reintentar</Button>
              </div>
            ) : drivers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <p className="text-text-secondary">No hay pilotos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drivers.map((driver) => {
                  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
                  const isCurrentUserOwner = driver.owner_id === currentUserId;
                  
                  return (
                    <DriverRaceCard
                      key={driver.id}
                      driver={driver}
                      showStats={true}
                      isOwned={isCurrentUserOwner}
                      leagueId={selectedLeague.id}
                      players={players}
                      onClick={() => {
                        setOpenDrivers(false);
                        navigate(`/profile/${driver.id}`);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Track Engineers Modal */}
      <Dialog open={openTrackEngineers} onOpenChange={setOpenTrackEngineers}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ingenieros de Pista - {selectedLeague?.name}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {loadingTrackEngineers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-surface h-12 w-12"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-surface rounded w-3/4"></div>
                          <div className="h-3 bg-surface rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : errorTrackEngineers ? (
              <div className="text-center py-8">
                <p className="text-state-error mb-4">{errorTrackEngineers}</p>
                <Button onClick={handleOpenTrackEngineers}>Reintentar</Button>
              </div>
            ) : trackEngineersByLeague.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <p className="text-text-secondary">No hay ingenieros de pista disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trackEngineersByLeague.map((engineer) => {
                  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
                  const isCurrentUserOwner = engineer.owner_id === currentUserId;
                  
                  return (
                    <EngineerCard
                      key={engineer.id}
                      engineer={engineer}
                      type="track"
                      showStats={true}
                      isOwned={isCurrentUserOwner}
                      leagueId={selectedLeague.id}
                      players={players}
                      onClick={() => {
                        setOpenTrackEngineers(false);
                        navigate(`/profile/engineer/track/${engineer.by_league_id}`);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Chief Engineers Modal */}
      <Dialog open={openChiefEngineers} onOpenChange={setOpenChiefEngineers}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Ingenieros Jefe - {selectedLeague?.name}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {loadingChiefEngineers ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-surface h-12 w-12"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-surface rounded w-3/4"></div>
                          <div className="h-3 bg-surface rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : errorChiefEngineers ? (
              <div className="text-center py-8">
                <p className="text-state-error mb-4">{errorChiefEngineers}</p>
                <Button onClick={handleOpenChiefEngineers}>Reintentar</Button>
              </div>
            ) : chiefEngineersByLeague.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <p className="text-text-secondary">No hay ingenieros jefe disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {chiefEngineersByLeague.map((engineer) => {
                  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
                  const isCurrentUserOwner = engineer.owner_id === currentUserId;
                  
                  return (
                    <EngineerCard
                      key={engineer.id}
                      engineer={engineer}
                      type="chief"
                      showStats={true}
                      isOwned={isCurrentUserOwner}
                      leagueId={selectedLeague.id}
                      players={players}
                      onClick={() => {
                        setOpenChiefEngineers(false);
                        navigate(`/profile/engineer/chief/${engineer.by_league_id}`);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Constructors Modal */}
      <Dialog open={openTeamConstructors} onOpenChange={setOpenTeamConstructors}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Equipos - {selectedLeague?.name}</DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {loadingTeamConstructors ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-surface h-12 w-12"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-surface rounded w-3/4"></div>
                          <div className="h-3 bg-surface rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : errorTeamConstructors ? (
              <div className="text-center py-8">
                <p className="text-state-error mb-4">{errorTeamConstructors}</p>
                <Button onClick={handleOpenTeamConstructors}>Reintentar</Button>
              </div>
            ) : teamConstructorsByLeague.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                <p className="text-text-secondary">No hay equipos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamConstructorsByLeague.map((team) => {
                  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
                  const isCurrentUserOwner = team.owner_id === currentUserId;
                  
                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      showStats={true}
                      isOwned={isCurrentUserOwner}
                      leagueId={selectedLeague.id}
                      players={players}
                      onClick={() => {
                        setOpenTeamConstructors(false);
                        navigate(`/profile/team/${team.by_league_id}`);
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <EditBidDialog
        open={openEditBid}
        onClose={() => setOpenEditBid(false)}
        pilot={selectedBidPilot}
        currentBid={editBidValue}
        onBidChange={setEditBidValue}
        onSubmit={handleEditBidSubmitMarket}
        editBidValue={editBidValue}
        setEditBidValue={setEditBidValue}
        playerMoney={playerMoney}
      />

      <DeleteBidDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        pilot={selectedBidPilot}
        onConfirm={handleRemoveBidConfirmedMarket}
      />

      {/* Diálogo de confirmación para quitar del mercado */}
      <Dialog open={openRemoveFromMarketDialog} onClose={() => setOpenRemoveFromMarketDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
          Confirmar retirada
        </DialogTitle>
        <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
          {selectedSalePilot && (() => {
            // Determinar datos según el tipo
            const isPilot = selectedSalePilot.type === 'pilot';
            const isTrackEngineer = selectedSalePilot.type === 'track_engineer';
            const isChiefEngineer = selectedSalePilot.type === 'chief_engineer';
            const isTeam = selectedSalePilot.type === 'team_constructor';
            
            const displayName = isPilot ? selectedSalePilot.driver_name : selectedSalePilot.name;
            const displayTeam = selectedSalePilot.team;
            
            // Determinar la URL de imagen correcta según el tipo
            let imageUrl = '';
            if (isPilot) {
              imageUrl = getImageUrl(selectedSalePilot, 'pilot');
            } else if (isTrackEngineer || isChiefEngineer) {
              imageUrl = getImageUrl(selectedSalePilot, isTrackEngineer ? 'track_engineer' : 'chief_engineer');
            } else if (isTeam) {
              imageUrl = getImageUrl(selectedSalePilot, 'team_constructor');
            }

            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                <img
                  src={imageUrl} 
                  alt={displayName}
                  style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16, border: '2px solid #FFD600' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16, border: '2px solid #FFD600', backgroundColor: '#333', display: 'none', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
                  {displayName?.substring(0, 2) || '??'}
                </div>
                <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1 }}>
                  {displayName}
                </Typography>
                <Typography sx={{ color: '#b0b0b0', fontSize: 13, mb: 2 }}>
                  {displayTeam}
                </Typography>
                         <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15, mb: 3 }}>
               ¿Seguro que quieres quitar este elemento del mercado?
             </Typography>
             <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
               <Button 
                 variant="outline" 
                 onClick={() => setOpenRemoveFromMarketDialog(false)}
                 sx={{ flex: 1, color: '#fff', borderColor: '#666' }}
               >
                 Cancelar
               </Button>
               <Button 
                 variant="contained" 
                 color="error"
                 onClick={handleRemoveFromMarket}
                 sx={{ flex: 1 }}
               >
                 Quitar
               </Button>
             </Box>
           </Box>
           );
         })()}
        </DialogContent>
      </Dialog>

      {/* Modal de ofertas recibidas */}
      <Dialog open={openOffersModal} onOpenChange={setOpenOffersModal}>
        <DialogContent className="max-w-md mx-auto bg-surface border border-border">
          <DialogHeader className="text-center pb-4">
            <Button 
              onClick={() => setOpenOffersModal(false)} 
              variant="ghost" 
              size="icon"
              className="absolute top-3 right-3 text-text-primary hover:bg-surface-elevated"
            >
              <X className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-text-primary text-h3 font-bold">
              Ofertas recibidas
            </DialogTitle>
          </DialogHeader>

          {selectedSalePilot && (() => {
            // Determinar datos según el tipo
            const isPilot = selectedSalePilot.type === 'pilot';
            const isTrackEngineer = selectedSalePilot.type === 'track_engineer';
            const isChiefEngineer = selectedSalePilot.type === 'chief_engineer';
            const isTeam = selectedSalePilot.type === 'team_constructor';
            
            const displayName = isPilot ? selectedSalePilot.driver_name : selectedSalePilot.name;
            const displayTeam = selectedSalePilot.team;
            
            // Determinar la URL de imagen correcta según el tipo
            let imageUrl = '';
            if (isPilot) {
              imageUrl = getImageUrl(selectedSalePilot, 'pilot');
            } else if (isTrackEngineer || isChiefEngineer) {
              imageUrl = getImageUrl(selectedSalePilot, isTrackEngineer ? 'track_engineer' : 'chief_engineer');
            } else if (isTeam) {
              imageUrl = getImageUrl(selectedSalePilot, 'team_constructor');
            }
            
            const teamColor = getTeamColor(displayTeam);
            const badgeLetter = isPilot ? 'P' : 
                              isTrackEngineer ? 'T' : 
                              isChiefEngineer ? 'C' : 'E';

            return (
              <div className="flex flex-col items-center space-y-6">
                {/* Header con imagen estilo TeamPilots */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="flex items-center justify-center font-bold"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: `2px solid ${teamColor.primary}`,
                      background: '#000',
                      color: teamColor.primary,
                      fontSize: 18,
                      boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                    }}
                  >
                    {badgeLetter}
                  </div>
                  <Avatar className="w-20 h-20 border-2 border-accent-main">
                    <AvatarImage 
                      src={imageUrl}
                      alt={displayName}
                    />
                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold text-lg">
                      {displayName?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-text-primary font-bold text-lg">{displayName}</h3>
                    <p className="text-text-secondary text-sm">{displayTeam}</p>
                    <p className="text-accent-main font-bold text-sm mt-1">
                      €{Number(selectedSalePilot.venta || selectedSalePilot.price || 0).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
                
                {/* Oferta de la FIA (si existe) */}
                {selectedSalePilot.league_offer_value && (
                  <div className="w-full bg-surface-elevated p-4 rounded-lg border border-border">
                    <div className="text-center mb-4">
                      <p className="text-accent-main font-bold text-sm mb-2">OFERTA DE LA FIA</p>
                      <p className="text-text-primary font-bold text-2xl">
                        €{Number(selectedSalePilot.league_offer_value).toLocaleString('es-ES')}
                      </p>
                      {selectedSalePilot.league_offer_expires_at && (
                        <p className="text-text-secondary text-xs mt-2">
                          Expira: {new Date(selectedSalePilot.league_offer_expires_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleRejectLeagueOffer}
                        className="flex-1 text-text-secondary border-border hover:bg-surface hover:text-text-primary"
                      >
                        Rechazar
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={handleAcceptLeagueOffer}
                        className="flex-1 bg-state-success hover:bg-state-success hover:bg-opacity-80 text-white"
                      >
                        Aceptar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mensaje si no hay ofertas */}
                {!selectedSalePilot.league_offer_value && (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-text-secondary text-body">No hay ofertas recibidas</p>
                    <p className="text-text-secondary text-small">
                      Las ofertas aparecerán aquí cuando la FIA o otros jugadores hagan ofertas
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      {snackbar.open && (
        <div className={cn(
          "fixed bottom-4 right-4 p-4 rounded-md shadow-lg",
          snackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
        )}>
          <p className="text-white">{snackbar.message}</p>
        </div>
      )}
    </div>
  );
}