import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { cn, formatNumberWithDots } from '../lib/utils';
import '../components/ui/selection-modal.css';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// Icons
import { Users, Settings, Trophy, AlertCircle, Plus, Trash2, X, ArrowLeft, ArrowRight } from 'lucide-react';

// Existing components (will be phased out)
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerRaceCard from '../components/EngineerRaceCard';
import PlayerItemActions from '../components/PlayerItemActions';
import UpgradeClausulaModal from '../components/UpgradeClausulaModal';
import TeamRaceCard from '../components/TeamRaceCard';
import EngineerActionsMenu from '../components/EngineerActionsMenu';
import TeamConstructorActionsMenu from '../components/TeamConstructorActionsMenu';

// Utilidad para evitar rutas duplicadas y limpiar prefijos incorrectos en ingenieros


// Utilidad para obtener el nombre corto (Inicial Apellido)
const getShortName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]} ${parts.slice(1).join(' ')}`;
};

// Función para obtener colores de equipo (para alineación)
const getTeamColor = (team) => {
  const teamColors = {
    'Red Bull Racing': '#1E40AF',
    'Ferrari': '#DC2626', 
    'Mercedes': '#059669',
    'McLaren': '#EA580C',
    'Aston Martin': '#065F46',
    'Alpine': '#1E40AF',
    'Williams': '#0284C7',
    'AlphaTauri': '#374151',
    'Alfa Romeo': '#7C2D12',
    'Haas': '#6B7280'
  };
  return teamColors[team] || '#640160';
};

// Función para limpiar la ruta de imagen
const cleanImageUrl = (url) => {
  if (!url) return '';
  
  // Convertir a string y normalizar separadores
  let cleanUrl = String(url).replace(/\\/g, '/');
  
  // Debug: Solo para URLs que contengan 'ingenierosdepista' para no saturar
  const isEngineerUrl = cleanUrl.includes('ingenierosdepista');
  if (isEngineerUrl) {
    console.log('🧹 cleanImageUrl input:', cleanUrl);
  }
  
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
      if (isEngineerUrl) {
        console.log('🧹 Removed prefix:', prefix, 'Result:', cleanUrl);
      }
      break; // Solo eliminar el primer prefijo encontrado
    }
  }
  
  if (isEngineerUrl) {
    console.log('🧹 cleanImageUrl output:', cleanUrl);
  }
  
  return cleanUrl;
};

// Función para obtener la ruta correcta de imagen según el tipo
const getImageUrl = (item, type) => {
  // Validar que el item no sea null o undefined
  if (!item) return '';
  
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
  
  // Debug: Solo mostrar para ingenieros para no saturar la consola
  if (type === 'track_engineer' || type === 'chief_engineer') {
    console.log('🔧 getImageUrl debug:', {
      original: imageUrl,
      cleaned: cleanUrl,
      final: finalUrl,
      type
    });
  }
  
  return finalUrl;
};

// Función para normalizar los datos de un elemento y asegurar que las imágenes tengan la ruta correcta
const normalizeItemData = (item, type) => {
  if (!item) return item;
  
  const normalizedItem = { ...item };
  
  // Obtener la URL de imagen original
  const originalImageUrl = item.image_url || item.ImageURL;
  
  if (originalImageUrl) {
    // Limpiar la URL de cualquier prefijo duplicado
    const cleanUrl = cleanImageUrl(originalImageUrl);
    
    // Debug: Solo para ingenieros
    if (type === 'track_engineer' || type === 'chief_engineer') {
      console.log('🔧 normalizeItemData:', {
        original: originalImageUrl,
        cleaned: cleanUrl,
        type
      });
    }
    
    // Asignar la URL limpia (sin prefijos, getImageUrl se encargará de agregarlos)
    normalizedItem.image_url = cleanUrl;
    normalizedItem.ImageURL = cleanUrl;
  }
  
  return normalizedItem;
};

export default function TeamPilotsPage() {
  const { selectedLeague } = useLeague();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTab, setCurrentTab] = useState('lineup');
  const navigate = useNavigate();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [openSellModal, setOpenSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [snackbarTimeout, setSnackbarTimeout] = useState(null);
  const [loadingSell, setLoadingSell] = useState(false);
  
  // Estados para el modal de subir cláusula
  const [openUpgradeClausulaModal, setOpenUpgradeClausulaModal] = useState(false);
  const [loadingUpgradeClausula, setLoadingUpgradeClausula] = useState(false);
  const [selectedUpgradeItem, setSelectedUpgradeItem] = useState(null);
  const [selectedUpgradeType, setSelectedUpgradeType] = useState('pilot');



  // Función para mostrar snackbar con timeout automático
  const showSnackbar = (message, severity = 'success') => {
    // Limpiar timeout anterior si existe
    if (snackbarTimeout) {
      clearTimeout(snackbarTimeout);
    }
    
    // Cerrar snackbar actual si está abierto
    setSnackbar({ open: false, message: '', severity: 'success' });
    
    // Mostrar nuevo snackbar
    setSnackbar({ open: true, message, severity });
    
    // Configurar timeout para cerrar automáticamente después de 3 segundos
    const timeout = setTimeout(() => {
      setSnackbar({ open: false, message: '', severity: 'success' });
      setSnackbarTimeout(null);
    }, 3000);
    
    setSnackbarTimeout(timeout);
  };
  const [selectedItemType, setSelectedItemType] = useState('pilot'); // 'pilot', 'track_engineer', 'chief_engineer', 'team_constructor'

  // Estados para las alineaciones
  const [pilotLineup, setPilotLineup] = useState({
    race: [null, null],
    qualifying: [null, null], 
    practice: [null, null]
  });

  const [teamLineup, setTeamLineup] = useState({
    team_constructor: null,
    chief_engineer: null,
    track_engineers: [null, null]
  });

  const [activeTab, setActiveTab] = useState('pilots');
  const [pointsTab, setPointsTab] = useState('pilots');
  const [savingLineup, setSavingLineup] = useState(false);
  const [loadingLineup, setLoadingLineup] = useState(false);
  
  // Estados para el modal de selección
  const [selectionModal, setSelectionModal] = useState({
    open: false,
    category: null,
    position: null,
    label: null
  });

  const [teamData, setTeamData] = useState({
    pilots: [],
    track_engineers: [],
    chief_engineers: [],
    team_constructors: []
  });

  // Estados para la información del GP en la pestaña de puntos
  const [currentGP, setCurrentGP] = useState(null);
  const [nextGP, setNextGP] = useState(null);
  const [isGPStarted, setIsGPStarted] = useState(false);
  const [loadingGP, setLoadingGP] = useState(false);
  
  // Estados para el historial de alineaciones
  const [lineupHistory, setLineupHistory] = useState([]);
  const [selectedHistoryGP, setSelectedHistoryGP] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyLineup, setHistoryLineup] = useState({
    race: [null, null],
    qualifying: [null, null],
    practice: [null, null]
  });
  const [historyTeamLineup, setHistoryTeamLineup] = useState({
    team_constructor: null,
    chief_engineer: null,
    track_engineers: [null, null]
  });
  const [elementPoints, setElementPoints] = useState({});
  const [currentPoints, setCurrentPoints] = useState({});
  
  // Estados para la selección de GP en la pestaña de puntos
  const [availableGPs, setAvailableGPs] = useState([]);
  const [selectedGP, setSelectedGP] = useState(null);
  const [loadingGPs, setLoadingGPs] = useState(false);
  
  // Estados para funcionalidad de admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminGPIndex, setAdminGPIndex] = useState('');
  const [showAdminGPSelector, setShowAdminGPSelector] = useState(false);

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

        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const teamData = await teamRes.json();
        
        if (teamData.team) {
          console.log('📊 Datos originales del equipo:', teamData.team);
          
          // Normalizar los datos para asegurar que las imágenes tengan rutas consistentes
          const normalizedPilots = (teamData.team.pilots || []).map(pilot => normalizeItemData(pilot, 'pilot'));
          const normalizedTrackEngineers = (teamData.team.track_engineers || []).map(engineer => normalizeItemData(engineer, 'track_engineer'));
          const normalizedChiefEngineers = (teamData.team.chief_engineers || []).map(engineer => normalizeItemData(engineer, 'chief_engineer'));
          const normalizedTeamConstructors = (teamData.team.team_constructors || []).map(team => normalizeItemData(team, 'team_constructor'));
          
          console.log('🔧 Ingenieros normalizados:', normalizedTrackEngineers.map(e => ({ name: e.name, image: e.image_url })));
          
          setTeamData({
            pilots: normalizedPilots,
            track_engineers: normalizedTrackEngineers,
            chief_engineers: normalizedChiefEngineers,
            team_constructors: normalizedTeamConstructors,
            money: teamData.team.money || 0,
            player_id: teamData.team.player_id,
            league_id: teamData.team.league_id,
            team_value: teamData.team.team_value || 0
          });
          setDrivers(normalizedPilots);
        } else {
          setTeamData({
            pilots: [],
            track_engineers: [],
            chief_engineers: [],
            team_constructors: [],
            money: 0,
            player_id: null,
            league_id: null,
            team_value: 0
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

  // Cargar la alineación actual cuando teamData esté disponible
  useEffect(() => {
    console.log('🔄 useEffect - Cargando alineación:', { 
      selectedLeagueId: selectedLeague?.id, 
      teamDataLength: teamData.pilots.length 
    });
    
    if (selectedLeague?.id && teamData.pilots.length > 0) {
      console.log('✅ Condiciones cumplidas, cargando alineación...');
      loadCurrentLineup();
    }
  }, [selectedLeague, teamData]);

  // Verificar si el usuario es admin (se ejecuta siempre)
  useEffect(() => {
    const userRole = localStorage.getItem('user_role');
    const isAdminUser = userRole === 'admin';
    // Temporalmente forzar admin para testing
    const forceAdmin = true; // Cambiar a false para desactivar
    setIsAdmin(isAdminUser || forceAdmin);
    console.log('🔍 Debug admin:', { userRole, isAdminUser, forceAdmin });
  }, []);

  // Obtener información del GP actual cuando se cambie a la pestaña de puntos
  useEffect(() => {
    if (currentTab === 'points' && selectedLeague?.id) {
      fetchCurrentGP();
      loadLineupHistory();
      loadAvailableGPs();
    }
  }, [currentTab, selectedLeague]);

  // Función para obtener información del GP actual
  const fetchCurrentGP = async () => {
    try {
      setLoadingGP(true);
      const token = localStorage.getItem('token');
      
      // Obtener información detallada del GP actual y próximo
      const gpStatusResponse = await fetch('/api/gp/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (gpStatusResponse.ok) {
        const gpStatus = await gpStatusResponse.json();
        
        // Obtener alineación actual
        const lineupResponse = await fetch('/api/lineup/current?league_id=' + selectedLeague.id, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (lineupResponse.ok) {
          const lineupData = await lineupResponse.json();
          
          // Establecer el GP actual y próximo
          setCurrentGP(gpStatus.current_gp);
          setNextGP(gpStatus.next_gp);
          setIsGPStarted(gpStatus.current_gp.is_started);
          
          // Si el GP actual ya comenzó, cargar puntos
          if (gpStatus.current_gp.is_started) {
            await loadCurrentPoints();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching current GP:', error);
    } finally {
      setLoadingGP(false);
    }
  };

  // Funciones de drag & drop para alineación
  const handleDragStart = (e, item, type) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ item, type }));
  };

  const handleDrop = (e, position, category) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    
    if (activeTab === 'pilots' && data.type === 'pilot') {
      // Verificar que el piloto sea del modo correcto
      if (data.item.mode.toLowerCase() !== category && data.item.mode !== category.toUpperCase()) {
        alert(`Este piloto es de ${data.item.mode}, no de ${category}`);
        return;
      }
      
      // Normalizar el item antes de agregarlo
      const normalizedItem = normalizeItemData(data.item, data.type);
      
      setPilotLineup(prev => {
        const newLineup = { ...prev };
        newLineup[category][position] = normalizedItem;
        return newLineup;
      });
    } else if (activeTab === 'team') {
      // Normalizar el item antes de agregarlo
      const normalizedItem = normalizeItemData(data.item, data.type);
      
      if (category === 'team_constructor' && data.type === 'team_constructor') {
        setTeamLineup(prev => ({ ...prev, team_constructor: normalizedItem }));
      } else if (category === 'chief_engineer' && data.type === 'chief_engineer') {
        setTeamLineup(prev => ({ ...prev, chief_engineer: normalizedItem }));
      } else if (category === 'track_engineers' && data.type === 'track_engineer') {
        setTeamLineup(prev => {
          const newLineup = { ...prev };
          newLineup.track_engineers[position] = normalizedItem;
          return newLineup;
        });
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const removeFromLineup = (category, position = null) => {
    if (activeTab === 'pilots') {
      setPilotLineup(prev => {
        const newLineup = { ...prev };
        if (position !== null) {
          newLineup[category][position] = null;
        }
        return newLineup;
      });
    } else {
      setTeamLineup(prev => {
        const newLineup = { ...prev };
        if (category === 'track_engineers' && position !== null) {
          newLineup[category][position] = null;
        } else {
          newLineup[category] = null;
        }
        return newLineup;
      });
    }
  };

  // Funciones para manejar alineaciones
  const loadCurrentLineup = async () => {
    try {
      console.log('🚀 Iniciando carga de alineación...');
      setLoadingLineup(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lineup/current?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Lineup cargada desde backend:', data);
        
        // Convertir los IDs a objetos completos
        if (data.lineup) {
          // Cargar pilotos por IDs
          const racePilots = await loadPilotsByIds(data.lineup.race_pilots || []);
          const qualifyingPilots = await loadPilotsByIds(data.lineup.qualifying_pilots || []);
          const practicePilots = await loadPilotsByIds(data.lineup.practice_pilots || []);
          
          setPilotLineup({
            race: racePilots.length > 0 ? racePilots : [null, null],
            qualifying: qualifyingPilots.length > 0 ? qualifyingPilots : [null, null],
            practice: practicePilots.length > 0 ? practicePilots : [null, null]
          });
          
          // Cargar equipo por ID
          const teamConstructor = data.lineup.team_constructor_id ? 
            await loadTeamConstructorById(data.lineup.team_constructor_id) : null;
          
          // Cargar ingeniero jefe por ID
          const chiefEngineer = data.lineup.chief_engineer_id ? 
            await loadChiefEngineerById(data.lineup.chief_engineer_id) : null;
          
          // Cargar ingenieros de pista por IDs
          const trackEngineers = await loadTrackEngineersByIds(data.lineup.track_engineers || []);
          
          setTeamLineup({
            team_constructor: teamConstructor,
            chief_engineer: chiefEngineer,
            track_engineers: trackEngineers.length > 0 ? trackEngineers : [null, null]
          });
        }
      }
    } catch (error) {
      console.error('Error loading lineup:', error);
    } finally {
      setLoadingLineup(false);
    }
  };

  // Función para cargar puntos actuales de la alineación desde la tabla lineups
  const loadCurrentPoints = async () => {
    try {
      const token = localStorage.getItem('token');
      const playerId = localStorage.getItem('player_id');
      
      // Obtener los puntos totales de la alineación desde la tabla lineups
      const response = await fetch(`/api/lineup/points?player_id=${playerId}&league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Los puntos totales vienen en data.lineup_points
        const totalPoints = data.lineup_points || 0;
        
        // Crear un objeto con los puntos totales para mostrar en la UI
        const points = {
          total: totalPoints,
          gp_index: data.gp_index,
          gp_name: data.gp_name,
          gp_country: data.gp_country,
          gp_date: data.gp_date,
          gp_flag: data.gp_flag,
          has_lineup: data.has_lineup
        };
        
        setCurrentPoints(points);
      } else {
        console.error('Error loading lineup points:', response.status);
        setCurrentPoints({ total: 0 });
      }
    } catch (error) {
      console.error('Error loading current points:', error);
      setCurrentPoints({ total: 0 });
    }
  };

  // Cargar todos los GPs que ya han empezado
  const loadAvailableGPs = async () => {
    try {
      setLoadingGPs(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gp/started', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableGPs(data.gps || []);
        
        // Seleccionar el GP más reciente por defecto
        if (data.gps && data.gps.length > 0) {
          setSelectedGP(data.gps[0]);
          await loadCurrentPointsForGP(data.gps[0].gp_index);
        }
      }
    } catch (error) {
      console.error('Error loading available GPs:', error);
    } finally {
      setLoadingGPs(false);
    }
  };

  // Cargar puntos para un GP específico
  const loadCurrentPointsForGP = async (gpIndex) => {
    try {
      console.log('🔍 Cargando puntos para GP:', gpIndex);
      const token = localStorage.getItem('token');
      const playerId = localStorage.getItem('player_id');
      
      const response = await fetch(`/api/lineup/points?player_id=${playerId}&league_id=${selectedLeague.id}&gp_index=${gpIndex}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Datos recibidos de puntos:', data);
        const totalPoints = data.lineup_points || 0;
        
        const points = {
          total: totalPoints,
          gp_index: data.gp_index,
          gp_name: data.gp_name,
          gp_country: data.gp_country,
          gp_date: data.gp_date,
          gp_flag: data.gp_flag,
          has_lineup: data.has_lineup
        };
        
        console.log('🔍 Puntos procesados:', points);
        setCurrentPoints(points);
        
        // Cargar puntos individuales de elementos si hay alineación
        if (data.has_lineup) {
          // Buscar la alineación correspondiente en el historial
          let lineupData = lineupHistory.find(l => l.gp_index === gpIndex);
          
          // Si no hay historial cargado, cargarlo primero
          if (!lineupData && lineupHistory.length === 0) {
            console.log('🔍 Cargando historial de alineaciones...');
            await loadLineupHistory();
            // Esperar un poco para que el estado se actualice
            await new Promise(resolve => setTimeout(resolve, 100));
            lineupData = lineupHistory.find(l => l.gp_index === gpIndex);
          }
          
          if (lineupData) {
            console.log('🔍 Cargando alineación para GP:', gpIndex);
            console.log('🔍 LineupData encontrado:', lineupData);
            setSelectedHistoryGP(lineupData);
            await loadHistoryLineup(lineupData);
            console.log('🔍 Cargando puntos individuales para GP:', gpIndex);
            await loadElementPoints(lineupData);
            console.log('🔍 Estado después de cargar - selectedHistoryGP:', selectedHistoryGP);
          } else {
            console.log('❌ No se encontró alineación para GP:', gpIndex);
            // Intentar cargar directamente desde el endpoint de history
            console.log('🔍 Intentando cargar alineación directamente...');
            const historyResponse = await fetch(`/api/lineup/history?league_id=${selectedLeague.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              const lineups = historyData.lineups || historyData.history || [];
              const directLineupData = lineups.find(l => l.gp_index === gpIndex);
              if (directLineupData) {
                console.log('🔍 Alineación encontrada directamente:', directLineupData);
                setSelectedHistoryGP(directLineupData);
                await loadHistoryLineup(directLineupData);
                await loadElementPoints(directLineupData);
              } else {
                console.log('❌ No se encontró alineación directamente para GP:', gpIndex);
              }
            }
          }
        }
      } else {
        console.error('Error loading lineup points:', response.status);
        setCurrentPoints({ total: 0 });
      }
    } catch (error) {
      console.error('Error loading current points:', error);
      setCurrentPoints({ total: 0 });
    }
  };

  // Cargar historial de alineaciones
  const loadLineupHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lineup/history?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Datos de historial recibidos:', data);
        const lineups = data.lineups || data.history || [];
        setLineupHistory(lineups);
        
        // Seleccionar el GP más reciente por defecto
        if (lineups.length > 0) {
          console.log('🔍 Estableciendo GP seleccionado:', lineups[0]);
          setSelectedHistoryGP(lineups[0]);
          await loadHistoryLineup(lineups[0]);
        }
      }
    } catch (error) {
      console.error('Error loading lineup history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cargar alineación de un GP específico del historial
  const loadHistoryLineup = async (gpData) => {
    try {
      // Cargar pilotos de carrera
      if (gpData.race_pilots && gpData.race_pilots.length > 0) {
        const racePilots = await loadPilotsByIds(gpData.race_pilots);
        setHistoryLineup(prev => ({
          ...prev,
          race: racePilots
        }));
      }

      // Cargar pilotos de clasificación
      if (gpData.qualifying_pilots && gpData.qualifying_pilots.length > 0) {
        const qualifyingPilots = await loadPilotsByIds(gpData.qualifying_pilots);
        setHistoryLineup(prev => ({
          ...prev,
          qualifying: qualifyingPilots
        }));
      }

      // Cargar pilotos de práctica
      if (gpData.practice_pilots && gpData.practice_pilots.length > 0) {
        const practicePilots = await loadPilotsByIds(gpData.practice_pilots);
        setHistoryLineup(prev => ({
          ...prev,
          practice: practicePilots
        }));
      }

      // Cargar equipo constructor
      if (gpData.team_constructor_id) {
        const teamConstructor = await loadTeamConstructorById(gpData.team_constructor_id);
        setHistoryTeamLineup(prev => ({
          ...prev,
          team_constructor: teamConstructor
        }));
      }

      // Cargar ingeniero jefe
      if (gpData.chief_engineer_id) {
        const chiefEngineer = await loadChiefEngineerById(gpData.chief_engineer_id);
        setHistoryTeamLineup(prev => ({
          ...prev,
          chief_engineer: chiefEngineer
        }));
      }

      // Cargar ingenieros de pista
      if (gpData.track_engineers && gpData.track_engineers.length > 0) {
        const trackEngineers = await loadTrackEngineersByIds(gpData.track_engineers);
        setHistoryTeamLineup(prev => ({
          ...prev,
          track_engineers: trackEngineers
        }));
      }

      // Cargar puntos de todos los elementos
      await loadElementPoints(gpData);
    } catch (error) {
      console.error('Error loading history lineup:', error);
    }
  };

  // Cargar puntos de elementos específicos
  const loadElementPoints = async (gpData) => {
    try {
      console.log('🚀 Iniciando loadElementPoints para GP:', gpData.gp_index);
      const token = localStorage.getItem('token');
      const points = {};

      // Cargar puntos de pilotos
      const allPilots = [
        ...(gpData.race_pilots || []),
        ...(gpData.qualifying_pilots || []),
        ...(gpData.practice_pilots || [])
      ];

      for (const pilotByLeagueId of allPilots) {
        // Encontrar el piloto base usando el ID de PilotByLeague
        const pilotByLeague = teamData.pilots.find(p => p.id === pilotByLeagueId);
        if (pilotByLeague) {
          console.log(`🔍 Cargando puntos para piloto ${pilotByLeagueId} en GP ${gpData.gp_index}`);
          const playerId = localStorage.getItem('player_id');
          const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=pilot&element_id=${pilotByLeagueId}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            points[`pilot_${pilotByLeagueId}`] = data.points;
            console.log(`✅ Piloto ${pilotByLeagueId}: ${data.points} puntos`);
          } else {
            console.log(`❌ Error cargando puntos para piloto ${pilotByLeagueId}`);
          }
        } else {
          console.log(`❌ No se encontró piloto con ID ${pilotByLeagueId}`);
        }
      }

      // Cargar puntos de equipo constructor
      if (gpData.team_constructor_id) {
        // Encontrar el team constructor base usando el ID de TeamConstructorByLeague
        const teamConstructorByLeague = teamData.team_constructors.find(t => t.id === gpData.team_constructor_id);
        if (teamConstructorByLeague) {
          console.log(`🔍 Cargando puntos para team constructor ${gpData.team_constructor_id} en GP ${gpData.gp_index}`);
          const playerId = localStorage.getItem('player_id');
          const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=team_constructor&element_id=${gpData.team_constructor_id}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            points[`team_constructor_${gpData.team_constructor_id}`] = data.points;
            console.log(`✅ Team Constructor ${gpData.team_constructor_id}: ${data.points} puntos`);
          } else {
            console.log(`❌ Error cargando puntos para team constructor ${gpData.team_constructor_id}`);
          }
        } else {
          console.log(`❌ No se encontró team constructor con ID ${gpData.team_constructor_id}`);
        }
      }

      // Cargar puntos de ingeniero jefe
      if (gpData.chief_engineer_id) {
        // Encontrar el chief engineer base usando el ID de ChiefEngineerByLeague
        const chiefEngineerByLeague = teamData.chief_engineers.find(e => e.id === gpData.chief_engineer_id);
        if (chiefEngineerByLeague) {
          console.log(`🔍 Cargando puntos para chief engineer ${gpData.chief_engineer_id} en GP ${gpData.gp_index}`);
          const playerId = localStorage.getItem('player_id');
          const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=chief_engineer&element_id=${gpData.chief_engineer_id}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            points[`chief_engineer_${gpData.chief_engineer_id}`] = data.points;
            console.log(`✅ Chief Engineer ${gpData.chief_engineer_id}: ${data.points} puntos`);
          } else {
            console.log(`❌ Error cargando puntos para chief engineer ${gpData.chief_engineer_id}`);
          }
        } else {
          console.log(`❌ No se encontró chief engineer con ID ${gpData.chief_engineer_id}`);
        }
      }

      // Cargar puntos de ingenieros de pista
      if (gpData.track_engineers) {
        for (const engineerByLeagueId of gpData.track_engineers) {
          // Encontrar el track engineer base usando el ID de TrackEngineerByLeague
          const trackEngineerByLeague = teamData.track_engineers.find(e => e.id === engineerByLeagueId);
          if (trackEngineerByLeague) {
            console.log(`🔍 Cargando puntos para track engineer ${engineerByLeagueId} en GP ${gpData.gp_index}`);
            const playerId = localStorage.getItem('player_id');
            const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=track_engineer&element_id=${engineerByLeagueId}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.ok) {
              const data = await response.json();
              points[`track_engineer_${engineerByLeagueId}`] = data.points;
              console.log(`✅ Track Engineer ${engineerByLeagueId}: ${data.points} puntos`);
            } else {
              console.log(`❌ Error cargando puntos para track engineer ${engineerByLeagueId}`);
            }
          } else {
            console.log(`❌ No se encontró track engineer con ID ${engineerByLeagueId}`);
          }
        }
      }

      console.log('📊 ElementPoints cargados:', points);
      setElementPoints(points);
    } catch (error) {
      console.error('Error loading element points:', error);
    }
  };

  // Funciones auxiliares para cargar elementos por ID
  const loadPilotsByIds = async (pilotIds) => {
    if (!pilotIds || pilotIds.length === 0) return [];
    
    console.log('🔄 Cargando pilotos por IDs:', pilotIds);
    const pilots = [];
    for (const pilotId of pilotIds) {
      const pilot = teamData.pilots.find(p => p.id === pilotId);
      if (pilot) {
        const normalizedPilot = normalizeItemData(pilot, 'pilot');
        pilots.push(normalizedPilot);
        console.log('✅ Piloto cargado:', { id: pilotId, name: pilot.driver_name, image: normalizedPilot.image_url });
      } else {
        console.log('❌ Piloto no encontrado:', pilotId);
      }
    }
    console.log('📊 Total pilotos cargados:', pilots.length);
    return pilots;
  };

  const loadTeamConstructorById = async (teamId) => {
    if (!teamId) return null;
    const team = teamData.team_constructors.find(t => t.id === teamId);
    return team ? normalizeItemData(team, 'team_constructor') : null;
  };

  const loadChiefEngineerById = async (engineerId) => {
    if (!engineerId) return null;
    const engineer = teamData.chief_engineers.find(e => e.id === engineerId);
    return engineer ? normalizeItemData(engineer, 'chief_engineer') : null;
  };

  const loadTrackEngineersByIds = async (engineerIds) => {
    if (!engineerIds || engineerIds.length === 0) return [];
    
    console.log('🔄 Cargando ingenieros de pista por IDs:', engineerIds);
    const engineers = [];
    for (const engineerId of engineerIds) {
      const engineer = teamData.track_engineers.find(e => e.id === engineerId);
      if (engineer) {
        const normalizedEngineer = normalizeItemData(engineer, 'track_engineer');
        engineers.push(normalizedEngineer);
        console.log('✅ Ingeniero cargado:', { id: engineerId, name: engineer.name, image: normalizedEngineer.image_url });
      } else {
        console.log('❌ Ingeniero no encontrado:', engineerId);
      }
    }
    console.log('📊 Total ingenieros cargados:', engineers.length);
    return engineers;
  };

  // Funciones para verificar si un elemento está alineado
  const isPilotAligned = (pilot) => {
    if (!pilot) return false;
    
    // Verificar en todas las categorías de pilotos
    const allPilots = [
      ...pilotLineup.race.filter(p => p !== null),
      ...pilotLineup.qualifying.filter(p => p !== null),
      ...pilotLineup.practice.filter(p => p !== null)
    ];
    
    return allPilots.some(alignedPilot => alignedPilot.id === pilot.id);
  };

  const isTeamConstructorAligned = (team) => {
    if (!team || !teamLineup.team_constructor) return false;
    return teamLineup.team_constructor.id === team.id;
  };

  const isChiefEngineerAligned = (engineer) => {
    if (!engineer || !teamLineup.chief_engineer) return false;
    return teamLineup.chief_engineer.id === engineer.id;
  };

  const isTrackEngineerAligned = (engineer) => {
    if (!engineer) return false;
    
    const alignedEngineers = teamLineup.track_engineers.filter(e => e !== null);
    return alignedEngineers.some(alignedEngineer => alignedEngineer.id === engineer.id);
  };

  const saveLineup = async () => {
    try {
      setSavingLineup(true);
      const token = localStorage.getItem('token');
      
      // Debug: Ver la estructura de los datos
      console.log('🔍 Debug lineup data:', {
        team_constructor: teamLineup.team_constructor,
        chief_engineer: teamLineup.chief_engineer,
        track_engineers: teamLineup.track_engineers
      });

      // Debug: Ver todos los campos disponibles
      if (teamLineup.chief_engineer) {
        console.log('🔍 Chief Engineer fields:', Object.keys(teamLineup.chief_engineer));
        console.log('🔍 Chief Engineer full object:', teamLineup.chief_engineer);
      }
      if (teamLineup.team_constructor) {
        console.log('🔍 Team Constructor fields:', Object.keys(teamLineup.team_constructor));
        console.log('🔍 Team Constructor full object:', teamLineup.team_constructor);
      }
      if (teamLineup.track_engineers.length > 0 && teamLineup.track_engineers[0]) {
        console.log('🔍 Track Engineer fields:', Object.keys(teamLineup.track_engineers[0]));
        console.log('🔍 Track Engineer full object:', teamLineup.track_engineers[0]);
      }

      // Extraer solo los IDs de los objetos y validar que existan
      // NOTA: Los IDs deben ser de las tablas _by_league, no de las tablas generales
      const lineupData = {
        league_id: selectedLeague.id,
        race_pilots: pilotLineup.race.filter(p => p !== null).map(p => p.id),
        qualifying_pilots: pilotLineup.qualifying.filter(p => p !== null).map(p => p.id),
        practice_pilots: pilotLineup.practice.filter(p => p !== null).map(p => p.id),
        team_constructor_id: teamLineup.team_constructor?.id || null,
        chief_engineer_id: teamLineup.chief_engineer?.id || null,
        track_engineers: teamLineup.track_engineers.filter(e => e !== null).map(e => e.id)
      };

      // Validar que los IDs no sean 0 o undefined
      if (lineupData.chief_engineer_id === 0 || lineupData.chief_engineer_id === undefined) {
        lineupData.chief_engineer_id = null;
      }
      if (lineupData.team_constructor_id === 0 || lineupData.team_constructor_id === undefined) {
        lineupData.team_constructor_id = null;
      }

      // Si es admin y está activado el selector, validar que se haya ingresado un GP index
      if (isAdmin && showAdminGPSelector) {
        if (!adminGPIndex || adminGPIndex.trim() === '') {
          showSnackbar('Debes ingresar un GP Index para guardar la alineación', 'error');
          setSavingLineup(false);
          return;
        }
        lineupData.gp_index = parseInt(adminGPIndex);
      }

      console.log('💾 Guardando alineación:', lineupData);

      const response = await fetch('/api/lineup/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(lineupData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Mostrar mensaje específico según el GP al que se guardó
        if (result.is_next_gp) {
          showSnackbar(`Alineación guardada para ${result.gp_name} (próximo GP)`, 'success');
        } else {
          showSnackbar(`Alineación guardada para ${result.gp_name}`, 'success');
        }
        
        // Recargar datos del GP actual
        await fetchCurrentGP();
        
        // Si estamos en la pestaña de puntos, recargar también los datos de puntos
        if (currentTab === 'points') {
          await loadAvailableGPs();
          if (selectedGP) {
            await loadCurrentPointsForGP(selectedGP.gp_index);
          }
        }
      } else {
        const errorData = await response.json();
        showSnackbar(errorData.error || 'Error al guardar alineación', 'error');
      }
    } catch (error) {
      console.error('Error saving lineup:', error);
      showSnackbar('Error de conexión', 'error');
    } finally {
      setSavingLineup(false);
    }
  };

    const clearLineup = () => {
    setPilotLineup({
      race: [null, null],
      qualifying: [null, null], 
      practice: [null, null]
    });
    setTeamLineup({
      team_constructor: null,
      chief_engineer: null,
      track_engineers: [null, null]
    });
  };

  // Funciones para el modal de selección
  const openSelectionModal = (category, position, label) => {
    console.log('🚀 Abriendo modal para:', { category, position, label });
    setSelectionModal({
      open: true,
      category,
      position,
      label
    });
  };

  const closeSelectionModal = () => {
    setSelectionModal({
      open: false,
      category: null,
      position: null,
      label: null
    });
  };

  const selectItem = (item, type) => {
    const { category, position } = selectionModal;
    
    // Normalizar el item seleccionado
    const normalizedItem = normalizeItemData(item, type);
    console.log('🎯 Item normalizado:', normalizedItem);
    
    if (category === 'race' || category === 'qualifying' || category === 'practice') {
      setPilotLineup(prev => {
        const newArray = [...prev[category]];
        newArray[position] = normalizedItem;
        return {
          ...prev,
          [category]: newArray
        };
      });
    } else if (category === 'track_engineers') {
      setTeamLineup(prev => {
        const newArray = [...prev.track_engineers];
        newArray[position] = normalizedItem;
        return {
          ...prev,
          track_engineers: newArray
        };
      });
    } else {
      // Para team_constructor y chief_engineer (objetos únicos)
      setTeamLineup(prev => ({
        ...prev,
        [category]: normalizedItem
      }));
    }
    
    closeSelectionModal();
  };

  // Obtener items disponibles según el tipo de slot (excluyendo los ya alineados)
  const getAvailableItems = () => {
    const { category } = selectionModal;
    
    console.log('🔍 Buscando items para categoría:', category);
    
    switch (category) {
      case 'race':
        // Filtrar pilotos de carrera (R) que NO estén alineados
        const racePilots = teamData.pilots.filter(pilot => {
          const pilotMode = pilot.mode || pilot.session_type;
          const matches = pilotMode === 'R' || pilotMode === 'race';
          const isAligned = isPilotAligned(pilot);
          console.log(`🏁 Piloto ${pilot.driver_name}: mode=${pilotMode}, matches=${matches}, aligned=${isAligned}`);
          return matches && !isAligned;
        });
        console.log('🏁 Pilotos de carrera disponibles:', racePilots);
        return racePilots;
        
      case 'qualifying':
        // Filtrar pilotos de clasificación (Q) que NO estén alineados
        const qualyPilots = teamData.pilots.filter(pilot => {
          const pilotMode = pilot.mode || pilot.session_type;
          const matches = pilotMode === 'Q' || pilotMode === 'qualy' || pilotMode === 'qualifying';
          const isAligned = isPilotAligned(pilot);
          console.log(`⏱️ Piloto ${pilot.driver_name}: mode=${pilotMode}, matches=${matches}, aligned=${isAligned}`);
          return matches && !isAligned;
        });
        console.log('⏱️ Pilotos de clasificación disponibles:', qualyPilots);
        return qualyPilots;
        
      case 'practice':
        // Filtrar pilotos de práctica (P) que NO estén alineados
        const practicePilots = teamData.pilots.filter(pilot => {
          const pilotMode = pilot.mode || pilot.session_type;
          const matches = pilotMode === 'P' || pilotMode === 'practice';
          const isAligned = isPilotAligned(pilot);
          console.log(`🏃 Piloto ${pilot.driver_name}: mode=${pilotMode}, matches=${matches}, aligned=${isAligned}`);
          return matches && !isAligned;
        });
        console.log('🏃 Pilotos de práctica disponibles:', practicePilots);
        return practicePilots;
        
      case 'team_constructor':
        // Filtrar equipos constructores que NO estén alineados
        const availableTeams = (teamData.team_constructors || []).filter(team => {
          const isAligned = isTeamConstructorAligned(team);
          console.log(`🏎️ Equipo ${team.constructor_name}: aligned=${isAligned}`);
          return !isAligned;
        });
        console.log('🏎️ Equipos constructores disponibles:', availableTeams);
        return availableTeams;
        
      case 'chief_engineer':
        // Filtrar ingenieros jefe que NO estén alineados
        const availableChiefEngineers = (teamData.chief_engineers || []).filter(engineer => {
          const isAligned = isChiefEngineerAligned(engineer);
          console.log(`👨‍💼 Ingeniero jefe ${engineer.name}: aligned=${isAligned}`);
          return !isAligned;
        });
        console.log('👨‍💼 Ingenieros jefe disponibles:', availableChiefEngineers);
        return availableChiefEngineers;
        
      case 'track_engineers':
        // Filtrar ingenieros de pista que NO estén alineados
        const availableTrackEngineers = (teamData.track_engineers || []).filter(engineer => {
          const isAligned = isTrackEngineerAligned(engineer);
          console.log(`🔧 Ingeniero de pista ${engineer.name}: aligned=${isAligned}`);
          return !isAligned;
        });
        console.log('🔧 Ingenieros de pista disponibles:', availableTrackEngineers);
        return availableTrackEngineers;
        
      default:
        return [];
    }
  };

  const handleAddToMarket = (item, type = 'pilot') => {
    setSelectedDriver(item);
    setSelectedItemType(type);
    setSellPrice(item?.value || '');
    setOpenSellModal(true);
  };

  const handleActivateClausula = async (item, type = 'pilot') => {
    const playerId = Number(localStorage.getItem('player_id'));
    const isOwnItem = item.owner_id === playerId;
    
    if (isOwnItem) {
      // Es nuestro elemento, abrir modal para subir cláusula
      setSelectedUpgradeItem(item);
      setSelectedUpgradeType(type);
      setOpenUpgradeClausulaModal(true);
      return;
    }

    // Es de otro jugador, intentar activar cláusula
    if (!item.clausula_value || item.clausula_value <= 0) {
      showSnackbar('Este elemento no tiene cláusula disponible', 'error');
      return;
    }

    // Verificar que la cláusula haya expirado
    let clausulaDias = null;
    if (item.clausulatime || item.clausula_expires_at) {
      const expira = new Date(item.clausulatime || item.clausula_expires_at);
      const ahora = new Date();
      const diff = expira - ahora;
      if (diff > 0) {
        clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
        showSnackbar(`La cláusula aún está activa por ${clausulaDias} días más`, 'error');
        return;
      }
    }

    const confirmMessage = `¿Confirmas que quieres activar la cláusula de rescate por €${formatNumberWithDots(item.clausula_value)}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const res = await fetch(`/api/${type}/activate-clausula`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          item_id: item.id,
          league_id: selectedLeague.id,
          clausula_value: item.clausula_value
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showSnackbar('Cláusula activada correctamente', 'success');
        // Refresh team data
        const player_id = localStorage.getItem('player_id');
        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const newTeamData = await teamRes.json();
        if (newTeamData.team) {
          setTeamData({
            pilots: newTeamData.team.pilots || [],
            track_engineers: newTeamData.team.track_engineers || [],
            chief_engineers: newTeamData.team.chief_engineers || [],
            team_constructors: newTeamData.team.team_constructors || [],
            money: newTeamData.team.money || 0,
            player_id: newTeamData.team.player_id,
            league_id: newTeamData.team.league_id,
            team_value: newTeamData.team.team_value || 0
          });
        }
      } else {
        showSnackbar(data.error || 'Error al activar la cláusula', 'error');
      }
    } catch (err) {
      showSnackbar('Error de conexión', 'error');
    }
  };

  const handleUpgradeClausula = async (upgradeAmount) => {
    if (!selectedUpgradeItem || upgradeAmount <= 0) {
      showSnackbar('Datos inválidos', 'error');
      return;
    }

    setLoadingUpgradeClausula(true);
    const token = localStorage.getItem('token');
    
    try {
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const res = await fetch(`/api/${selectedUpgradeType}/upgrade-clausula`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          item_id: selectedUpgradeItem.id,
          league_id: selectedLeague.id,
          upgrade_amount: upgradeAmount
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        showSnackbar(`Cláusula subida correctamente. Nuevo valor: €${formatNumberWithDots(data.new_clausula_value)}`, 'success');
        handleCloseUpgradeClausulaModal();
        
        // Refresh team data
        const player_id = localStorage.getItem('player_id');
        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const newTeamData = await teamRes.json();
        if (newTeamData.team) {
          setTeamData({
            pilots: newTeamData.team.pilots || [],
            track_engineers: newTeamData.team.track_engineers || [],
            chief_engineers: newTeamData.team.chief_engineers || [],
            team_constructors: newTeamData.team.team_constructors || [],
            money: newTeamData.team.money || 0,
            player_id: newTeamData.team.player_id,
            league_id: newTeamData.team.league_id,
            team_value: newTeamData.team.team_value || 0
          });
        }
      } else {
        showSnackbar(data.error || 'Error al subir la cláusula', 'error');
      }
    } catch (err) {
      showSnackbar('Error de conexión', 'error');
    } finally {
      setLoadingUpgradeClausula(false);
    }
  };

  const handleCloseUpgradeClausulaModal = () => {
    setOpenUpgradeClausulaModal(false);
    setSelectedUpgradeItem(null);
    setSelectedUpgradeType('pilot');
  };

  const handleCloseSellModal = () => {
    setOpenSellModal(false);
    setSellPrice('');
    setSelectedDriver(null);
    setSelectedItemType('pilot');
  };

  const handleConfirmSell = async () => {
    if (!selectedDriver || !sellPrice || isNaN(Number(sellPrice)) || Number(sellPrice) <= 0) {
      showSnackbar('Introduce un precio válido', 'error');
      return;
    }
    
    setLoadingSell(true);
    const token = localStorage.getItem('token');
    
    try {
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      // Determinar endpoint y payload según el tipo
      let endpoint = '';
      let payload = {};
      let successMessage = '';
      
      switch(selectedItemType) {
        case 'pilot':
          endpoint = '/api/pilotbyleague/sell';
          payload = {
            pilot_by_league_id: selectedDriver.id,
            venta: Number(sellPrice)
          };
          successMessage = 'Piloto puesto a la venta';
          break;
        case 'track_engineer':
          endpoint = '/api/trackengineerbyleague/sell';
          payload = {
            track_engineer_by_league_id: selectedDriver.id,
            venta: Number(sellPrice)
          };
          successMessage = 'Ingeniero de pista puesto a la venta';
          break;
        case 'chief_engineer':
          endpoint = '/api/chiefengineerbyleague/sell';
          payload = {
            chief_engineer_by_league_id: selectedDriver.id,
            venta: Number(sellPrice)
          };
          successMessage = 'Ingeniero jefe puesto a la venta';
          break;
        case 'team_constructor':
          endpoint = '/api/teamconstructorbyleague/sell';
          payload = {
            team_constructor_by_league_id: selectedDriver.id,
            venta: Number(sellPrice)
          };
          successMessage = 'Equipo puesto a la venta';
          break;
        default:
          showSnackbar('Tipo de elemento no soportado', 'error');
          return;
      }
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      
      const text = await res.clone().text();
      const data = JSON.parse(text);
      
      if (res.ok) {
        showSnackbar(successMessage, 'success');
        handleCloseSellModal();
        // Refresh team data
        const player_id = localStorage.getItem('player_id');
        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const newTeamData = await teamRes.json();
        if (newTeamData.team) {
          setTeamData({
            pilots: newTeamData.team.pilots || [],
            track_engineers: newTeamData.team.track_engineers || [],
            chief_engineers: newTeamData.team.chief_engineers || [],
            team_constructors: newTeamData.team.team_constructors || [],
            money: newTeamData.team.money || 0,
            player_id: newTeamData.team.player_id,
            league_id: newTeamData.team.league_id,
            team_value: newTeamData.team.team_value || 0
          });
        }
      } else {
        showSnackbar(data.error || 'Error al poner a la venta', 'error');
      }
    } catch (err) {
      showSnackbar('Error de conexión', 'error');
    } finally {
      setLoadingSell(false);
    }
  };

  // Componentes de alineación
  const LineupSlot = ({ item, category, position, label }) => {
    // Determinar el tipo de elemento para la imagen
    const getItemType = (category) => {
      if (category === 'race' || category === 'qualifying' || category === 'practice') {
        return 'pilot';
      }
      return category;
    };

    return (
      <div
        className="relative"
        onDrop={(e) => handleDrop(e, position, category)}
        onDragOver={handleDragOver}
      >
        <div 
          className={`
            w-24 h-32 rounded-lg border-2 border-dashed transition-all duration-200
            ${item ? 'border-accent-main bg-surface-elevated' : 'border-border hover:border-accent-main/50'}
            flex flex-col items-center justify-center p-2 cursor-pointer
          `}
          onClick={() => !item && openSelectionModal(category, position, label)}
        >
          {item ? (
            <>
              <div className="w-16 h-16 rounded-full overflow-hidden mb-1">
                <img 
                  src={getImageUrl(item, getItemType(category))}
                  alt={item.driver_name || item.name || item.Name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="w-full h-full bg-surface flex items-center justify-center text-caption font-medium text-text-secondary"
                  style={{ display: 'none' }}
                >
                  {(item.driver_name || item.name || item.Name)?.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <p className="text-caption font-medium text-center text-text-primary leading-tight">
                {(item.driver_name || item.name || item.Name)?.length > 8 
                  ? (item.driver_name || item.name || item.Name).substring(0, 8) + '...'
                  : (item.driver_name || item.name || item.Name)}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromLineup(category, position);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-state-error rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <div className="text-center">
              <Plus className="h-6 w-6 text-text-secondary mb-1 mx-auto" />
              <p className="text-caption text-text-secondary font-medium">{label}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PlayerCard = ({ item, type }) => {
    // Verificar si el elemento está alineado
    let isAligned = false;
    switch (type) {
      case 'pilot':
        isAligned = isPilotAligned(item);
        break;
      case 'team_constructor':
        isAligned = isTeamConstructorAligned(item);
        break;
      case 'chief_engineer':
        isAligned = isChiefEngineerAligned(item);
        break;
      case 'track_engineer':
        isAligned = isTrackEngineerAligned(item);
        break;
      default:
        isAligned = false;
    }

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, item, type)}
        className={`bg-surface-elevated rounded-lg p-3 border transition-all duration-200 cursor-grab active:cursor-grabbing relative ${
          isAligned 
            ? 'border-accent-main shadow-glowAccent' 
            : 'border-border hover:border-accent-main/50'
        }`}
      >
        {/* Indicador de alineación */}
        {isAligned && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent-main rounded-full flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        )}
        
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${
            isAligned ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : ''
          }`}>
            <img 
              src={getImageUrl(item, type)}
              alt={item.driver_name || item.name || item.Name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              className="w-full h-full bg-surface flex items-center justify-center text-caption font-medium text-text-secondary"
              style={{ display: 'none' }}
            >
              {(item.driver_name || item.name || item.Name)?.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-small truncate ${
              isAligned ? 'text-accent-main' : 'text-text-primary'
            }`}>
              {item.driver_name || item.name || item.Name}
            </h4>
            <p className="text-caption text-text-secondary">
              {item.team || item.Team}
            </p>
            {type === 'pilot' && (
              <span 
                className="inline-block px-2 py-1 rounded-full text-caption font-medium mt-1"
                style={{ 
                  backgroundColor: `${getTeamColor(item.team)}20`,
                  color: getTeamColor(item.team)
                }}
              >
                {item.mode?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className={`text-small font-semibold ${
              isAligned ? 'text-accent-main' : 'text-accent-main'
            }`}>
                                €{formatNumberWithDots(item.value || item.Value || 0)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Nueva UI de alineación interactiva
  const renderF1Grid = () => (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-96">
          <TabsTrigger value="pilots" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Pilotos
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Equipo
          </TabsTrigger>
        </TabsList>

        {/* Pestaña Pilotos */}
        <TabsContent value="pilots" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Campo de Alineación */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-h3 font-semibold text-text-primary mb-6 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-accent-main" />
                    Lineup (2-2-2)
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Carrera */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Race</h3>
                      <div className="flex justify-center gap-4">
                        <LineupSlot 
                          item={pilotLineup.race[0]} 
                          category="race" 
                          position={0}
                          label="Piloto 1"
                        />
                        <LineupSlot 
                          item={pilotLineup.race[1]} 
                          category="race" 
                          position={1}
                          label="Piloto 2"
                        />
                      </div>
                    </div>

                    {/* Clasificación */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Clasification</h3>
                      <div className="flex justify-center gap-4">
                        <LineupSlot 
                          item={pilotLineup.qualifying[0]} 
                          category="qualifying" 
                          position={0}
                          label="Piloto 1"
                        />
                        <LineupSlot 
                          item={pilotLineup.qualifying[1]} 
                          category="qualifying" 
                          position={1}
                          label="Piloto 2"
                        />
                      </div>
                    </div>

                    {/* Práctica */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Practice</h3>
                      <div className="flex justify-center gap-4">
                        <LineupSlot 
                          item={pilotLineup.practice[0]} 
                          category="practice" 
                          position={0}
                          label="Piloto 1"
                        />
                        <LineupSlot 
                          item={pilotLineup.practice[1]} 
                          category="practice" 
                          position={1}
                          label="Piloto 2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Pilotos Disponibles */}
            <div>
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-h3 font-semibold text-text-primary mb-4">Pilotos Disponibles</h3>
                  <div className="space-y-3">
                    {teamData?.pilots?.map((pilot) => (
                      <PlayerCard key={pilot.id} item={pilot} type="pilot" />
                    ))}
                    {(!teamData?.pilots || teamData.pilots.length === 0) && (
                      <p className="text-text-secondary text-center py-8">
                        No tienes pilotos disponibles
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Pestaña Equipo */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Campo de Alineación */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-h3 font-semibold text-text-primary mb-6 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-accent-main" />
                    Alineación de Equipo (1-1-2)
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Constructor */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Constructor</h3>
                      <div className="flex justify-center">
                        <LineupSlot 
                          item={teamLineup.team_constructor} 
                          category="team_constructor" 
                          position={null}
                          label="Equipo"
                        />
                      </div>
                    </div>

                    {/* Chief Engineer */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Ingeniero Jefe</h3>
                      <div className="flex justify-center">
                        <LineupSlot 
                          item={teamLineup.chief_engineer} 
                          category="chief_engineer" 
                          position={null}
                          label="Ing. Jefe"
                        />
                      </div>
                    </div>

                    {/* Track Engineers */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Ingenieros de Pista</h3>
                      <div className="flex justify-center gap-4">
                        <LineupSlot 
                          item={teamLineup.track_engineers[0]} 
                          category="track_engineers" 
                          position={0}
                          label="Ing. Pista 1"
                        />
                        <LineupSlot 
                          item={teamLineup.track_engineers[1]} 
                          category="track_engineers" 
                          position={1}
                          label="Ing. Pista 2"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Staff Disponible */}
            <div className="space-y-4">
              {/* Equipos */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Equipos</h4>
                  <div className="space-y-2">
                    {teamData?.team_constructors?.map((team) => (
                      <PlayerCard key={team.id} item={team} type="team_constructor" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chief Engineers */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Ingenieros Jefe</h4>
                  <div className="space-y-2">
                    {teamData?.chief_engineers?.map((engineer) => (
                      <PlayerCard key={engineer.id} item={engineer} type="chief_engineer" />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Track Engineers */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-text-primary mb-3">Ingenieros de Pista</h4>
                  <div className="space-y-2">
                    {teamData?.track_engineers?.map((engineer) => (
                      <PlayerCard key={engineer.id} item={engineer} type="track_engineer" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Información del GP actual */}
      {currentGP && (
        <div className={`p-4 rounded-lg border ${
          isGPStarted 
            ? 'bg-yellow-50 border-yellow-200 text-yellow-800' 
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">
                {isGPStarted ? '⚠️ GP en curso' : '✅ Preparando alineación'}
              </p>
              <p className="text-sm">
                {isGPStarted 
                  ? nextGP 
                    ? `El GP ${currentGP.name} ya ha comenzado. Las alineaciones se guardarán para ${nextGP.name} (${new Date(nextGP.start_date).toLocaleDateString()})`
                    : `El GP ${currentGP.name} ya ha comenzado. No hay próximos GPs disponibles.`
                  : `Preparando alineación para ${currentGP.name} (${new Date(currentGP.start_date).toLocaleDateString()})`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Acción */}
      <div className="mt-8 space-y-4">
        <div className="flex justify-center gap-4 flex-wrap">
        <Button 
          variant="ghost" 
          className="px-8"
          onClick={clearLineup}
          disabled={savingLineup}
        >
          Limpiar Alineación
        </Button>

          <Button 
            className="px-8 border-2 border-[#9D4EDD] text-[#9D4EDD] hover:bg-[#9D4EDD] hover:text-white transition-colors duration-200"
            style={{ fontWeight: 600 }}
            onClick={saveLineup}
            disabled={savingLineup}
          >
            {savingLineup ? 'Guardando...' : 'Guardar Alineación'}
          </Button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-border justify-center">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="adminGPSelector"
                checked={showAdminGPSelector}
                onChange={(e) => setShowAdminGPSelector(e.target.checked)}
                className="w-4 h-4 text-accent-main bg-surface border-border rounded focus:ring-accent-main focus:ring-2"
              />
              <label htmlFor="adminGPSelector" className="text-text-primary font-medium">
                Admin: Seleccionar GP específico
              </label>
            </div>
            {showAdminGPSelector && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={adminGPIndex}
                  onChange={(e) => setAdminGPIndex(e.target.value)}
                  placeholder="GP Index (obligatorio)"
                  className="px-3 py-1 border border-border rounded bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-main w-36"
                  min="1"
                  required
                />
                <span className="text-text-secondary text-caption">
                  (Se guardará como alineación para este GP)
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Squad: complete team list
  const renderSquad = () => (
    <div className="space-y-6 mt-6">
      {/* Pilots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-main">
            <Trophy className="h-5 w-5" />
            PILOTOS ({teamData.pilots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData.pilots.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <p className="text-text-secondary">No tienes pilotos en tu equipo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamData.pilots.map(driver => {
                console.log('PILOT OBJ:', driver);
                const teamColor = getTeamColor(driver.team);
                // Usa la misma lógica que DriverRaceCard: pilot_id || id
                const pilotId = driver.pilot_id || driver.id;
                const badgeLetter = driver.mode ? driver.mode.toUpperCase().charAt(0) : (driver.session_type === 'practice' ? 'P' : driver.session_type === 'qualy' ? 'Q' : 'R');
                const isAligned = isPilotAligned(driver);
                return (
                  <div key={driver.id} className={`flex items-center bg-surface p-4 rounded-lg border cursor-pointer relative transition-all duration-200 ${
                    isAligned 
                      ? 'border-accent-main shadow-glowAccent' 
                      : 'border-border hover:border-accent-main/50'
                  }`} onClick={() => navigate(`/profile/${driver.pilot_id}`)}>
                    {/* Indicador de alineación */}
                    {isAligned && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-main rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Badge tipo estilo Market */}
                    <div
                      className={`flex items-center justify-center mr-3 ${
                        isAligned ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        borderRadius: '50%',
                        border: `2px solid ${teamColor.primary}`,
                        background: '#000',
                        color: teamColor.primary,
                        fontSize: 16,
                        fontWeight: 600,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                      }}
                    >
                      {badgeLetter}
                    </div>
                    <Avatar className={`w-14 h-14 mr-4 border-2 ${
                      isAligned ? 'border-accent-main ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : 'border-accent-main'
                    }`}>
                      <AvatarImage 
                        src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                        alt={driver.driver_name}
                      />
                      <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                        {driver.driver_name?.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-body truncate ${isAligned ? 'text-accent-main' : 'text-text-primary'}`} style={{lineHeight: '1.1'}}>{getShortName(driver.driver_name)}</h3>
                      <p className="text-text-secondary text-small truncate">{driver.team}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-accent-main font-bold text-body">
                        €{formatNumberWithDots(driver.value)}
                      </p>
                      {driver.clausula_value && (
                        <p className="text-state-error text-caption font-medium">
                          {driver.clausula_value}
                        </p>
                      )}
                    </div>
                    <PlayerItemActions
                      item={driver}
                      type="pilot"
                      onSell={handleAddToMarket}
                      onActivateClausula={handleActivateClausula}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Track Engineers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-main">
            <Settings className="h-5 w-5" />
            INGENIEROS DE PISTA ({teamData.track_engineers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData.track_engineers.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <p className="text-text-secondary">No tienes ingenieros de pista</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamData.track_engineers.map(engineer => {
                const imgUrl = getImageUrl(engineer, 'track_engineer');
                const teamColor = getTeamColor(engineer.team);
                const isAligned = isTrackEngineerAligned(engineer);
                return (
                  <div key={engineer.id} className={`flex items-center bg-surface p-4 rounded-lg border cursor-pointer relative transition-all duration-200 ${
                    isAligned 
                      ? 'border-accent-main shadow-glowAccent' 
                      : 'border-border hover:border-accent-main/50'
                  }`} onClick={() => navigate(`/profile/engineer/track/${engineer.id}`)}>
                    {/* Indicador de alineación */}
                    {isAligned && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-main rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Badge tipo estilo Market */}
                    <div
                      className={`flex items-center justify-center font-bold mr-3 ${
                        isAligned ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        borderRadius: '50%',
                        border: `2px solid ${teamColor.primary}`,
                        background: '#000',
                        color: teamColor.primary,
                        fontSize: 18,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                      }}
                    >
                      T
                    </div>
                    <Avatar className={`w-14 h-14 mr-4 border-2 ${
                      isAligned ? 'border-accent-main ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : 'border-accent-main'
                    }`}>
                      <AvatarImage 
                        src={imgUrl}
                        alt={engineer.name}
                      />
                      <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                        {engineer.name?.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-body truncate ${isAligned ? 'text-accent-main' : 'text-text-primary'}`} style={{lineHeight: '1.1'}}>{getShortName(engineer.name)}</h3>
                      <p className="text-text-secondary text-small truncate">{engineer.constructor_name}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-accent-main font-bold text-body">
                        €{formatNumberWithDots(engineer.value)}
                      </p>
                      {engineer.clausula_value && (
                        <p className="text-state-error text-caption font-medium">
                          {engineer.clausula_value}
                        </p>
                      )}
                    </div>
                    <PlayerItemActions
                      item={engineer}
                      type="track_engineer"
                      onSell={handleAddToMarket}
                      onActivateClausula={handleActivateClausula}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chief Engineers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-main">
            <Users className="h-5 w-5" />
            INGENIEROS JEFE ({teamData.chief_engineers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData.chief_engineers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <p className="text-text-secondary">No tienes ingenieros jefe</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamData.chief_engineers.map(engineer => {
                const imgUrl = getImageUrl(engineer, 'chief_engineer');
                const teamColor = getTeamColor(engineer.team);
                const isAligned = isChiefEngineerAligned(engineer);
                return (
                  <div key={engineer.id} className={`flex items-center bg-surface p-4 rounded-lg border mb-4 cursor-pointer relative transition-all duration-200 ${
                    isAligned 
                      ? 'border-accent-main shadow-glowAccent' 
                      : 'border-border hover:border-accent-main/50'
                  }`} onClick={() => navigate(`/profile/engineer/chief/${engineer.id}`)}>
                    {/* Indicador de alineación */}
                    {isAligned && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-main rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Badge tipo estilo Market */}
                    <div
                      className={`flex items-center justify-center font-bold mr-3 ${
                        isAligned ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        borderRadius: '50%',
                        border: `2px solid ${teamColor.primary}`,
                        background: '#000',
                        color: teamColor.primary,
                        fontSize: 18,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                      }}
                    >
                      C
                    </div>
                    <Avatar className={`w-14 h-14 mr-4 border-2 ${
                      isAligned ? 'border-accent-main ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : 'border-accent-main'
                    }`}>
                      <AvatarImage 
                        src={imgUrl}
                        alt={engineer.name}
                      />
                      <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                        {engineer.name?.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-body truncate ${isAligned ? 'text-accent-main' : 'text-text-primary'}`} style={{lineHeight: '1.1'}}>{getShortName(engineer.name)}</h3>
                      <p className="text-text-secondary text-small truncate">{engineer.constructor_name}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-accent-main font-bold text-body">
                        €{formatNumberWithDots(engineer.value)}
                      </p>
                      {engineer.clausula_value && (
                        <p className="text-state-error text-caption font-medium">
                          {engineer.clausula_value}
                        </p>
                      )}
                    </div>
                    <PlayerItemActions
                      item={engineer}
                      type="chief_engineer"
                      onSell={handleAddToMarket}
                      onActivateClausula={handleActivateClausula}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Constructors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-main">
            <Trophy className="h-5 w-5" />
            EQUIPOS ({teamData.team_constructors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamData.team_constructors.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <p className="text-text-secondary">No tienes equipos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamData.team_constructors.map(team => {
                const teamColor = getTeamColor(team.name);
                const isAligned = isTeamConstructorAligned(team);
                return (
                  <div key={team.id} className={`flex items-center bg-surface p-4 rounded-lg border cursor-pointer relative transition-all duration-200 ${
                    isAligned 
                      ? 'border-accent-main shadow-glowAccent' 
                      : 'border-border hover:border-accent-main/50'
                  }`} onClick={() => navigate(`/profile/team/${team.id}`)}>
                    {/* Indicador de alineación */}
                    {isAligned && (
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-main rounded-full flex items-center justify-center shadow-lg">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Badge tipo estilo Market */}
                    <div
                      className={`flex items-center justify-center font-bold mr-3 ${
                        isAligned ? 'ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : ''
                      }`}
                      style={{
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        borderRadius: '50%',
                        border: `2px solid ${teamColor.primary}`,
                        background: '#000',
                        color: teamColor.primary,
                        fontSize: 18,
                        boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                      }}
                    >
                      E
                    </div>
                    <Avatar className={`w-14 h-14 mr-4 border-2 ${
                      isAligned ? 'border-accent-main ring-2 ring-accent-main ring-offset-2 ring-offset-surface' : 'border-accent-main'
                    }`}>
                      <AvatarImage 
                        src={team.image_url ? `/images/equipos/${team.image_url}` : ''} 
                        alt={team.constructor_name}
                      />
                      <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                        {team.constructor_name?.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-body truncate ${isAligned ? 'text-accent-main' : 'text-text-primary'}`} style={{lineHeight: '1.1'}}>{team.constructor_name}</h3>
                      <p className="text-text-secondary text-small truncate">{team.constructor_name}</p>
                    </div>
                    <div className="text-right mr-4">
                      <p className="text-accent-main font-bold text-body">
                        €{formatNumberWithDots(team.value)}
                      </p>
                      {team.clausula_value && (
                        <p className="text-state-error text-caption font-medium">
                          {team.clausula_value}
                        </p>
                      )}
                    </div>
                    <PlayerItemActions
                      item={team}
                      type="team_constructor"
                      onSell={handleAddToMarket}
                      onActivateClausula={handleActivateClausula}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Points: Historial de alineaciones con puntos específicos
  const renderPoints = () => {
    // Si está cargando los GPs
    if (loadingGPs) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-main mx-auto mb-4"></div>
          <p className="text-text-primary">Cargando Grandes Premios...</p>
        </div>
      );
    }

    // Si no hay GPs disponibles
    if (!availableGPs || availableGPs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-16 w-16 text-text-secondary mb-4" />
          <h3 className="text-h3 font-bold text-text-primary mb-2">No hay Grandes Premios disponibles</h3>
          <p className="text-text-secondary text-center max-w-sm">
            No hay Grandes Premios que hayan comenzado aún.
          </p>
        </div>
      );
    }

      return (
      <div className="space-y-6">
        {/* Navegación entre GPs */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-subtitle font-bold text-text-primary mb-4">Seleccionar Gran Premio</h3>
          
          {/* Barra de navegación con banderas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {availableGPs.map((gp, index) => (
              <button
                key={gp.gp_index}
                onClick={async () => {
                  setSelectedGP(gp);
                  await loadCurrentPointsForGP(gp.gp_index);
                }}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200 min-w-[80px] ${
                  selectedGP?.gp_index === gp.gp_index
                    ? 'border-accent-main bg-accent-main/10'
                    : 'border-border hover:border-accent-main/50'
                }`}
              >
                {gp.flag && (
                  <img
                    src={`/images/flags/${gp.flag}`}
                    alt={gp.country}
                    className="w-8 h-5 rounded border border-border"
                  />
                )}
                <span className={`text-caption font-medium text-center ${
                  selectedGP?.gp_index === gp.gp_index
                    ? 'text-accent-main'
                    : 'text-text-secondary'
                }`}>
                  {gp.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Información del GP seleccionado */}
        {selectedGP && (
          <div className="space-y-6">
            {/* Header del GP */}
            <Card className="bg-surface border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-h3 font-bold text-text-primary mb-2">
                      {selectedGP.name}
                    </h2>
                    <p className="text-text-secondary">
                      {selectedGP.country} - {new Date(selectedGP.start_date).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-caption text-text-secondary">Total Points</p>
                    <p className="text-h2 font-bold text-accent-main">
                      {currentPoints.total || 0} pts
                    </p>
                    {!currentPoints.has_lineup && (
                      <p className="text-caption text-text-secondary mt-1">
                        Sin alineación guardada
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Alineación del GP */}
            <div className="space-y-6">
              {/* Pestañas para Pilotos e Ingenieros/Equipos */}
              <Tabs value={pointsTab} onValueChange={setPointsTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:w-96">
                  <TabsTrigger value="pilots" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Drivers
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Engineers & Teams
                  </TabsTrigger>
                </TabsList>

                {/* Pestaña Pilotos */}
                <TabsContent value="pilots">
                  <Card className="bg-surface border border-border">
                    
                <CardContent className="space-y-4">
                  {/* Pilotos de Carrera */}
                  <div>
                    <h4 className="text-small font-semibold text-text-primary mb-3">Race</h4>
                    <div className="flex justify-center gap-4">
                      {currentPoints.has_lineup ? (
                        [0, 1].map((index) => {
                          const pilotId = selectedHistoryGP?.race_pilots?.[index];
                          const pilot = pilotId ? historyLineup.race.find(p => p && p.id === pilotId) || null : null;
                          const points = pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                          console.log(`🔍 Race pilot ${index}: pilotId=${pilotId}, points=${points}, elementPoints key=pilot_${pilotId}`);
                          console.log(`🔍 selectedHistoryGP:`, selectedHistoryGP);
                          console.log(`🔍 elementPoints:`, elementPoints);
                          console.log(`🔍 historyLineup:`, historyLineup);
                          console.log(`🔍 currentPoints:`, currentPoints);
                          const getBorderColor = (points) => {
                            if (points < 0) return '#EA5455'; // Rojo (error)
                            if (points === 0) return '#6B7280'; // Gris
                            if (points > 15) return '#9D4EDD'; // Morado (accent)
                            if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                            return '#28C76F'; // Verde (success)
                          };
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                style={{
                                  background: pilot ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                  border: `2px solid ${pilot ? getBorderColor(points) : '#6B7280'}`,
                                  boxShadow: `0 0 15px ${pilot ? getBorderColor(points) : '#6B7280'}30`
                                }}
                              >
                                {pilot ? (
                                  <div className="w-full h-full flex items-center justify-center p-2">
                                    <div className="w-16 h-16 rounded-full overflow-hidden">
                                      <img
                                        src={getImageUrl(pilot, 'pilot')}
                                        alt={pilot.driver_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                      <span className="text-text-secondary text-caption font-medium"></span>
                                    </div>
                                  </div>
                                )}
                                {pilot && getPilotSynergyOverlay(pilot, index)}
                              </div>
                              <p className="text-caption font-bold text-text-primary">
                                {pilot ? `${points} pts` : '0 pts'}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        // Si no hay alineación, mostrar 2 slots vacíos
                        [0, 1].map((index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                              style={{
                                background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                border: '2px solid #6B7280',
                                boxShadow: '0 0 15px #6B728030'
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                  <span className="text-text-secondary text-caption font-medium"></span>
                                </div>
                              </div>
                            </div>
                            <p className="text-caption font-bold text-text-primary">0 pts</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pilotos de Clasificación */}
                  <div>
                    <h4 className="text-small font-semibold text-text-primary mb-3">Clasification</h4>
                    <div className="flex justify-center gap-4">
                      {currentPoints.has_lineup ? (
                        [0, 1].map((index) => {
                          const pilotId = selectedHistoryGP?.qualifying_pilots?.[index];
                          const pilot = pilotId ? historyLineup.qualifying.find(p => p && p.id === pilotId) || null : null;
                          const points = pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                          const getBorderColor = (points) => {
                            if (points < 0) return '#EA5455'; // Rojo (error)
                            if (points === 0) return '#6B7280'; // Gris
                            if (points > 15) return '#9D4EDD'; // Morado (accent)
                            if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                            return '#28C76F'; // Verde (success)
                          };
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                style={{
                                  background: pilot ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                  border: `2px solid ${pilot ? getBorderColor(points) : '#6B7280'}`,
                                  boxShadow: `0 0 15px ${pilot ? getBorderColor(points) : '#6B7280'}30`
                                }}
                              >
                                {pilot ? (
                                  <div className="w-full h-full flex items-center justify-center p-2">
                                    <div className="w-16 h-16 rounded-full overflow-hidden">
                                      <img
                                        src={getImageUrl(pilot, 'pilot')}
                                        alt={pilot.driver_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                      <span className="text-text-secondary text-caption font-medium"></span>
                                    </div>
                                  </div>
                                )}
                                {pilot && getPilotSynergyOverlay(pilot, index)}
                              </div>
                              <p className="text-caption font-bold text-text-primary">
                                {pilot ? `${points} pts` : '0 pts'}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        // Si no hay alineación, mostrar 2 slots vacíos
                        [0, 1].map((index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                              style={{
                                background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                border: '2px solid #6B7280',
                                boxShadow: '0 0 15px #6B728030'
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                  <span className="text-text-secondary text-caption font-medium"></span>
                                </div>
                              </div>
                            </div>
                            <p className="text-caption font-bold text-text-primary">0 pts</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pilotos de Práctica */}
                  <div>
                    <h4 className="text-small font-semibold text-text-primary mb-3">Practice</h4>
                    <div className="flex justify-center gap-4">
                      {currentPoints.has_lineup ? (
                        [0, 1].map((index) => {
                          const pilotId = selectedHistoryGP?.practice_pilots?.[index];
                          const pilot = pilotId ? historyLineup.practice.find(p => p && p.id === pilotId) || null : null;
                          const points = pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                          const getBorderColor = (points) => {
                            if (points < 0) return '#EA5455'; // Rojo (error)
                            if (points === 0) return '#6B7280'; // Gris
                            if (points > 30) return '#9D4EDD'; // Morado (accent)
                            if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                            return '#28C76F'; // Verde (success)
                          };
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                style={{
                                  background: pilot ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                  border: `2px solid ${pilot ? getBorderColor(points) : '#6B7280'}`,
                                  boxShadow: `0 0 15px ${pilot ? getBorderColor(points) : '#6B7280'}30`
                                }}
                              >
                                {pilot ? (
                                  <div className="w-full h-full flex items-center justify-center p-2">
                                    <div className="w-16 h-16 rounded-full overflow-hidden">
                                      <img
                                        src={getImageUrl(pilot, 'pilot')}
                                        alt={pilot.driver_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                      <span className="text-text-secondary text-caption font-medium"></span>
                                    </div>
                                  </div>
                                )}
                                {pilot && getPilotSynergyOverlay(pilot, index)}
                              </div>
                              <p className="text-caption font-bold text-text-primary">
                                {pilot ? `${points} pts` : '0 pts'}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        // Si no hay alineación, mostrar 2 slots vacíos
                        [0, 1].map((index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                              style={{
                                background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                border: '2px solid #6B7280',
                                boxShadow: '0 0 15px #6B728030'
                              }}
                            >
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                  <span className="text-text-secondary text-caption font-medium"></span>
                                </div>
                              </div>
                            </div>
                            <p className="text-caption font-bold text-text-primary">0 pts</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
                </TabsContent>

                {/* Pestaña Ingenieros & Equipos */}
                <TabsContent value="team">
                  <Card className="bg-surface border border-border">
                    <CardHeader>
                      <CardTitle className="text-subtitle font-bold text-text-primary">
                        Ingenieros & Equipos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Constructor */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Constructor</h4>
                        <div className="flex justify-center">
                          {currentPoints.has_lineup ? (
                            (() => {
                              const teamConstructorId = selectedHistoryGP?.team_constructor_id;
                              const teamConstructor = teamConstructorId ? historyTeamLineup.team_constructor : null;
                              const points = teamConstructorId ? (elementPoints[`team_constructor_${teamConstructorId}`] || 0) : 0;
                              const getBorderColor = (points) => {
                                if (points < 0) return '#EA5455'; // Rojo (error)
                                if (points === 0) return '#6B7280'; // Gris
                                if (points > 30) return '#9D4EDD'; // Morado (accent)
                                if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                                return '#28C76F'; // Verde (success)
                              };
                              
                              return (
                                <div className="flex flex-col items-center">
                                  <div 
                                    className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                    style={{
                                      background: teamConstructor ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                      border: `2px solid ${teamConstructor ? getBorderColor(points) : '#6B7280'}`,
                                      boxShadow: `0 0 15px ${teamConstructor ? getBorderColor(points) : '#6B7280'}30`
                                    }}
                                  >
                                    {teamConstructor ? (
                                      <div className="w-full h-full flex items-center justify-center p-2">
                                        <div className="w-16 h-16 rounded-full overflow-hidden">
                                          <img
                                            src={getImageUrl(teamConstructor, 'team_constructor')}
                                            alt={teamConstructor.constructor_name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                          <span className="text-text-secondary text-caption font-medium"></span>
                                        </div>
                                      </div>
                                    )}
                                    {/* Sinergia solo en pestaña Pilots */}
                                  </div>
                                  <p className="text-caption font-bold text-text-primary">
                                    {teamConstructor ? `${points} pts` : '0 pts'}
                                  </p>
                                </div>
                              );
                            })()
                          ) : (
                            // Si no hay alineación, mostrar slot vacío
                            <div className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                                style={{
                                  background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                  border: '2px solid #6B7280',
                                  boxShadow: '0 0 15px #6B728030'
                                }}
                              >
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                    <span className="text-text-secondary text-caption font-medium"></span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-caption font-bold text-text-primary">0 pts</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ingeniero Jefe */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Ingeniero Jefe</h4>
                        <div className="flex justify-center">
                          {currentPoints.has_lineup ? (
                            (() => {
                              const chiefEngineerId = selectedHistoryGP?.chief_engineer_id;
                              const chiefEngineer = chiefEngineerId ? historyTeamLineup.chief_engineer : null;
                              const points = chiefEngineerId ? (elementPoints[`chief_engineer_${chiefEngineerId}`] || 0) : 0;
                              const getBorderColor = (points) => {
                                if (points < 0) return '#EA5455'; // Rojo (error)
                                if (points === 0) return '#6B7280'; // Gris
                                if (points > 30) return '#9D4EDD'; // Morado (accent)
                                if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                                return '#28C76F'; // Verde (success)
                              };
                              
                              return (
                                <div className="flex flex-col items-center">
                                  <div 
                                    className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                    style={{
                                      background: chiefEngineer ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                      border: `2px solid ${chiefEngineer ? getBorderColor(points) : '#6B7280'}`,
                                      boxShadow: `0 0 15px ${chiefEngineer ? getBorderColor(points) : '#6B7280'}30`
                                    }}
                                  >
                                    {chiefEngineer ? (
                                      <div className="w-full h-full flex items-center justify-center p-2">
                                        <div className="w-16 h-16 rounded-full overflow-hidden">
                                          <img
                                            src={getImageUrl(chiefEngineer, 'chief_engineer')}
                                            alt={chiefEngineer.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                          <span className="text-text-secondary text-caption font-medium"></span>
                                        </div>
                                      </div>
                                    )}
                                    {/* Sinergia solo en pestaña Pilots */}
                                  </div>
                                  <p className="text-caption font-bold text-text-primary">
                                    {chiefEngineer ? `${points} pts` : '0 pts'}
                                  </p>
                                </div>
                              );
                            })()
                          ) : (
                            // Si no hay alineación, mostrar slot vacío
                            <div className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                                style={{
                                  background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                  border: '2px solid #6B7280',
                                  boxShadow: '0 0 15px #6B728030'
                                }}
                              >
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                    <span className="text-text-secondary text-caption font-medium"></span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-caption font-bold text-text-primary">0 pts</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ingenieros de Pista */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Ingenieros de Pista</h4>
                        <div className="flex justify-center gap-4">
                          {currentPoints.has_lineup ? (
                            [0, 1].map((index) => {
                              const engineerId = selectedHistoryGP?.track_engineers?.[index];
                              const engineer = engineerId ? historyTeamLineup.track_engineers.find(e => e && e.id === engineerId) || null : null;
                              const points = engineerId ? (elementPoints[`track_engineer_${engineerId}`] || 0) : 0;
                              const getBorderColor = (points) => {
                                if (points < 0) return '#EA5455'; // Rojo (error)
                                if (points === 0) return '#6B7280'; // Gris
                                if (points > 30) return '#9D4EDD'; // Morado (accent)
                                if (points > 0 && points <= 5) return '#FF9F43'; // Naranja/Amarillo (warning)
                                return '#28C76F'; // Verde (success)
                              };
                              
                              return (
                                <div key={index} className="flex flex-col items-center">
                                  <div 
                                    className="w-24 h-24 rounded-lg overflow-visible mb-2 relative"
                                    style={{
                                      background: engineer ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                      border: `2px solid ${engineer ? getBorderColor(points) : '#6B7280'}`,
                                      boxShadow: `0 0 15px ${engineer ? getBorderColor(points) : '#6B7280'}30`
                                    }}
                                  >
                                    {engineer ? (
                                      <div className="w-full h-full flex items-center justify-center p-2">
                                        <div className="w-16 h-16 rounded-full overflow-hidden">
                                          <img
                                            src={getImageUrl(engineer, 'track_engineer')}
                                            alt={engineer.name}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                          <span className="text-text-secondary text-caption font-medium"></span>
                                        </div>
                                      </div>
                                    )}
                                                                         {/* Sinergia solo en pestaña Pilots */}
                                  </div>
                                  <p className="text-caption font-bold text-text-primary">
                                    {engineer ? `${points} pts` : '0 pts'}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            // Si no hay alineación, mostrar 2 slots vacíos
                            [0, 1].map((index) => (
                              <div key={index} className="flex flex-col items-center">
                                <div 
                                  className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                                  style={{
                                    background: 'linear-gradient(135deg, #6B728020, #6B728040)',
                                    border: '2px solid #6B7280',
                                    boxShadow: '0 0 15px #6B728030'
                                  }}
                                >
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center">
                                      <span className="text-text-secondary text-caption font-medium"></span>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-caption font-bold text-text-primary">0 pts</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    );
  }; 

  // Helpers para mostrar sinergia de ingeniero de pista junto a pilotos en la pestaña de puntos
  const findSynergyEngineerForPilot = (pilot) => {
    try {
      if (!pilot || !selectedHistoryGP?.track_engineers || !teamData?.track_engineers) return null;
      const pilotBaseId = pilot.pilot_id || pilot.PilotID || pilot.pilot || pilot.code || pilot.DriverCode;
      const pilotCode = pilot.code || pilot.DriverCode || pilot.pilot_code || pilot.pilotId || pilot.pilotid;
      const pilotName = pilot.driver_name || pilot.name || pilot.DriverName;
      const lineupEngineerIds = selectedHistoryGP.track_engineers;
      const currentGpIdx = Number(selectedGP?.gp_index ?? selectedHistoryGP?.gp_index);
      
      // TEMP mapping: if GP index is 9 and pilot id is 6, show TE id 5
      const gpIdx = currentGpIdx;
      const pilotByLeagueId = Number(pilot.id);
      if (gpIdx === 9 && (pilotBaseId === 6 || pilotByLeagueId === 6)) {
        const tempEngineer = (teamData.track_engineers || []).find(e => Number(e.track_engineer_id ?? e.TrackEngineerID) === 5 || Number(e.id) === 5)
          || (historyTeamLineup?.track_engineers || []).find(e => e && (Number(e.track_engineer_id ?? e.TrackEngineerID) === 5 || Number(e.id) === 5));
        if (tempEngineer) {
          const keyId = Number(tempEngineer.id); // by-league id used in elementPoints keys
          const tempPoints = elementPoints[`track_engineer_${keyId}`] ?? 0;
          return { engineer: tempEngineer, points: tempPoints, engineerId: keyId };
        }
      }
      // Buscar ingeniero alineado cuyo pilot_id coincida con el piloto base
      const engineer = (teamData.track_engineers || []).find(e => {
        if (!lineupEngineerIds.includes(e.id)) return false;
        const ePilotId = e.pilot_id ?? e.PilotID ?? e.pilot ?? e.pilotId ?? e.pilotid;
        const ePilotCode = e.pilot_code ?? e.PilotCode ?? e.code;
        const ePilotName = e.pilot_name ?? e.PilotName ?? e.pilotDriverName ?? e.pilotDriver ?? e.driver_name;
        if (ePilotId && pilotBaseId && String(ePilotId) === String(pilotBaseId)) return true;
        if (ePilotCode && pilotCode && String(ePilotCode).toUpperCase() === String(pilotCode).toUpperCase()) return true;
        if (ePilotName && pilotName && String(ePilotName).split(' ').pop().toLowerCase() === String(pilotName).split(' ').pop().toLowerCase()) return true;
        return false;
      });
      if (!engineer) return null;
      const tePoints = elementPoints[`track_engineer_${engineer.id}`] || 0;
      if (tePoints <= 0) return null; // mostrar solo si puntúa
      if (process.env.NODE_ENV !== 'production') {
        try { console.log('🔗 TE synergy match', { pilot: pilotName || pilotBaseId || pilotCode, engineer: engineer.name, tePoints }); } catch(_) {}
      }
      return { engineer, points: tePoints, engineerId: engineer.id };
    } catch (_) {
      return null;
    }
  };

  const getPilotSynergyOverlay = (pilot, slotIndex) => {
    const match = findSynergyEngineerForPilot(pilot);
    if (!match) return null;
    const currentGpIdx = Number(selectedGP?.gp_index ?? selectedHistoryGP?.gp_index);
    const forceLeft = currentGpIdx === 9 && (Number(pilot.pilot_id ?? pilot.PilotID) === 6 || Number(pilot.id) === 6);
    const isLeft = forceLeft ? true : (slotIndex === 0);
    const sideClass = isLeft ? 'left-0 -translate-x-full -ml-2 flex-row' : '-right-8 flex-row-reverse';
    return (
      <div className={`absolute top-1/2 -translate-y-1/2 ${sideClass} items-center pointer-events-none`}> 
        <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg shadow-sm">
          <div className="w-8 h-8 rounded-full border-2 border-[#9D4EDD] bg-black flex items-center justify-center text-white text-base">
            🔧
          </div>
          {isLeft ? (
            <ArrowRight className="h-4 w-4 text-[#9D4EDD]" />
          ) : (
            <ArrowLeft className="h-4 w-4 text-[#9D4EDD]" />
          )}
          <span className="text-[11px] font-bold text-[#9D4EDD]">+{match.points}</span>
        </div>
      </div>
    );
  }; 

  if (!selectedLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
              <CardTitle className="mb-2">Selecciona una Liga</CardTitle>
              <p className="text-text-secondary mb-4">
                Debes seleccionar una liga para ver tu equipo
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
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-40">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
          <h1 className="text-h1 font-bold text-text-primary mb-2">
              <span className="inline-flex items-center gap-3">
                <img src="/images/logos/f1tasy.png" alt="Logo" className="h-8 w-auto" />
              </span>
          </h1>
            <span className="text-text-secondary text-small font-medium">
              <span className="text-accent-main font-semibold">{selectedLeague.name}</span>
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-surface">
            <TabsTrigger value="lineup">Lineup</TabsTrigger>
            <TabsTrigger value="squad">Roster</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-main mx-auto mb-4"></div>
              <p className="text-text-primary">🏁 Cargando tu equipo...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="mx-auto h-12 w-12 text-state-error mb-4" />
                <p className="text-state-error">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={currentTab} className="w-full">
            <TabsContent value="lineup">
              {renderF1Grid()}
            </TabsContent>
            <TabsContent value="squad">
              {renderSquad()}
            </TabsContent>
            <TabsContent value="points">
              {renderPoints()}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Sell Modal */}
      <Dialog open={openSellModal} onOpenChange={setOpenSellModal}>
        <DialogContent className="max-w-sm mx-auto bg-surface border border-border">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-text-primary text-h3 font-bold">
              Fijar precio de venta - {
                selectedItemType === 'pilot' ? 'Piloto' :
                selectedItemType === 'track_engineer' ? 'Ingeniero de Pista' :
                selectedItemType === 'chief_engineer' ? 'Ingeniero Jefe' :
                'Equipo'
              }
            </DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-20 h-20 border-2 border-accent-main">
                <AvatarImage 
                  src={getImageUrl(selectedDriver, selectedItemType)}
                  alt={
                    selectedItemType === 'pilot' ? selectedDriver.driver_name :
                    selectedItemType === 'team_constructor' ? selectedDriver.constructor_name :
                    selectedDriver.name
                  }
                />
                <AvatarFallback className="bg-surface-elevated text-text-primary font-bold text-lg">
                  {
                    selectedItemType === 'pilot' ? 
                      (selectedDriver.driver_name?.substring(0, 2) || '??') :
                    selectedItemType === 'team_constructor' ?
                      (selectedDriver.constructor_name?.substring(0, 2) || '??') :
                      (selectedDriver.name?.substring(0, 2) || '??')
                  }
                </AvatarFallback>
              </Avatar>

              <div className="text-center space-y-2">
                <h3 className="text-text-primary font-bold text-body">
                  {
                    selectedItemType === 'pilot' ? selectedDriver.driver_name :
                    selectedItemType === 'team_constructor' ? selectedDriver.constructor_name :
                    selectedDriver.name
                  }
                </h3>
                <div className="space-y-1">
                  <p className="text-accent-main font-bold text-small">VALOR DE MERCADO</p>
                  <p className="text-text-primary font-bold text-body">
                    €{formatNumberWithDots(selectedDriver.value)}
                  </p>
                </div>
                {selectedItemType === 'pilot' && selectedDriver.clausula && (
                  <div className="space-y-1">
                    <p className="text-state-error font-bold text-small">VALOR DE CLÁUSULA</p>
                    <p className="text-text-primary font-bold text-body">
                      {selectedDriver.clausula}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center bg-surface-elevated border border-border rounded-md px-3 py-2">
                  <span className="text-text-secondary font-bold mr-2">€</span>
                  <Input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder={formatNumberWithDots(selectedDriver.value)}
                    className="border-none bg-transparent text-text-primary font-bold text-right text-body flex-1"
                    disabled={loadingSell}
                    min="1"
                  />
                </div>
                
                <Button
                  onClick={handleConfirmSell}
                  disabled={loadingSell}
                  className="w-full bg-state-success hover:bg-state-success hover:bg-opacity-80 text-white font-bold text-body py-3"
                >
                  {loadingSell ? 'Añadiendo...' : 'Añadir al mercado'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Selección de Alineación */}
      <Dialog open={selectionModal.open} onOpenChange={closeSelectionModal}>
        <DialogContent className="selection-modal max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader className="selection-modal-header">
            <DialogTitle className="text-h3 font-semibold text-text-primary flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent-main" />
              Seleccionar {selectionModal.label}
            </DialogTitle>
          </DialogHeader>

          <div className="selection-modal-content flex flex-col h-full">
            {/* Lista de items disponibles */}
            <div className="selection-modal-scroll flex-1 overflow-y-auto space-y-3 pr-2">
              {getAvailableItems().length > 0 ? (
                getAvailableItems().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => selectItem(item, selectionModal.category)}
                    className="selection-item"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="selection-item-avatar w-16 h-16 flex-shrink-0">
                        <img 
                          src={getImageUrl(item, selectionModal.category === 'race' || selectionModal.category === 'qualifying' || selectionModal.category === 'practice' ? 'pilot' : 
                            selectionModal.category === 'team_constructor' ? 'team_constructor' :
                            selectionModal.category === 'chief_engineer' ? 'chief_engineer' :
                            selectionModal.category === 'track_engineers' ? 'track_engineer' : 'pilot')}
                          alt={item.driver_name || item.name || item.Name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-full h-full bg-surface flex items-center justify-center text-caption font-medium text-text-secondary"
                          style={{ display: 'none' }}
                        >
                          {(item.driver_name || item.name || item.Name)?.substring(0, 2).toUpperCase()}
                        </div>
                      </div>

                      {/* Información */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-text-primary text-body truncate">
                          {item.driver_name || item.name || item.Name}
                        </h4>
                        <p className="text-text-secondary text-small truncate">
                          {item.team || item.Team}
                        </p>
                        {selectionModal.category === 'race' || selectionModal.category === 'qualifying' || selectionModal.category === 'practice' ? (
                          <span 
                            className="inline-block px-2 py-1 rounded-full text-caption font-medium mt-1"
                            style={{ 
                              backgroundColor: `${getTeamColor(item.team)}20`,
                              color: getTeamColor(item.team)
                            }}
                          >
                            {item.mode?.toUpperCase() || item.session_type?.toUpperCase()}
                          </span>
                        ) : null}
                      </div>

                      {/* Valor */}
                      <div className="text-right">
                        <p className="selection-item-value">
                          €{formatNumberWithDots(item.value || item.Value || 0)}
                        </p>
                        {item.clausula && (
                          <p className="selection-item-clausula">
                            {item.clausula}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-text-secondary mb-4" />
                  <p className="text-text-secondary text-body">
                    {(() => {
                      switch (selectionModal.category) {
                        case 'race':
                          return 'No hay pilotos de carrera disponibles (todos están alineados)';
                        case 'qualifying':
                          return 'No hay pilotos de clasificación disponibles (todos están alineados)';
                        case 'practice':
                          return 'No hay pilotos de práctica disponibles (todos están alineados)';
                        case 'team_constructor':
                          return 'No hay equipos constructores disponibles (ya tienes uno alineado)';
                        case 'chief_engineer':
                          return 'No hay ingenieros jefe disponibles (ya tienes uno alineado)';
                        case 'track_engineers':
                          return 'No hay ingenieros de pista disponibles (todos están alineados)';
                        default:
                          return 'No hay elementos disponibles para esta posición';
                      }
                    })()}
                  </p>
                </div>
              )}
            </div>

            {/* Botón de cerrar */}
            <div className="pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                onClick={closeSelectionModal}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Subir Cláusula */}
      <UpgradeClausulaModal
        isOpen={openUpgradeClausulaModal}
        onClose={handleCloseUpgradeClausulaModal}
        item={selectedUpgradeItem}
        type={selectedUpgradeType}
        onConfirm={handleUpgradeClausula}
        isLoading={loadingUpgradeClausula}
        playerMoney={teamData.money || 0}
      />

      {/* Snackbar */}
      {snackbar.open && (
        <div className={cn(
          "fixed bottom-24 right-4 p-4 rounded-md shadow-lg z-50",
          snackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
        )}>
          <p className="text-white">{snackbar.message}</p>
        </div>
      )}
    </div>
  );
} 