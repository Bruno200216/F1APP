import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useLeague } from '../context/LeagueContext';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Grid from '@mui/material/Grid';
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
import Avatar from '@mui/material/Avatar'; // Importar Avatar
import CircularProgress from '@mui/material/CircularProgress';

// Función helper para determinar el tipo de elemento
const getItemType = (item) => {
  if (item.type) return item.type;
  if (item.driver_name) return 'pilot';
  if (item.track_engineer_id) return 'track_engineer';
  if (item.chief_engineer_id) return 'chief_engineer';
  if (item.team_constructor_id) return 'team_constructor';
  return 'pilot'; // fallback
};

export default function MarketPage() {
  const { selectedLeague } = useLeague();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openDrivers, setOpenDrivers] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [trackEngineers, setTrackEngineers] = useState([]); // Nuevo estado
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [driversError, setDriversError] = useState('');
  const [openFichar, setOpenFichar] = useState(false);
  const [selectedPilot, setSelectedPilot] = useState(null);
  const [playerMoney, setPlayerMoney] = useState(0);
  const [puja, setPuja] = useState('');
  const navigate = useNavigate();
  const [nextRefresh, setNextRefresh] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [players, setPlayers] = useState([]);
  const [tab, setTab] = useState(0); // 0: Mercado, 1: Mis Operaciones, 2: Histórico
  const [opsTab, setOpsTab] = useState(0); // 0: Compra, 1: Venta
  const [myBids, setMyBids] = useState([]);
  const [mySales, setMySales] = useState([]);
  const [loadingOps, setLoadingOps] = useState(false);
  const [openOffersModal, setOpenOffersModal] = useState(false);
  const [selectedSalePilot, setSelectedSalePilot] = useState(null);
  // --- Estados para menú de acciones y confirmación de borrado ---
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBidPilot, setSelectedBidPilot] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  // --- Estado para editar puja desde Mis Operaciones ---
  const [openEditBid, setOpenEditBid] = useState(false);
  const [editBidValue, setEditBidValue] = useState('');

  // Handler único para abrir el menú contextual en el market general
  const [anchorElMarket, setAnchorElMarket] = useState(null);
  const handleOpenMenuMarket = (event, pilot, myBid) => {
    setAnchorElMarket(event.currentTarget);
    setSelectedBidPilot({ ...pilot, my_bid: myBid?.my_bid });
  };
  const handleCloseMenuMarket = () => {
    setAnchorElMarket(null);
  };
  const handleEditBidClickMarket = () => {
    setEditBidValue(selectedBidPilot?.my_bid ? String(selectedBidPilot.my_bid) : '');
    setOpenEditBid(true);
    setAnchorElMarket(null);
  };
  const handleDeleteBidClickMarket = () => {
    setOpenDeleteDialog(true);
    setAnchorElMarket(null);
  };

  // --- BLOQUE TEMPORAL PARA CREAR LA CLAVE 'user' EN LOCALSTORAGE SI NO EXISTE ---
  if (!localStorage.getItem('user') && localStorage.getItem('player_id') && localStorage.getItem('token')) {
    localStorage.setItem('user', JSON.stringify({ id: Number(localStorage.getItem('player_id')), token: localStorage.getItem('token') }));
    console.log('Clave user creada automáticamente en localStorage');
  }

  // Obtener jugadores de la liga
  const fetchPlayers = async () => {
    if (!selectedLeague) return;
    try {
      const res = await fetch(`/api/leagues/${selectedLeague.id}/classification`);
      const data = await res.json();
      if (data.classification) {
        setPlayers(data.classification.map(p => ({ id: Number(p.player_id), name: p.name })));
      }
    } catch (err) {
      setPlayers([]);
    }
  };

  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    setDriversError('');
    try {
      const res = await fetch('/api/pilots');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando pilotos');
      setDrivers(data.pilots || []);
      setTrackEngineers(data.track_engineers || []); // Guardar ingenieros
    } catch (err) {
      setDriversError('Error cargando pilotos: ' + err.message);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const fetchMarketPilots = async () => {
    if (!selectedLeague) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/market?league_id=${selectedLeague.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando mercado');
      setAuctions(data.market || []);
    } catch (err) {
      setError('Error cargando el mercado: ' + err.message);
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
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // --- Lógica para abrir modal de editar puja ---
  const handleEditBidClick = () => {
    if (selectedBidPilot) {
      setEditBidValue(selectedBidPilot.my_bid ? String(selectedBidPilot.my_bid) : '');
      setOpenEditBid(true);
      setAnchorEl(null);
    }
  };
  const handleCloseEditBid = () => {
    setOpenEditBid(false);
    setEditBidValue('');
  };
  // --- Lógica para enviar la edición de la puja ---
  const handleEditBidSubmit = async () => {
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
        setSnackbar({ open: true, message: 'Puja eliminada correctamente.', severity: 'success' });
        setOpenDeleteDialog(false);
        // Actualizar datos sin cambiar de página
        fetchMyBids(); // Recargar pujas activas
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al eliminar la puja', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  // Obtener el id del usuario actual
  const user = JSON.parse(localStorage.getItem('user'));
  const playerId = user?.id;

  // Fetch del saldo del usuario en la liga seleccionada
  useEffect(() => {
    const fetchMoney = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user?.id || !selectedLeague?.id) return;
        const res = await fetch(`/api/playerbyleague?player_id=${user.id}&league_id=${selectedLeague.id}`);
        const data = await res.json();
        setPlayerMoney(data.player_by_league?.money || 0);
      } catch (err) {
        setPlayerMoney(0);
      }
    };
    fetchMoney();
  }, [selectedLeague]);

  // --- Fetch de pujas activas del usuario (myBids) ---
  const fetchMyBids = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.token || !selectedLeague) {
        setMyBids([]);
        return;
      }
      const res = await fetch(`/api/my-market-bids?league_id=${selectedLeague.id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setMyBids(data.bids || []);
    } catch (err) {
      setMyBids([]);
    }
  };

  // Llamar a fetchMyBids siempre que cambie la liga o el usuario
  useEffect(() => {
    fetchMyBids();
  }, [selectedLeague, user?.token]);

  useEffect(() => {
    fetchMarketPilots(); // Llamada inicial
    fetchPlayers(); // Cargar jugadores de la liga

    const interval = setInterval(() => {
      fetchMarketPilots();
    }, 5000); // cada 5 segundos

    return () => clearInterval(interval);
  }, [selectedLeague]);

  useEffect(() => {
    const fetchNextRefresh = async () => {
      const res = await fetch('/api/market/next-refresh');
      const data = await res.json();
      setNextRefresh(data.next_refresh * 1000); // convertir a ms
    };
    fetchNextRefresh();
  }, [selectedLeague]);

  useEffect(() => {
    if (!nextRefresh) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = nextRefresh - now;
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00:00');
        fetchMarketPilots(); // Cuando llega a 0, recarga el mercado
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRefresh]);

  // Fetch de operaciones de compra/venta según el sub-tab
  useEffect(() => {
    if (tab !== 1 || !selectedLeague || !user?.token) return;
    const fetchOps = async () => {
      setLoadingOps(true);
      try {
        if (opsTab === 0) {
          await fetchMyBids(); // Reutiliza la función para mantener sincronizado
        } else {
          const res = await fetch(`/api/my-market-sales?league_id=${selectedLeague.id}`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          const data = await res.json();
          setMySales(data.sales || []);
        }
      } catch (err) {
        setMyBids([]);
        setMySales([]);
      } finally {
        setLoadingOps(false);
      }
    };
    fetchOps();
  }, [tab, opsTab, selectedLeague, user?.token]);

  // Estado para el modal de ingenieros de pista por liga
  const [openTrackEngineers, setOpenTrackEngineers] = useState(false);
  const [trackEngineersByLeague, setTrackEngineersByLeague] = useState([]);
  const [loadingTrackEngineers, setLoadingTrackEngineers] = useState(false);
  const [errorTrackEngineers, setErrorTrackEngineers] = useState('');

  // Estado para el modal de ingenieros jefe por liga
  const [openChiefEngineers, setOpenChiefEngineers] = useState(false);
  const [chiefEngineersByLeague, setChiefEngineersByLeague] = useState([]);
  const [loadingChiefEngineers, setLoadingChiefEngineers] = useState(false);
  const [errorChiefEngineers, setErrorChiefEngineers] = useState('');

  // Estado para el modal de equipos por liga
  const [openTeamConstructors, setOpenTeamConstructors] = useState(false);
  const [teamConstructorsByLeague, setTeamConstructorsByLeague] = useState([]);
  const [loadingTeamConstructors, setLoadingTeamConstructors] = useState(false);
  const [errorTeamConstructors, setErrorTeamConstructors] = useState('');

  const handleOpenTrackEngineers = async () => {
    if (!selectedLeague) return;
    setOpenTrackEngineers(true);
    setLoadingTrackEngineers(true);
    setErrorTrackEngineers('');
    try {
      const res = await fetch(`/api/trackengineersbyleague?league_id=${selectedLeague.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando ingenieros de pista');
      setTrackEngineersByLeague(data.track_engineers || []);
    } catch (err) {
      setErrorTrackEngineers('Error cargando ingenieros de pista: ' + err.message);
      setTrackEngineersByLeague([]);
    } finally {
      setLoadingTrackEngineers(false);
    }
  };

  const handleOpenChiefEngineers = async () => {
    if (!selectedLeague) return;
    setOpenChiefEngineers(true);
    setLoadingChiefEngineers(true);
    setErrorChiefEngineers('');
    try {
      const res = await fetch(`/api/chiefengineersbyleague?league_id=${selectedLeague.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando ingenieros jefe');
      setChiefEngineersByLeague(data.chief_engineers || []);
    } catch (err) {
      setErrorChiefEngineers('Error cargando ingenieros jefe: ' + err.message);
      setChiefEngineersByLeague([]);
    } finally {
      setLoadingChiefEngineers(false);
    }
  };

  const handleOpenTeamConstructors = async () => {
    if (!selectedLeague) return;
    setOpenTeamConstructors(true);
    setLoadingTeamConstructors(true);
    setErrorTeamConstructors('');
    try {
      const res = await fetch(`/api/teamconstructorsbyleague?league_id=${selectedLeague.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando equipos');
      setTeamConstructorsByLeague(data.team_constructors || []);
    } catch (err) {
      setErrorTeamConstructors('Error cargando equipos: ' + err.message);
      setTeamConstructorsByLeague([]);
    } finally {
      setLoadingTeamConstructors(false);
    }
  };

  return (
    <Box sx={{ p: 2, background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', minHeight: '100vh' }}>
      {/* Tabs principales personalizados */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '2px solid #232323' }}>
        {['Mercado', 'Mis Ops.', 'Histórico'].map((label, idx) => (
          <Box
            key={label}
            onClick={() => setTab(idx)}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.5,
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              borderBottom: tab === idx ? '3px solid #E53935' : '3px solid transparent',
              transition: 'border-bottom 0.2s',
              letterSpacing: 0.5,
              background: 'none',
              opacity: 1
            }}
          >
            {label}
          </Box>
        ))}
      </Box>
      {/* Contenido de cada tab */}
      {tab === 0 && (
        <React.Fragment>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                background: 'linear-gradient(45deg, #DC0000, #FF4444)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              🏁 Mercado de Pilotos
            </Typography>
            {/* Mostrar saldo del usuario en la liga */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, background: '#181c24', borderRadius: 2, px: 2, py: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
              <Typography variant="body1" sx={{ color: '#b0b0b0', fontWeight: 600, mr: 1 }}>
                Tu saldo:
              </Typography>
              <Typography variant="h6" sx={{ color: playerMoney === 0 ? '#f44336' : '#4caf50', fontWeight: 700 }}>
                {playerMoney?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '0 €'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => { setOpenDrivers(true); fetchDrivers(); }}
                sx={{ 
                  fontWeight: 700,
                  borderColor: '#DC0000',
                  color: '#DC0000',
                  '&:hover': {
                    borderColor: '#FF4444',
                    backgroundColor: 'rgba(220, 0, 0, 0.1)'
                  }
                }}
              >
                📋 Todos los Pilotos
              </Button>
              <Button
                variant="outlined"
                color="info"
                onClick={handleOpenTrackEngineers}
                sx={{
                  fontWeight: 700,
                  borderColor: '#1976d2',
                  color: '#1976d2',
                  '&:hover': {
                    borderColor: '#42a5f5',
                    backgroundColor: 'rgba(25, 118, 210, 0.08)'
                  }
                }}
              >
                👨‍🔧 Ver ingenieros de pista en esta liga
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={handleOpenChiefEngineers}
                sx={{
                  fontWeight: 700,
                  borderColor: '#FF9800',
                  color: '#FF9800',
                  '&:hover': {
                    borderColor: '#FF5722',
                    backgroundColor: 'rgba(255, 152, 0, 0.1)'
                  }
                }}
              >
                👨‍💼 Ver ingenieros jefe en esta liga
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleOpenTeamConstructors}
                sx={{
                  fontWeight: 700,
                  borderColor: '#9C27B0',
                  color: '#9C27B0',
                  '&:hover': {
                    borderColor: '#7B1FA2',
                    backgroundColor: 'rgba(156, 39, 176, 0.08)'
                  }
                }}
              >
                🏎️ Ver equipos en esta liga
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={handleFinishAllAuctions}
                sx={{ 
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #FF9800, #FF5722)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF5722, #FF9800)'
                  }
                }}
              >
                ⚡ Finalizar Subastas
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleUpdateValues}
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #43A047, #388E3C)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #388E3C, #43A047)'
                  }
                }}
              >
                💹 Actualizar valores
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={handleGenerateFIAOffers}
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #2196F3, #1976D2)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1976D2, #2196F3)'
                  }
                }}
              >
                🏁 Generar Ofertas FIA
              </Button>
            </Box>
          </Box>

          {/* Modal de todos los pilotos */}
          <Dialog open={openDrivers} onClose={() => setOpenDrivers(false)} maxWidth="lg" fullWidth>
            <DialogTitle sx={{ background: '#1a1a1a', color: '#fff' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                🏎️ Parrilla Completa - {selectedLeague?.name}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => setOpenDrivers(false)}
                sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ background: '#0a0a0a', p: 3 }}>
              {loadingDrivers ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ color: '#fff' }}>🏁 Cargando parrilla...</Typography>
                </Box>
              ) : driversError ? (
                <Alert severity="error">{driversError}</Alert>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    {drivers.length === 0 ? (
                      <Grid item xs={12}>
                        <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                          No hay pilotos en esta liga.
                        </Typography>
                      </Grid>
                    ) : (
                      drivers.map(driver => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={driver.id}>
                          <DriverRaceCard
                            driver={driver}
                            showStats={true}
                            isOwned={driver.owner_id && driver.owner_id > 0}
                            leagueId={selectedLeague.id}
                            clausula={driver.clausula || ''}
                          />
                        </Grid>
                      ))
                    )}
                  </Grid>
                  {/* Ingenieros de pista */}
                  <Typography variant="h6" sx={{ color: '#FFD600', fontWeight: 700, mb: 2, mt: 2 }}>
                    👨‍🔧 Ingenieros de Pista
                  </Typography>
                  <Grid container spacing={2}>
                    {trackEngineers.length === 0 ? (
                      <Grid item xs={12}>
                        <Typography sx={{ color: '#fff', textAlign: 'center', py: 2 }}>
                          No hay ingenieros de pista registrados.
                        </Typography>
                      </Grid>
                    ) : (
                      trackEngineers.map(engineer => {
                        // Copiar el estilo de DriverRaceCard pero adaptado
                        // Buscar color de equipo
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
                        const teamColor = teamColors[engineer.team] || { primary: '#666666', secondary: '#444444' };
                        return (
                          <Grid item xs={12} sm={6} md={4} lg={3} key={engineer.id}>
                            <Box
                              sx={{
                                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                                border: `2px solid ${teamColor.primary}`,
                                borderRadius: 3,
                                p: 2,
                                position: 'relative',
                                overflow: 'hidden',
                                minHeight: 140,
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: `0 8px 25px rgba(54,113,198,0.3)`,
                                  borderColor: teamColor.secondary,
                                },
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  height: '3px',
                                  background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar
                                 src={engineer.image_url ? `/images/ingenierosdepista/${engineer.image_url}` : ''}
                                  alt={engineer.name}
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    mr: 2,
                                    border: `3px solid ${teamColor.primary}`,
                                    boxShadow: `0 4px 12px rgba(54,113,198,0.4)`
                                  }}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)', mb: 0.5 }}>
                                    {engineer.name}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: teamColor.primary, fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {engineer.team}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                                    Piloto: {engineer.pilot_name}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                                    Valor:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#4CAF50', fontSize: '0.9rem' }}>
                                    {(engineer.value ?? 0).toLocaleString()} €
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                                    Piloto ID:
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#FFD600', fontSize: '0.9rem' }}>
                                    {engineer.pilot_id}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: '2px',
                                  background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
                                  opacity: 0.7
                                }}
                              />
                            </Box>
                          </Grid>
                        );
                      })
                    )}
                  </Grid>
                </>
              )}
            </DialogContent>
          </Dialog>

          {loading && null}
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {auctions.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#fff', fontSize: '1.2rem' }}>
                🏁 No hay pilotos en subasta actualmente
              </Typography>
              <Typography sx={{ color: '#b0b0b0', mt: 1 }}>
                Los pilotos aparecerán automáticamente o puedes finalizar las subastas existentes
              </Typography>
            </Box>
          )}

          {auctions.length > 0 && (
            <Box>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 3, 
                  color: '#fff', 
                  fontWeight: 700,
                  textAlign: 'center',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                🏆 Elementos en el Mercado
              </Typography>
              <Grid container spacing={2}>
                {auctions.map(item => {
                  // Buscar si el usuario tiene una puja activa en este elemento (solo para pilotos)
                  const myBid = item.type === 'pilot' ? myBids.find(b => b.id === item.id) : null;
                  
                  if (item.type === 'pilot') {
                    // Renderizar piloto como antes
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={`pilot-${item.id}`}>
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
                              setSelectedPilot(item);
                              setOpenFichar(true);
                              setPuja('');
                            }
                          }}
                          bidActionsButton={myBid ? (
                            <Button
                              variant="contained"
                              color="error"
                              sx={{ fontWeight: 700 }}
                              onClick={e => {
                                e.stopPropagation();
                                setAnchorElMarket(e.currentTarget);
                                setSelectedBidPilot({ ...item, my_bid: myBid?.my_bid });
                              }}
                            >
                              ACCIONES
                            </Button>
                          ) : undefined}
                        />
                      </Grid>
                    );
                  } else {
                    // Renderizar otros tipos de elementos (ingenieros, equipos)
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
                    const teamColor = teamColors[item.team] || { primary: '#666666', secondary: '#444444' };
                    
                    const typeLabels = {
                      'track_engineer': '👨‍🔧',
                      'chief_engineer': '👨‍💼',
                      'team_constructor': '🏎️'
                    };
                    
                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={`${item.type}-${item.id}`}>
                        <Box
                          sx={{
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                            border: `2px solid ${teamColor.primary}`,
                            borderRadius: 3,
                            p: 2,
                            position: 'relative',
                            overflow: 'hidden',
                            minHeight: 160,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 8px 25px rgba(54,113,198,0.3)`,
                              borderColor: teamColor.secondary,
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '3px',
                              background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar
                              src={item.image_url ? (
                                item.type === 'track_engineer' ? `/images/ingenierosdepista/${item.image_url}` :
                                item.type === 'chief_engineer' ? `/images/ingenierosdepista/${item.image_url}` :
                                `/images/equipos/${item.image_url}`
                              ) : ''}
                              alt={item.name}
                              sx={{
                                width: 50,
                                height: 50,
                                mr: 2,
                                border: `3px solid ${teamColor.primary}`,
                                boxShadow: `0 4px 12px rgba(54,113,198,0.4)`
                              }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                  {item.name}
                                </Typography>
                                {(item.type === 'track_engineer' || item.type === 'chief_engineer') && (
                                  <Box
                                    sx={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: '50%',
                                      border: `2px solid ${teamColor.primary}`,
                                      background: '#000',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: teamColor.primary,
                                      boxShadow: `0 2px 4px rgba(${teamColor.primary}, 0.3)`
                                    }}
                                  >
                                    {item.type === 'track_engineer' ? 'T' : 'C'}
                                  </Box>
                                )}
                              </Box>
                              <Typography variant="body2" sx={{ color: teamColor.primary, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {item.type === 'team_constructor' ? 'EQUIPO CONSTRUCTOR' : (item.team || 'Sin equipo')}
                              </Typography>
                              {item.type === 'track_engineer' && item.pilot_name && (
                                <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.75rem' }}>
                                  Piloto: {item.pilot_name}
                                </Typography>
                              )}
                              {item.type === 'team_constructor' && item.pilots && (
                                <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.75rem' }}>
                                  Pilotos: {item.pilots.join(', ')}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
                                Valor:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#4CAF50', fontSize: '0.9rem' }}>
                                {(item.value ?? 0).toLocaleString()} €
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                              {item.num_bids > 0 ? (
                                <Typography variant="body2" sx={{ color: '#FFD600', fontWeight: 700, fontSize: '0.8rem' }}>
                                  {item.num_bids} puja{item.num_bids !== 1 ? 's' : ''}
                                </Typography>
                              ) : (
                                <Button
                                  variant="contained"
                                  size="small"
                                  sx={{
                                    background: `linear-gradient(45deg, ${teamColor.primary}, ${teamColor.secondary})`,
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    '&:hover': {
                                      background: `linear-gradient(45deg, ${teamColor.secondary}, ${teamColor.primary})`,
                                    }
                                  }}
                                  onClick={() => {
                                    if (item.type === 'track_engineer') {
                                      navigate(`/puja/engineer/track/${item.id}`);
                                    } else if (item.type === 'chief_engineer') {
                                      navigate(`/puja/engineer/chief/${item.id}`);
                                    } else if (item.type === 'team_constructor') {
                                      navigate(`/puja/team/${item.id}`);
                                    } else {
                                      setSelectedPilot(item);
                                      setOpenFichar(true);
                                      setPuja('');
                                    }
                                  }}
                                >
                                  Fichar
                                </Button>
                              )}
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: '2px',
                              background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
                              opacity: 0.7
                            }}
                          />
                        </Box>
                      </Grid>
                    );
                  }
                })}
              </Grid>
            </Box>
          )}

          {/* Modal de Fichar/Puja */}
          <Dialog open={openFichar} onClose={() => setOpenFichar(false)} maxWidth="xs" fullWidth>
            {selectedPilot && (
              <>
                <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
                  Puja por {selectedPilot.driver_name || selectedPilot.name}
                </DialogTitle>
                <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                    <img
                      src={`/images/${selectedPilot.image_url}`}
                      alt={selectedPilot.driver_name || selectedPilot.name}
                      style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16 }}
                    />
                    <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                      Valor de mercado: {selectedPilot.value?.toLocaleString()} €
                    </Typography>
                    {selectedPilot.type === 'pilot' && selectedPilot.clausula && (
                      <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                        Cláusula: {selectedPilot.clausula}
                      </Typography>
                    )}
                    {selectedPilot.type !== 'pilot' && (
                      <Typography sx={{ color: '#b0b0b0', fontWeight: 700 }}>
                        {selectedPilot.type === 'track_engineer' ? 'Ingeniero de Pista' : 
                         selectedPilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 
                         selectedPilot.type === 'team_constructor' ? 'Equipo Constructor' : 'Elemento'}
                      </Typography>
                    )}
                  </Box>
                  <TextField
                    label="Importe"
                    type="number"
                    fullWidth
                    value={puja}
                    onChange={e => setPuja(e.target.value)}
                    sx={{ mb: 2, input: { color: '#fff' } }}
                    InputProps={{ style: { color: '#fff', background: '#222' } }}
                  />
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    sx={{ fontWeight: 700, fontSize: 18 }}
                    onClick={handlePuja}
                    disabled={Number(puja) > playerMoney || Number(puja) <= 0}
                  >
                    Hacer puja
                  </Button>
                  <Typography sx={{ color: '#43A047', fontWeight: 700, mt: 3, textAlign: 'center' }}>
                    Tu saldo: {playerMoney.toLocaleString()} €
                  </Typography>
                </DialogContent>
              </>
            )}
          </Dialog>

          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
            Próximo reinicio del mercado: {timeLeft}
          </Typography>

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
        </React.Fragment>
      )}
      {tab === 1 && (
        <Box>
          {/* Sub-tabs tipo toggle personalizados */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, gap: 2 }}>
            <Button
              onClick={() => setOpsTab(0)}
              sx={{
                background: opsTab === 0 ? '#1A237E' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                borderRadius: '20px',
                px: 4,
                py: 1,
                border: opsTab === 0 ? '2px solid #1A237E' : '2px solid #232323',
                boxShadow: opsTab === 0 ? '0 2px 8px rgba(26,35,126,0.15)' : 'none',
                transition: 'all 0.2s',
                fontSize: 16
              }}
            >
              Compra
            </Button>
            <Button
              onClick={() => setOpsTab(1)}
              sx={{
                background: opsTab === 1 ? '#E53935' : 'transparent',
                color: '#fff',
                fontWeight: 700,
                borderRadius: '20px',
                px: 4,
                py: 1,
                border: opsTab === 1 ? '2px solid #E53935' : '2px solid #232323',
                boxShadow: opsTab === 1 ? '0 2px 8px rgba(229,57,53,0.15)' : 'none',
                transition: 'all 0.2s',
                fontSize: 16
              }}
            >
              Venta
            </Button>
          </Box>
          {opsTab === 0 && (
            <Box>
              {loadingOps ? (
                <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                  Cargando operaciones de compra...
                </Typography>
              ) : myBids.length === 0 ? (
                <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                  No tienes operaciones de compra activas.
                </Typography>
              ) : (
                myBids.map(pilot => (
                  <Box key={pilot.id} sx={{ mb: 2, background: '#181c24', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <img src={pilot.image_url ? `/images/${pilot.image_url}` : ''} alt={pilot.driver_name} style={{ width: 56, height: 56, borderRadius: 8, border: '2px solid #444' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 700 }}>{pilot.driver_name}</Typography>
                      <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>{pilot.team}</Typography>
                      <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>Valor: {pilot.value?.toLocaleString()} €</Typography>
                      <Typography sx={{ color: '#4CAF50', fontWeight: 700, fontSize: 15 }}>Mi puja: {pilot.my_bid ? Number(pilot.my_bid).toLocaleString() + ' €' : '-'}</Typography>
                      <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>Precio actual: {pilot.venta?.toLocaleString() ?? '-'}</Typography>
                    </Box>
                    <Button variant="contained" color="error" sx={{ fontWeight: 700 }} onClick={e => handleActionsClick(e, pilot)}>Acciones</Button>
                  </Box>
                ))
              )}
              {/* Menú contextual de acciones */}
              <BidActionsMenu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                onEdit={handleEditBidClick}
                onDelete={handleDeleteBidClick}
              />
              {/* Modal de editar puja */}
              <EditBidDialog
                open={openEditBid}
                onClose={handleCloseEditBid}
                onSubmit={handleEditBidSubmit}
                pilot={selectedBidPilot}
                editBidValue={editBidValue}
                setEditBidValue={setEditBidValue}
                playerMoney={playerMoney}
              />
              {/* Diálogo de confirmación de borrado */}
              <DeleteBidDialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleRemoveBidConfirmed}
                pilot={selectedBidPilot}
              />
            </Box>
          )}
          {opsTab === 1 && (
            <Box>
              {loadingOps ? (
                <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                  Cargando elementos en venta...
                </Typography>
              ) : mySales.length === 0 ? (
                <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                  No tienes elementos en venta actualmente.
                </Typography>
              ) : (
                mySales.map(item => {
                  const tieneOfertaLiga = item.league_offer_value && item.league_offer_expires_at && new Date(item.league_offer_expires_at) > new Date();
                  
                  // Determinar la ruta de imagen según el tipo
                  let imagePath = '';
                  if (item.type === 'track_engineer' || item.type === 'chief_engineer') {
                    imagePath = item.image_url ? `/images/ingenierosdepista/${item.image_url}` : '';
                  } else {
                    imagePath = item.image_url ? `/images/${item.image_url}` : '';
                  }
                  
                  // Determinar el nombre a mostrar
                  const displayName = item.driver_name || item.name || 'Sin nombre';
                  
                  // Determinar el tipo de elemento
                  const getTypeLabel = (type) => {
                    switch(type) {
                      case 'pilot': return 'Piloto';
                      case 'track_engineer': return 'Ingeniero de Pista';
                      case 'chief_engineer': return 'Ingeniero Jefe';
                      case 'team_constructor': return 'Equipo Constructor';
                      default: return 'Elemento';
                    }
                  };
                  
                  return (
                    <Box key={item.id} sx={{ mb: 2, background: '#181c24', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <img src={imagePath} alt={displayName} style={{ width: 56, height: 56, borderRadius: 8, border: '2px solid #444' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ color: '#fff', fontWeight: 700 }}>{displayName}</Typography>
                        <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>{item.team || 'Sin equipo'}</Typography>
                        <Typography sx={{ color: '#4caf50', fontSize: 12 }}>{getTypeLabel(item.type)}</Typography>
                        <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>Valor: {item.value?.toLocaleString()} €</Typography>
                        <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>Precio de venta: {item.venta?.toLocaleString() ?? '-'}</Typography>
                        <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>Expira: {item.venta_expires_at ? new Date(item.venta_expires_at).toLocaleString() : '-'}</Typography>
                      </Box>
                      {tieneOfertaLiga ? (
                        <Button variant="contained" color="error" sx={{ fontWeight: 700 }} onClick={() => handleShowOffers(item)}>
                          Oferta (1)
                        </Button>
                      ) : (
                        <Button variant="contained" color="error" sx={{ fontWeight: 700 }}>Quitar</Button>
                      )}
                    </Box>
                  );
                })
              )}
            </Box>
          )}
        </Box>
      )}
      {tab === 2 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
            Histórico vacío por ahora
          </Typography>
        </Box>
      )}
      {/* Modal de ofertas recibidas */}
      <Dialog open={openOffersModal} onClose={() => setOpenOffersModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
          Ofertas recibidas
        </DialogTitle>
        <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
          {selectedSalePilot && (
            <>
              {/* Perfil del elemento */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {/* Determinar la ruta de imagen según el tipo */}
                {(() => {
                  let imagePath = '';
                  if (selectedSalePilot.type === 'track_engineer' || selectedSalePilot.type === 'chief_engineer') {
                    imagePath = selectedSalePilot.image_url ? `/images/ingenierosdepista/${selectedSalePilot.image_url}` : '';
                  } else {
                    imagePath = selectedSalePilot.image_url ? `/images/${selectedSalePilot.image_url}` : '';
                  }
                  return <img src={imagePath} alt={selectedSalePilot.driver_name || selectedSalePilot.name} style={{ width: 56, height: 56, borderRadius: 8, marginRight: 16 }} />;
                })()}
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 700 }}>
                    {selectedSalePilot.driver_name || selectedSalePilot.name || 'Sin nombre'}
                  </Typography>
                  <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>
                    {selectedSalePilot.team || 'Sin equipo'}
                  </Typography>
                  <Typography sx={{ color: '#4caf50', fontSize: 12 }}>
                    {selectedSalePilot.type === 'pilot' ? 'Piloto' : 
                     selectedSalePilot.type === 'track_engineer' ? 'Ingeniero de Pista' :
                     selectedSalePilot.type === 'chief_engineer' ? 'Ingeniero Jefe' : 
                     selectedSalePilot.type === 'team_constructor' ? 'Equipo Constructor' : 'Elemento'}
                  </Typography>
                  <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>Valor: {selectedSalePilot.value?.toLocaleString()} €</Typography>
                  <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>Precio: {selectedSalePilot.venta?.toLocaleString() ?? '-'}</Typography>
                  <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>Expira: {selectedSalePilot.venta_expires_at ? new Date(selectedSalePilot.venta_expires_at).toLocaleString() : '-'}</Typography>
                </Box>
              </Box>
              {/* Oferta de la FIA */}
              <Box sx={{ background: '#181c24', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography sx={{ color: '#fff', fontWeight: 700 }}>Oferta de compra de FIA</Typography>
                <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18 }}>
                  {selectedSalePilot.league_offer_value?.toLocaleString()} €
                </Typography>
                <Typography sx={{ color: '#b0b0b0', fontSize: 13 }}>
                  Expira: {selectedSalePilot.league_offer_expires_at ? new Date(selectedSalePilot.league_offer_expires_at).toLocaleString() : '-'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button variant="outlined" color="inherit" sx={{ fontWeight: 700, flex: 1 }} onClick={handleRejectLeagueOffer}>Rechazar</Button>
                  <Button variant="contained" color="error" sx={{ fontWeight: 700, flex: 1 }} onClick={handleAcceptLeagueOffer}>Aceptar</Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal de ingenieros de pista por liga */}
      <Dialog open={openTrackEngineers} onClose={() => setOpenTrackEngineers(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            👨‍🔧 Ingenieros de Pista en esta liga
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setOpenTrackEngineers(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#0a0a0a', p: 3 }}>
          {loadingTrackEngineers ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress color="info" />
            </Box>
          ) : errorTrackEngineers ? (
            <Alert severity="error">{errorTrackEngineers}</Alert>
          ) : (
            <Grid container spacing={2}>
              {trackEngineersByLeague.length === 0 ? (
                <Grid item xs={12}>
                  <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                    No hay ingenieros de pista en esta liga.
                  </Typography>
                </Grid>
              ) : (
                trackEngineersByLeague.map(engineer => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={engineer.id}>
                    <EngineerRaceCard
                      engineer={engineer}
                      type="track_engineer"
                      showStats={true}
                      leagueId={selectedLeague?.id}
                      players={players}
                      onClick={() => navigate(`/engineer/track/${engineer.id}?league_id=${selectedLeague?.id}`)}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal de ingenieros jefe por liga */}
      <Dialog open={openChiefEngineers} onClose={() => setOpenChiefEngineers(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            👨‍💼 Ingenieros Jefe en esta liga
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setOpenChiefEngineers(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#0a0a0a', p: 3 }}>
          {loadingChiefEngineers ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress color="info" />
            </Box>
          ) : errorChiefEngineers ? (
            <Alert severity="error">{errorChiefEngineers}</Alert>
          ) : (
            <Grid container spacing={2}>
              {chiefEngineersByLeague.length === 0 ? (
                <Grid item xs={12}>
                  <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                    No hay ingenieros jefe en esta liga.
                  </Typography>
                </Grid>
              ) : (
                chiefEngineersByLeague.map(engineer => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={engineer.id}>
                    <EngineerRaceCard
                      engineer={engineer}
                      type="chief_engineer"
                      showStats={true}
                      leagueId={selectedLeague?.id}
                      players={players}
                      onClick={() => navigate(`/engineer/chief/${engineer.id}?league_id=${selectedLeague?.id}`)}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal de equipos por liga */}
      <Dialog open={openTeamConstructors} onClose={() => setOpenTeamConstructors(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            🏎️ Equipos en esta liga
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setOpenTeamConstructors(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#fff' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ background: '#0a0a0a', p: 3 }}>
          {loadingTeamConstructors ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress color="info" />
            </Box>
          ) : errorTeamConstructors ? (
            <Alert severity="error">{errorTeamConstructors}</Alert>
          ) : (
            <Grid container spacing={2}>
              {teamConstructorsByLeague.length === 0 ? (
                <Grid item xs={12}>
                  <Typography sx={{ color: '#fff', textAlign: 'center', py: 4 }}>
                    No hay equipos en esta liga.
                  </Typography>
                </Grid>
              ) : (
                teamConstructorsByLeague.map(team => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={team.id}>
                    <TeamRaceCard
                      team={team}
                      showStats={true}
                      leagueId={selectedLeague?.id}
                      players={players}
                      onClick={() => navigate(`/team/${team.id}?league_id=${selectedLeague?.id}`)}
                    />
                  </Grid>
                ))
              )}
            </Grid>
          )}
        </DialogContent>
      </Dialog>
      {/* Menú contextual y diálogos SOLO para el market general */}
      {/* Eliminar el menú y los diálogos duplicados del market general y usar los componentes reutilizables con lógica unificada */}
      <BidActionsMenu
        anchorEl={tab === 0 ? anchorElMarket : anchorEl}
        open={Boolean(tab === 0 ? anchorElMarket : anchorEl)}
        onClose={tab === 0 ? handleCloseMenuMarket : handleCloseMenu}
        onEdit={tab === 0 ? handleEditBidClickMarket : handleEditBidClick}
        onDelete={tab === 0 ? handleDeleteBidClickMarket : handleDeleteBidClick}
      />
      <EditBidDialog
        open={openEditBid}
        onClose={tab === 0 ? handleCloseEditBidMarket : handleCloseEditBid}
        onSubmit={tab === 0 ? handleEditBidSubmitMarket : handleEditBidSubmit}
        pilot={selectedBidPilot}
        editBidValue={editBidValue}
        setEditBidValue={setEditBidValue}
        playerMoney={playerMoney}
      />
      <DeleteBidDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onConfirm={tab === 0 ? handleRemoveBidConfirmedMarket : handleRemoveBidConfirmed}
        pilot={selectedBidPilot}
      />
    </Box>
  );
} 