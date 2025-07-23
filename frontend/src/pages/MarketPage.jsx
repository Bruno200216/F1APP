import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { cn, formatCurrency, formatTime } from '../lib/utils';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// Icons
import { Clock, Users, Settings, TrendingUp, Search, Filter } from 'lucide-react';

// Components
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerRaceCard from '../components/EngineerRaceCard';
import TeamRaceCard from '../components/TeamRaceCard';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import ButtonGroup from '@mui/material/ButtonGroup';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import DialogActions from '@mui/material/DialogActions';
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

export default function MarketPage() {
  const { selectedLeague } = useLeague();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  // Create localStorage user key if it doesn't exist
  if (!localStorage.getItem('user') && localStorage.getItem('player_id') && localStorage.getItem('token')) {
    localStorage.setItem('user', JSON.stringify({
      id: Number(localStorage.getItem('player_id')),
      token: localStorage.getItem('token')
    }));
  }

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
        fetchAuctions();
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
      const user = JSON.parse(localStorage.getItem('user'));
      
      const itemType = getItemType(selectedBidPilot);
      
      const res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setSnackbar({ open: true, message: data.message || 'Puja actualizada', severity: 'success' });
        setOpenEditBid(false);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
        fetchMoney(); // Actualizar saldo del jugador
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al actualizar la puja', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión con el backend', severity: 'error' });
    }
  };

  // --- Handlers para el market general ---
  // Elimino los estados duplicados del market general
  // const [anchorElMarket, setAnchorElMarket] = useState(null);
  // const [selectedBidPilotMarket, setSelectedBidPilotMarket] = useState(null);
  // const [openEditBidMarket, setOpenEditBidMarket] = useState(false);
  // const [editBidValueMarket, setEditBidValueMarket] = useState('');
  // const [openDeleteDialogMarket, setOpenDeleteDialogMarket] = useState(false);

  // Handler único para abrir el menú contextual en el market general
  // const [anchorElMarket, setAnchorElMarket] = useState(null);
  // const handleOpenMenuMarket = (event, pilot, myBid) => {
  //   setAnchorElMarket(event.currentTarget);
  //   setSelectedBidPilot({ ...pilot, my_bid: myBid?.my_bid });
  // };
  // const handleCloseMenuMarket = () => {
  //   setAnchorElMarket(null);
  // };
  // const handleEditBidClickMarket = () => {
  //   setEditBidValue(selectedBidPilot?.my_bid ? String(selectedBidPilot.my_bid) : '');
  //   setOpenEditBid(true);
  //   setAnchorElMarket(null);
  // };
  // const handleDeleteBidClickMarket = () => {
  //   setOpenDeleteDialog(true);
  //   setAnchorElMarket(null);
  // };
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
      
      const res = await fetch('/api/auctions/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setSnackbar({ open: true, message: data.message || 'Puja actualizada', severity: 'success' });
        setOpenEditBid(false);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
        fetchMoney(); // Actualizar saldo del jugador
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al actualizar la puja', severity: 'error' });
      }
    } catch (err) {
      console.error('Error fetching track engineers:', err);
      setErrorTrackEngineers('Error al cargar los ingenieros de pista');
      setTrackEngineersByLeague([]);
    } finally {
      setLoadingTrackEngineers(false);
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
        setSnackbar({ open: true, message: 'Puja eliminada correctamente.', severity: 'success' });
        setOpenDeleteDialog(false);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la puja', severity: 'error' });
      }
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
      const response = await fetch(`/api/teamconstructorsbyleague?league_id=${selectedLeague.id}`);
      const data = await response.json();
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

  // Effect for fetching operations based on current tab
  useEffect(() => {
    if (currentTab !== 'operations' || !selectedLeague) return;

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
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setOpenDrivers(true);
                fetchDrivers();
              }}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Todos los Pilotos
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
              <CardTitle>Mis Operaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={opsTab.toString()} onValueChange={(val) => setOpsTab(parseInt(val))}>
                <TabsList>
                  <TabsTrigger value="0">Compras</TabsTrigger>
                  <TabsTrigger value="1">Ventas</TabsTrigger>
                </TabsList>
                <TabsContent value="0">
                  <div className="space-y-4">
                    {myBids.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-text-secondary">No tienes pujas activas</p>
                      </div>
                    ) : (
                      myBids.map((bid) => (
                        <Card key={bid.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar>
                                  <AvatarImage src={bid.image_url} alt={bid.driver_name} />
                                  <AvatarFallback>{bid.driver_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-text-primary">{bid.driver_name}</p>
                                  <p className="text-small text-text-secondary">{bid.team}</p>
                                  <p className="text-small font-medium text-accent-main">
                                    Puja: {formatCurrency(bid.my_bid)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setOpenEditBid(true)}>
                                  Editar
                                </Button>
                                <Button size="sm" variant="danger" onClick={() => setOpenDeleteDialog(true)}>
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="1">
                  <div className="space-y-4">
                    {mySales.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-text-secondary">No tienes elementos en venta</p>
                      </div>
                    ) : (
                      mySales.map((sale) => (
                        <Card key={sale.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar>
                                  <AvatarImage src={sale.image_url} alt={sale.driver_name} />
                                  <AvatarFallback>{sale.driver_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-text-primary">{sale.driver_name}</p>
                                  <p className="text-small text-text-secondary">{sale.team}</p>
                                  <p className="text-small font-medium text-state-success">
                                    Precio: {formatCurrency(sale.venta)}
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                Ver Ofertas
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
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
                        navigate(`/profile/engineer/track/${engineer.id}`);
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
                        navigate(`/profile/engineer/chief/${engineer.id}`);
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
                        navigate(`/profile/team/${team.id}`);
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
        onSubmit={() => {
          // Handle bid edit
          setOpenEditBid(false);
        }}
        editBidValue={editBidValue}
        setEditBidValue={setEditBidValue}
        playerMoney={playerMoney}
      />

      <DeleteBidDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        pilot={selectedBidPilot}
        onConfirm={() => {
          // Handle bid deletion
          setOpenDeleteDialog(false);
        }}
      />

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