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
import { Users, Settings, Trophy, AlertCircle, Plus, Trash2, X } from 'lucide-react';

// Existing components (will be phased out)
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerRaceCard from '../components/EngineerRaceCard';
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
  const [currentPoints, setCurrentPoints] = useState({});

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
            team_constructors: normalizedTeamConstructors
          });
          setDrivers(normalizedPilots);
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

  // Obtener información del GP actual cuando se cambie a la pestaña de puntos
  useEffect(() => {
    if (currentTab === 'points' && selectedLeague?.id) {
      fetchCurrentGP();
    }
  }, [currentTab, selectedLeague]);

  // Función para obtener información del GP actual
  const fetchCurrentGP = async () => {
    try {
      setLoadingGP(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/lineup/current?league_id=' + selectedLeague.id, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Obtener información completa del GP
        const gpResponse = await fetch('/api/grand-prix');
        const gpData = await gpResponse.json();
        const grandPrix = gpData.gps || [];
        
        // Encontrar el GP actual por gp_index
        const currentGrandPrix = grandPrix.find(gp => gp.gp_index === data.gp_index);
        setCurrentGP(currentGrandPrix);
        
        // Verificar si el GP ya ha comenzado (fecha actual > start_date)
        if (currentGrandPrix) {
          const startDate = new Date(currentGrandPrix.start_date);
          const now = new Date();
          setIsGPStarted(now >= startDate);
          
          // Si el GP ya ha comenzado, buscar el próximo GP y cargar puntos actuales
          if (now >= startDate) {
            const nextGrandPrix = grandPrix.find(gp => {
              const gpStartDate = new Date(gp.start_date);
              return gpStartDate > now;
            });
            setNextGP(nextGrandPrix || null);
            
            // Cargar puntos actuales de la alineación
            await loadCurrentPoints(data.gp_index);
          } else {
            setNextGP(null);
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
  const loadCurrentPoints = async (gpIndex) => {
    try {
      const token = localStorage.getItem('token');
      const playerId = localStorage.getItem('player_id');
      
      // Obtener los puntos totales de la alineación desde la tabla lineups
      const response = await fetch(`/api/lineup/points?player_id=${playerId}&league_id=${selectedLeague.id}&gp_index=${gpIndex}`, {
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
          total: totalPoints
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
      
      // Extraer solo los IDs de los objetos
      const lineupData = {
        league_id: selectedLeague.id,
        race_pilots: pilotLineup.race.filter(p => p !== null).map(p => p.id),
        qualifying_pilots: pilotLineup.qualifying.filter(p => p !== null).map(p => p.id),
        practice_pilots: pilotLineup.practice.filter(p => p !== null).map(p => p.id),
        team_constructor_id: teamLineup.team_constructor?.id || null,
        chief_engineer_id: teamLineup.chief_engineer?.id || null,
        track_engineers: teamLineup.track_engineers.filter(e => e !== null).map(e => e.id)
      };

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
        showSnackbar('Alineación guardada correctamente', 'success');
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
            team_constructors: newTeamData.team.team_constructors || []
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
                    Alineación de Pilotos (2-2-2)
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Carrera */}
                    <div>
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Carrera</h3>
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
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Clasificación</h3>
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
                      <h3 className="text-subtitle font-medium text-text-primary mb-4">Práctica</h3>
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

      {/* Botones de Acción */}
      <div className="flex justify-center gap-4 mt-8">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleAddToMarket(driver, 'pilot'); }}
                      className="flex items-center gap-2 border-accent-main text-accent-main hover:bg-accent-main/10"
                    >
                      <Plus className="h-4 w-4" />
                      Vender
                    </Button>
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleAddToMarket(engineer, 'track_engineer'); }}
                      className="flex items-center gap-2 border-accent-main text-accent-main hover:bg-accent-main/10"
                    >
                      <Plus className="h-4 w-4" />
                      Vender
                    </Button>
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleAddToMarket(engineer, 'chief_engineer'); }}
                      className="flex items-center gap-2 border-accent-main text-accent-main hover:bg-accent-main/10"
                    >
                      <Plus className="h-4 w-4" />
                      Vender
                    </Button>
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleAddToMarket(team, 'team_constructor'); }}
                      className="flex items-center gap-2 border-accent-main text-accent-main hover:bg-accent-main/10"
                    >
                      <Plus className="h-4 w-4" />
                      Vender
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Points: Alineación con puntos del último GP (read-only)
  const renderPoints = () => {
    // Si está cargando
    if (loadingGP) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-main mx-auto mb-4"></div>
          <p className="text-text-primary">Cargando información del Gran Premio...</p>
        </div>
      );
    }

    // Si no hay GP actual
    if (!currentGP) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-16 w-16 text-text-secondary mb-4" />
          <h3 className="text-h3 font-bold text-text-primary mb-2">Sin Gran Premio activo</h3>
          <p className="text-text-secondary text-center max-w-sm">
            No hay información disponible sobre el Gran Premio actual.
          </p>
        </div>
      );
    }

    // Si el GP no ha comenzado, mostrar información pero sin puntos
    if (!isGPStarted) {
      const startDate = new Date(currentGP.start_date);
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-16 w-16 text-text-secondary mb-4" />
          <h3 className="text-h3 font-bold text-text-primary mb-2">Gran Premio: {currentGP.name}</h3>
          <div className="text-center max-w-sm space-y-2">
            <p className="text-text-secondary">
              {currentGP.country} - {currentGP.circuit}
            </p>
            <div className="bg-surface-elevated border border-border rounded-lg p-4 mt-4">
              <p className="text-small font-semibold text-text-primary mb-1">
                Inicio del Gran Premio:
              </p>
              <p className="text-accent-main font-bold">
                {startDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <p className="text-text-secondary text-small mt-4">
              Los puntos de tu alineación se mostrarán después del inicio del Gran Premio.
            </p>
          </div>
        </div>
      );
    }

    // Si la alineación está vacía, mostrar mensaje
    const hasLineup = (
      pilotLineup.race.some(p => p !== null) ||
      pilotLineup.qualifying.some(p => p !== null) ||
      pilotLineup.practice.some(p => p !== null) ||
      teamLineup.team_constructor ||
      teamLineup.chief_engineer ||
      teamLineup.track_engineers.some(e => e !== null)
    );

    if (!hasLineup) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <Trophy className="h-16 w-16 text-text-secondary mb-4" />
          <h3 className="text-h3 font-bold text-text-primary mb-2">Sin alineación</h3>
          <div className="text-center max-w-sm space-y-2">
            <p className="text-text-secondary">
              Gran Premio: <span className="text-accent-main font-medium">{currentGP.name}</span>
            </p>
            <p className="text-text-secondary">
              {currentGP.country} - {currentGP.circuit}
            </p>
            <p className="text-text-secondary mt-4">
              Configura tu alineación en la pestaña "Alineación" para ver los puntos aquí.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto space-y-6 px-4">
        {/* Header con información del GP */}
        <div className="text-center">
          <h2 className="text-h3 font-bold text-text-primary mb-2">Puntos de Alineación</h2>
          <div className="bg-surface-elevated border border-border rounded-lg p-4">
            <p className="text-small font-semibold text-text-primary mb-1">Gran Premio:</p>
            <p className="text-accent-main font-bold text-subtitle">{currentGP.name}</p>
            <p className="text-text-secondary text-small">
              {currentGP.country} - {currentGP.circuit}
            </p>
            {currentGP.flag && (
              <img
                src={`/images/flags/${currentGP.flag}`}
                alt={currentGP.country}
                className="w-8 h-5 mx-auto mt-2 rounded border border-border"
              />
            )}
          </div>
        </div>

        {/* Alineación Info */}
        <Card className="bg-surface border border-border shadow-card">
          <CardContent className="p-4 text-center">
            <h3 className="text-subtitle font-bold text-text-primary mb-3">Tu Alineación</h3>
            <div className="grid grid-cols-2 gap-4 text-small">
              <div>
                <p className="text-text-secondary mb-1">Pilotos de Carrera</p>
                <p className="text-accent-main font-semibold">
                  {pilotLineup.race.filter(p => p !== null).length}/2
                </p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">Pilotos de Clasificación</p>
                <p className="text-accent-main font-semibold">
                  {pilotLineup.qualifying.filter(p => p !== null).length}/2
                </p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">Pilotos de Práctica</p>
                <p className="text-accent-main font-semibold">
                  {pilotLineup.practice.filter(p => p !== null).length}/2
                </p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">Equipo Completo</p>
                <p className="text-accent-main font-semibold">
                  {[
                    teamLineup.team_constructor,
                    teamLineup.chief_engineer,
                    ...teamLineup.track_engineers.filter(e => e !== null)
                  ].filter(Boolean).length}/4
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Points */}
        <Card className="bg-gradient-to-r from-accent-main to-accent-hover border border-accent-main shadow-card">
          <CardContent className="p-4 text-center">
            <h3 className="text-small font-semibold text-white mb-1">Puntos Totales</h3>
            <p className="text-h2 font-bold text-white">
              {currentPoints.total || 0} pts
            </p>
          </CardContent>
        </Card>

        {/* Información del próximo GP si hay uno */}
        {nextGP && (
          <Card className="bg-surface border border-border shadow-card">
            <CardContent className="p-4 text-center">
              <h3 className="text-subtitle font-bold text-text-primary mb-3">Próximo Gran Premio</h3>
              <div className="space-y-2">
                <p className="text-accent-main font-bold text-body">{nextGP.name}</p>
                <p className="text-text-secondary text-small">
                  {nextGP.country} - {nextGP.circuit}
                </p>
                {nextGP.flag && (
                  <img
                    src={`/images/flags/${nextGP.flag}`}
                    alt={nextGP.country}
                    className="w-8 h-5 mx-auto mt-2 rounded border border-border"
                  />
                )}
                <div className="bg-surface-elevated border border-border rounded-lg p-3 mt-3">
                  <p className="text-small font-semibold text-text-primary mb-1">
                    Inicia el:
                  </p>
                  <p className="text-accent-main font-bold text-small">
                    {new Date(nextGP.start_date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
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
          <h1 className="text-h1 font-bold text-text-primary mb-2">
            🏁 Mi Equipo
          </h1>
          <p className="text-text-secondary">
            Liga: <span className="text-accent-main font-medium">{selectedLeague.name}</span>
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-surface">
            <TabsTrigger value="lineup">Alineación</TabsTrigger>
            <TabsTrigger value="squad">Plantilla</TabsTrigger>
            <TabsTrigger value="points">Puntos</TabsTrigger>
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