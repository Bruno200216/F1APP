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
import { Clock, Users, Settings, TrendingUp, Search, Filter, Plus, Trash2, X, User } from 'lucide-react';

// Components
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerCard from '../components/EngineerCard';
import TeamCard from '../components/TeamCard';
import BidActionsMenu from '../components/BidActionsMenu';
import EditBidDialog from '../components/EditBidDialog';
import DeleteBidDialog from '../components/DeleteBidDialog';

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
  const [existingOffers, setExistingOffers] = useState([]);
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
        fetchMyBids(); // Recargar pujas propias
        fetchMySales(); // Recargar ventas propias
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
        fetchMyBids(); // Recargar pujas propias
        fetchMySales(); // Recargar ventas propias
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

  // Función para editar oferta (usando PUT)
  const handleEditOfferSubmit = async () => {
    if (!selectedBidPilot || !editBidValue || Number(editBidValue) <= 0) {
      setSnackbar({ open: true, message: 'Introduce un importe válido', severity: 'error' });
      return;
    }
    if (Number(editBidValue) > playerMoney) {
      setSnackbar({ open: true, message: 'No tienes suficiente saldo para esta oferta', severity: 'error' });
      return;
    }
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      // Usar el endpoint PUT para actualizar ofertas
      const res = await fetch(`/api/${itemType}/update-offer`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          item_id: selectedBidPilot.id,
          league_id: selectedLeague.id,
          offer_value: Number(editBidValue)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: data.message || 'Oferta actualizada correctamente', severity: 'success' });
        setOpenEditBid(false);
        setEditBidValue('');
        // Actualizar datos
        fetchExistingOffers();
        fetchMoney();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al actualizar la oferta', severity: 'error' });
      }
    } catch (err) {
      console.error('Error updating offer:', err);
      setSnackbar({ open: true, message: 'Error de conexión con el backend', severity: 'error' });
    }
  };

  // Función para eliminar oferta (usando DELETE)
  const handleDeleteOfferConfirmed = async () => {
    if (!selectedBidPilot) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      const res = await fetch(`/api/${itemType}/delete-offer`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          item_id: selectedBidPilot.id, 
          league_id: selectedLeague.id 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Oferta eliminada correctamente', severity: 'success' });
        setOpenDeleteDialog(false);
        setSelectedBidPilot(null);
        // Actualizar datos
        fetchExistingOffers();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la oferta', severity: 'error' });
      }
    } catch (err) {
      console.error('Error removing offer:', err);
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
      
      // Filtrar solo las subastas (is_auction: true)
      const auctionBids = (data.bids || []).filter(bid => bid.is_auction === true);
      setMyBids(auctionBids);
    } catch (err) {
      console.error('Error fetching my bids:', err);
      setMyBids([]);
    }
  };

  // Fetch existing offers (ofertas que el usuario ha hecho a otros jugadores)
  const fetchExistingOffers = async () => {
    if (!selectedLeague) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch(`/api/my-market-bids?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      console.log('Existing offers data:', data);
      
      // Filtrar solo las ofertas directas (is_auction: false)
      const directOffers = (data.bids || []).filter(bid => bid.is_auction === false);
      setExistingOffers(directOffers);
    } catch (err) {
      console.error('Error fetching existing offers:', err);
      setExistingOffers([]);
    }
  };

  // Fetch my sales (elementos en venta) y ofertas recibidas
  const fetchMySales = async () => {
    if (!selectedLeague) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Buscar elementos que el usuario tiene en venta
      const salesResponse = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const salesData = await salesResponse.json();
      console.log('My sales data:', salesData);
      console.log('Sales array:', salesData.sales);
      
      // Buscar ofertas recibidas de otros jugadores
      const offersResponse = await fetch(`/api/player/received-offers?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const offersData = await offersResponse.json();
      console.log('Received offers data:', offersData);
      console.log('Offers array:', offersData.offers);
      
      // Si no hay elementos en venta pero sí hay ofertas, crear elementos virtuales para mostrar las ofertas
      if (!salesData.sales || salesData.sales.length === 0) {
        console.log('No sales found, creating virtual items from offers');
        
        // Agrupar ofertas por elemento (id + type)
        const offersByItem = {};
        (offersData.offers || []).forEach(offer => {
          const key = `${offer.id}-${offer.type}`;
          if (!offersByItem[key]) {
            offersByItem[key] = {
              id: offer.id,
              type: offer.type,
              name: offer.name,
              image_url: offer.image_url,
              team: offer.team,
              venta: Math.max(...offersData.offers.filter(o => o.id === offer.id && o.type === offer.type).map(o => o.offer_value)),
              price: Math.max(...offersData.offers.filter(o => o.id === offer.id && o.type === offer.type).map(o => o.offer_value)),
              received_offers: []
            };
          }
          offersByItem[key].received_offers.push(offer);
        });
        
        const virtualSales = Object.values(offersByItem);
        console.log('Virtual sales created:', virtualSales);
        console.log('Number of virtual sales:', virtualSales.length);
        setMySales(virtualSales);
        return;
      }
      
      // Combinar elementos en venta con ofertas recibidas y ofertas de la FIA
      const salesWithOffers = (salesData.sales || []).map(sale => {
        console.log('Processing sale:', sale);
        
        const playerOffers = (offersData.offers || []).filter(offer => {
          console.log('Checking offer:', offer, 'against sale:', sale);
          
          // Comparar IDs (pueden ser números o strings)
          const idMatch = offer.id == sale.id || offer.id == sale.driver_id || offer.id == sale.engineer_id || offer.id == sale.team_id;
          
          // Comparar tipos (pueden tener diferentes nombres)
          const typeMatch = offer.type === sale.type || 
                           offer.type === sale.card_type ||
                           (offer.type === 'pilot' && sale.type === 'driver') ||
                           (offer.type === 'driver' && sale.type === 'pilot');
          
          const match = idMatch && typeMatch;
          console.log('ID match:', idMatch, 'Type match:', typeMatch, 'Final match:', match);
          return match;
        });
        
        console.log('Filtered player offers for sale:', playerOffers);
        
        // Agregar oferta de la FIA si existe y no ha expirado
        const fiaOffer = sale.league_offer_value && sale.league_offer_expires_at && 
          new Date(sale.league_offer_expires_at) > new Date() ? {
            id: `fia-${sale.id}`,
            amount: sale.league_offer_value,
            type: 'fia',
            expires_at: sale.league_offer_expires_at,
            from: 'FIA'
          } : null;
        
        const result = {
          ...sale,
          received_offers: fiaOffer ? [fiaOffer, ...playerOffers] : playerOffers
        };
        
        console.log('Final result for sale:', result);
        return result;
      });
      
      console.log('Final salesWithOffers:', salesWithOffers);
      setMySales(salesWithOffers);
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
      // Obtener track engineers
      const response = await fetch(`/api/trackengineersbyleague/list?league_id=${selectedLeague.id}`);
      const data = await response.json();
      console.log('🔧 Track engineers recibidos:', data);
      
      // Obtener pilotos para mapear equipos (usar endpoint general que incluye track_engineer_id)
      const pilotsResponse = await fetch(`/api/pilots`);
      const pilotsData = await pilotsResponse.json();
      console.log('🏎️ Pilotos para mapear equipos:', pilotsData);
      
      // Mapear ingenieros con información de equipos
      const engineersWithTeams = (data.track_engineers || []).map(engineer => {
        // Buscar piloto que tenga este track_engineer_id
        const relatedPilot = pilotsData.pilots?.find(pilot => 
          pilot.track_engineer_id === engineer.id
        );
        
        if (relatedPilot) {
          console.log(`✅ Encontrado equipo para ${engineer.name}: ${relatedPilot.team}`);
          return {
            ...engineer,
            team: relatedPilot.team || '',
            driver_name: relatedPilot.driver_name || ''
          };
        }
        
        console.log(`❌ No se encontró equipo para ${engineer.name} (ID: ${engineer.id})`);
        return engineer;
      });
      
      setTrackEngineersByLeague(engineersWithTeams);
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
      
      // Los chief engineers ya tienen el equipo en su modelo
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
      fetchMyBids(); // Cargar pujas para el cálculo del saldo
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
          await fetchExistingOffers();
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

  // Effect to refresh bids when market updates
  useEffect(() => {
    if (selectedLeague) {
      fetchMyBids();
    }
  }, [auctions, selectedLeague]);

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
    <>
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

        {/* Player Balance Bar - Full Width */}
        <div className="w-full mt-6 mb-4">
          <Card className="p-6 bg-surface-elevated border border-border shadow-card">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Current Balance */}
              <div className="flex items-center gap-4">
                <div className="bg-accent-main/20 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-accent-main" />
                </div>
                <div>
                  <p className="text-small text-text-secondary font-medium">Saldo actual</p>
                  <p className="text-h2 font-bold text-state-success">
                    {formatCurrency(playerMoney)}
                  </p>
                </div>
              </div>

              {/* Active Bids Information */}
              {myBids.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-state-warning/20 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-state-warning" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-small text-text-secondary font-medium">Pujas activas</p>
                        <p className="text-h3 font-bold text-state-warning">
                          {myBids.length} puja{myBids.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-start">
                        <p className="text-small text-text-secondary font-medium">Valor total</p>
                        <p className="text-h3 font-bold text-accent-main">
                          {formatCurrency(myBids.reduce((total, bid) => total + Number(bid.my_bid || 0), 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block w-px h-16 bg-border"></div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-state-error/20 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-state-error" />
                    </div>
                    <div>
                      <p className="text-small text-text-secondary font-medium">Total en pujas</p>
                      <p className="text-h3 font-bold text-state-error">
                        {formatCurrency(myBids.reduce((total, bid) => total + Number(bid.my_bid || 0), 0))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="hidden sm:block w-px h-16 bg-border"></div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-state-success/20 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-state-success" />
                    </div>
                    <div>
                      <p className="text-small text-text-secondary font-medium">Saldo disponible</p>
                      <p className="text-h3 font-bold text-state-success">
                        {formatCurrency(playerMoney - myBids.reduce((total, bid) => total + Number(bid.my_bid || 0), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* No Active Bids Message */}
              {myBids.length === 0 && (
                <div className="flex items-center gap-4">
                  <div className="bg-surface p-3 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-text-secondary" />
                  </div>
                  <div>
                    <p className="text-small text-text-secondary font-medium">Sin pujas activas</p>
                    <p className="text-h3 font-bold text-state-success">
                      {formatCurrency(playerMoney)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

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
                
                // Buscar si el usuario tiene una puja en este item
                const myBid = myBids.find(bid => bid.id === item.id);
                const myBidAmount = myBid?.my_bid;
                
                // Debug para ver si el item tiene my_bid
                console.log('Item:', item.driver_name || item.name, 'num_bids:', item.num_bids, 'my_bid:', myBidAmount);
                
                // Usar num_bids directamente del item del mercado
                const totalBids = item.num_bids || 0;

                if (getItemType(item) === 'pilot') {
                  return (
                    <div key={`pilot-${item.id}`}>
                      <DriverRaceCard
                        driver={{ ...item, my_bid: myBidAmount, num_bids: totalBids }}
                        showStats={true}
                        isOwned={false}
                        leagueId={selectedLeague.id}
                        players={players}
                        showBidActions={!!myBidAmount}
                        onFichar={() => {
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

                      />
                    </div>
                  );
                } else if (getItemType(item) === 'track_engineer' || getItemType(item) === 'chief_engineer') {
                  // Render engineers using EngineerCard
                  const engineerType = getItemType(item) === 'track_engineer' ? 'track' : 'chief';
                  return (
                    <EngineerCard
                      key={`${item.type}-${item.id}`}
                      engineer={{ ...item, my_bid: myBidAmount, num_bids: totalBids }}
                      type={engineerType}
                      showStats={true}
                      isOwned={false}
                      leagueId={selectedLeague.id}
                      players={players}
                      onPujar={(eng, type) => {
                        navigate(`/puja/engineer/${type}/${eng.id}`);
                      }}
                    />
                  );
                } else if (getItemType(item) === 'team_constructor') {
                  // Render teams using TeamCard
                  return (
                    <TeamCard
                      key={`${item.type}-${item.id}`}
                      team={{ ...item, my_bid: myBidAmount, num_bids: totalBids }}
                      showStats={true}
                      isOwned={false}
                      leagueId={selectedLeague.id}
                      players={players}
                      onPujar={(teamObj) => {
                        navigate(`/puja/team/${teamObj.id}`);
                      }}
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
                        <p className="text-text-secondary">Cargando pujas y ofertas activas...</p>
                      </div>
                    ) : myBids.length === 0 && existingOffers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                        <p className="text-text-secondary">No tienes pujas ni ofertas activas</p>
                        <p className="text-small text-text-secondary mt-2">
                          Ve al mercado para hacer pujas en fichajes o ofertas a otros jugadores
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Pujas activas */}
                        {myBids.length > 0 && (
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-accent-main"></div>
                              Pujas en Subastas ({myBids.length})
                            </h3>
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
                                            variant="primary" 
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
                                            variant="danger" 
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
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ofertas activas */}
                    {existingOffers.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-state-success"></div>
                          Ofertas a Otros Jugadores ({existingOffers.length})
                        </h3>
                        <div className="space-y-4">
                          {existingOffers.map((offer) => {
                            // Determinar el tipo de elemento para mostrar la información correcta
                            const isPilot = offer.type === 'pilot';
                            const isTrackEngineer = offer.type === 'track_engineer';
                            const isChiefEngineer = offer.type === 'chief_engineer';
                            const isTeam = offer.type === 'team_constructor';
                            
                            const displayName = isPilot ? offer.driver_name : offer.name;
                            const displayTeam = offer.team;
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
                              imageUrl = getImageUrl(offer, 'pilot');
                            } else if (isTrackEngineer || isChiefEngineer) {
                              imageUrl = getImageUrl(offer, isTrackEngineer ? 'track_engineer' : 'chief_engineer');
                            } else if (isTeam) {
                              imageUrl = getImageUrl(offer, 'team_constructor');
                            }
                            
                            // Obtener color del equipo
                            const teamColor = getTeamColor(displayTeam);
                            
                            // Determinar letra del badge
                            const badgeLetter = isPilot ? 'P' : 
                                              isTrackEngineer ? 'T' : 
                                              isChiefEngineer ? 'C' : 'E';
                            
                            return (
                              <div key={offer.id} className="bg-surface p-6 rounded-lg border border-border">
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
                                    <Avatar className="w-16 h-16 border-2 border-state-success">
                                      <AvatarImage 
                                        src={imageUrl}
                                        alt={displayName}
                                      />
                                      <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                                        {displayName?.substring(0, 2) || '??'}
                                      </AvatarFallback>
                                    </Avatar>
                                    {/* Mi oferta debajo de la foto */}
                                    <p className="text-state-success font-bold text-sm text-center">
                                      Mi oferta: €{Number(offer.my_bid || offer.offer_value).toLocaleString('es-ES')}
                                    </p>
                                  </div>
                                  
                                  {/* Información y botones */}
                                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <h3 className="text-text-primary font-bold text-lg truncate" style={{lineHeight: '1.1'}}>{getShortName(displayName)}</h3>
                                      <p className="text-text-secondary text-sm truncate">{displayTeam}</p>
                                      <p className="text-state-success text-xs mt-1">{displayRole}</p>
                                      <p className="text-text-secondary text-xs mt-1">
                                        Propietario: {offer.owner_name || 'Desconocido'}
                                      </p>
                                    </div>
                                    
                                    {/* Botones */}
                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => {
                                          setSelectedBidPilot(offer);
                                          setEditBidValue(String(offer.my_bid || offer.offer_value || ''));
                                          setOpenEditBid(true);
                                        }}
                                        className="text-xs px-2 py-1 min-w-0"
                                      >
                                        <span className="truncate">Editar Oferta</span>
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="destructive" 
                                        onClick={() => {
                                          setSelectedBidPilot(offer);
                                          setOpenDeleteDialog(true);
                                        }}
                                        className="text-xs px-2 py-1 min-w-0"
                                      >
                                        <span className="truncate">Retirar Oferta</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                        <p className="text-small text-text-secondary mt-1">
                          Las ofertas recibidas aparecerán aquí cuando tengas elementos en venta
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {mySales.map((sale) => {
                          // Función para obtener nombre corto
                          const getShortName = (fullName) => {
                            if (!fullName) return 'Sin nombre';
                            const combined = fullName.replace(/[^a-zA-Z\s]/g, '').trim();
                            return combined.length <= 12 ? combined : combined.substring(0, 12);
                          };

                          // Calcular variables necesarias para la visualización
                          const getItemType = (item) => {
                            if (item.type === 'pilot' || item.driver_id) return 'pilot';
                            if (item.type === 'track_engineer' || item.track_engineer_id) return 'track_engineer';
                            if (item.type === 'chief_engineer' || item.chief_engineer_id) return 'chief_engineer';
                            if (item.type === 'team_constructor' || item.team_id) return 'team_constructor';
                            return item.type;
                          };

                          const itemType = getItemType(sale);
                          const isPilot = itemType === 'pilot';
                          const isTrackEngineer = itemType === 'track_engineer';
                          const isChiefEngineer = itemType === 'chief_engineer';
                          const isTeam = itemType === 'team_constructor';

                          // Determinar nombre de visualización
                          const displayName = sale.name || sale.driver_name || sale.engineer_name || sale.team_name || 'Sin nombre';
                          
                          // Determinar equipo
                          const displayTeam = sale.team || sale.team_name || '';
                          
                          // Determinar rol
                          const displayRole = isPilot ? 'Piloto' : 
                                            isTrackEngineer ? 'Ingeniero de Pista' : 
                                            isChiefEngineer ? 'Ingeniero Jefe' : 
                                            isTeam ? 'Constructor' : 'Elemento';

                          // Determinar letra del badge
                          const badgeLetter = isPilot ? 'P' : 
                                            isTrackEngineer ? 'T' : 
                                            isChiefEngineer ? 'C' : 'E';

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
                                      if (sale.received_offers) totalOffers += sale.received_offers.length;
                                      
                                      return totalOffers > 0 ? (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedSalePilot(sale);
                                            setOpenOffersModal(true);
                                          }}
                                          className="flex items-center gap-1 text-xs px-2 py-1 min-w-0"
                                          style={{
                                            borderColor: '#9D4EDD',
                                            color: '#9D4EDD',
                                            backgroundColor: 'transparent',
                                            borderRadius: 12,
                                            padding: '6px 12px',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#9D4EDD';
                                            e.target.style.color = '#FFFFFF';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = '#9D4EDD';
                                          }}
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
                                          style={{
                                            borderColor: '#EA5455',
                                            color: '#EA5455',
                                            backgroundColor: 'transparent',
                                            borderRadius: 12,
                                            padding: '6px 12px',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                          }}
                                          onMouseEnter={(e) => {
                                            e.target.style.backgroundColor = '#EA5455';
                                            e.target.style.color = '#FFFFFF';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.target.style.backgroundColor = 'transparent';
                                            e.target.style.color = '#EA5455';
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">Quitar</span>
                                        </Button>
                                      );
                                    })()}
                                  </div>
                                  {/* Mostrar ofertas recibidas si las hay */}
                                  {sale.received_offers && sale.received_offers.length > 0 && (
                                    <div className="mt-2">
                                      <p 
                                        className="text-xs mb-1"
                                        style={{ 
                                          color: '#9D4EDD', 
                                          fontWeight: 500,
                                          fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                        }}
                                      >
                                        Ofertas recibidas:
                                      </p>
                                      {sale.received_offers.slice(0, 2).map((offer, index) => (
                                        <div 
                                          key={index}
                                          className="flex items-center justify-between mb-1 p-2 rounded"
                                          style={{
                                            background: '#121012',
                                            border: '1px solid rgba(157, 78, 221, 0.3)',
                                            borderRadius: 8
                                          }}
                                        >
                                          <span 
                                            className="text-xs truncate"
                                            style={{ 
                                              color: '#C9A9DD',
                                              fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                            }}
                                          >
                                            {offer.bidder_name}
                                          </span>
                                          <span 
                                            className="text-xs font-bold"
                                            style={{ 
                                              color: '#28C76F',
                                              fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                            }}
                                          >
                                            {offer.offer_value?.toLocaleString()} €
                                          </span>
                                        </div>
                                      ))}
                                      {sale.received_offers.length > 2 && (
                                        <p 
                                          className="text-xs text-center"
                                          style={{ 
                                            color: '#C9A9DD',
                                            fontFamily: "'Inter', 'Segoe UI', sans-serif"
                                          }}
                                        >
                                          +{sale.received_offers.length - 2} más...
                                        </p>
                                      )}
                                    </div>
                                  )}
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
        onSubmit={selectedBidPilot && existingOffers.some(offer => offer.id === selectedBidPilot.id) ? handleEditOfferSubmit : handleEditBidSubmitMarket}
        editBidValue={editBidValue}
        setEditBidValue={setEditBidValue}
        playerMoney={playerMoney}
      />

      <DeleteBidDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        pilot={selectedBidPilot}
        onConfirm={selectedBidPilot && existingOffers.some(offer => offer.id === selectedBidPilot.id) ? handleDeleteOfferConfirmed : handleRemoveBidConfirmedMarket}
      />

      {/* Diálogo de confirmación para quitar del mercado */}
      <Dialog open={openRemoveFromMarketDialog} onOpenChange={setOpenRemoveFromMarketDialog}>
        <DialogContent className="max-w-md mx-auto bg-surface border border-border">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-text-primary text-h3 font-bold">
              Confirmar retirada
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

            return (
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={imageUrl} 
                  alt={displayName}
                  className="w-20 h-20 rounded-full border-2 border-accent-main"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-20 h-20 rounded-full border-2 border-accent-main bg-surface-elevated hidden items-center justify-center text-text-primary font-bold text-lg">
                  {displayName?.substring(0, 2) || '??'}
                </div>
                <div className="text-center">
                  <h3 className="text-text-primary font-bold text-lg">{displayName}</h3>
                  <p className="text-text-secondary text-sm">{displayTeam}</p>
                </div>
                <p className="text-accent-main font-bold text-lg text-center">
                  ¿Seguro que quieres quitar este elemento del mercado?
                </p>
                <div className="flex gap-3 w-full">
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenRemoveFromMarketDialog(false)}
                    className="flex-1 text-text-secondary border-border hover:bg-surface hover:text-text-primary"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleRemoveFromMarket}
                    className="flex-1"
                  >
                    Quitar
                  </Button>
                </div>
              </div>
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
                
                {/* Ofertas recibidas */}
                <div className="w-full space-y-4">
                  {/* Oferta de la FIA (si existe) */}
                  {selectedSalePilot.league_offer_value && (
                    <div className="bg-surface-elevated p-4 rounded-lg border border-border">
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

                  {/* Ofertas de otros jugadores */}
                  {selectedSalePilot.received_offers && selectedSalePilot.received_offers.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-accent-main font-bold text-sm text-center">OFERTAS RECIBIDAS</p>
                      {selectedSalePilot.received_offers.map((offer, index) => (
                        <div key={index} className="bg-surface-elevated p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                offer.type === 'fia' ? 'bg-yellow-500' : 'bg-accent-main'
                              }`}>
                                {offer.type === 'fia' ? (
                                  <span className="text-white font-bold text-xs">FIA</span>
                                ) : (
                                  <User className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="text-text-primary font-medium">
                                  {offer.type === 'fia' ? 'FIA' : offer.bidder_name}
                                </p>
                                <p className="text-text-secondary text-xs">
                                  {new Date(offer.type === 'fia' ? offer.expires_at : offer.received_at).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                            <p className="text-text-primary font-bold text-lg">
                              €{Number(offer.type === 'fia' ? offer.amount : offer.offer_value).toLocaleString('es-ES')}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            {offer.type === 'fia' ? (
                              <>
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
                              </>
                            ) : (
                              <>
                                <Button 
                                  variant="outline" 
                                  onClick={() => handleRejectPlayerOffer(offer.bidder_id)}
                                  className="flex-1 text-text-secondary border-border hover:bg-surface hover:text-text-primary"
                                >
                                  Rechazar
                                </Button>
                                <Button 
                                  variant="primary"
                                  onClick={() => handleAcceptPlayerOffer(offer.bidder_id, offer.offer_value)}
                                  className="flex-1 bg-state-success hover:bg-state-success hover:bg-opacity-80 text-white"
                                >
                                  Aceptar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mensaje si no hay ofertas */}
                  {(!selectedSalePilot.league_offer_value && (!selectedSalePilot.received_offers || selectedSalePilot.received_offers.length === 0)) && (
                    <div className="text-center py-8 space-y-2">
                      <p className="text-text-secondary text-body">No hay ofertas recibidas</p>
                      <p className="text-text-secondary text-small">
                        Las ofertas aparecerán aquí cuando la FIA o otros jugadores hagan ofertas
                      </p>
                    </div>
                  )}
                </div>
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
    </>
  );
}