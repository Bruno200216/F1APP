import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { X, ChevronLeft, ChevronRight, Lock, Users, Settings, Trophy, ArrowLeft, TrendingUp, Car, Wrench, Building2 } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import { getTeamColor, cn } from '../lib/utils';

// Components
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerCard from '../components/EngineerCard';
import TeamCard from '../components/TeamCard';
import PlayerItemActions from '../components/PlayerItemActions';
import MakeOfferModal from '../components/MakeOfferModal';

export default function PlayerProfilePage() {
  const { playerId } = useParams();
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  
  const [player, setPlayer] = useState(null);
  const [playerSquad, setPlayerSquad] = useState({
    pilots: [],
    trackEngineers: [],
    chiefEngineers: [],
    teamConstructors: []
  });
  const [playerPoints, setPlayerPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPlayerMoney, setCurrentPlayerMoney] = useState(0);
  const [existingOffers, setExistingOffers] = useState([]); // Ofertas existentes del usuario
  
  // Estados para el modal de ofertas
  const [openMakeOfferModal, setOpenMakeOfferModal] = useState(false);
  const [selectedOfferItem, setSelectedOfferItem] = useState(null);
  const [selectedOfferType, setSelectedOfferType] = useState('');
  const [loadingMakeOffer, setLoadingMakeOffer] = useState(false);

  // Estados para la funcionalidad de puntos con alineaciones
  const [availableGPs, setAvailableGPs] = useState([]);
  const [selectedGP, setSelectedGP] = useState(null);
  const [currentPoints, setCurrentPoints] = useState({ total: 0 });
  const [lineupHistory, setLineupHistory] = useState([]);
  const [historyLineup, setHistoryLineup] = useState({ race: [], qualifying: [], practice: [] });
  const [historyTeamLineup, setHistoryTeamLineup] = useState({ team_constructor: null, chief_engineer: null, track_engineers: [] });
  const [elementPoints, setElementPoints] = useState({});
  const [selectedHistoryGP, setSelectedHistoryGP] = useState(null);
  const [pointsTab, setPointsTab] = useState('pilots');
  const [loadingGPs, setLoadingGPs] = useState(false);
  
  // Obtener el ID del usuario actual
  const currentPlayerId = Number(localStorage.getItem('player_id'));

  useEffect(() => {
    if (selectedLeague && playerId) {
      fetchPlayerData();
      loadAvailableGPs();
    }
  }, [selectedLeague, playerId]);

  const fetchPlayerData = async () => {
    if (!selectedLeague || !playerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch player basic info
      const token = localStorage.getItem('token');
      const playerRes = await fetch(`/api/leagues/${selectedLeague.id}/classification`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const playerData = await playerRes.json();
      const playerInfo = playerData.classification.find(p => p.player_id === parseInt(playerId));
      
      if (!playerInfo) {
        setError('Player not found');
        setLoading(false);
        return;
      }
      
      setPlayer(playerInfo);

      // Fetch player squad (pilots, engineers, teams)
      const squadRes = await fetch(`/api/players/${playerId}/squad?league_id=${selectedLeague.id}`);
      const squadData = await squadRes.json();
      
      setPlayerSquad({
        pilots: squadData.pilots || [],
        trackEngineers: squadData.track_engineers || [],
        chiefEngineers: squadData.chief_engineers || [],
        teamConstructors: squadData.team_constructors || []
      });

      // Fetch player points history
      const pointsRes = await fetch(`/api/players/${playerId}/points?league_id=${selectedLeague.id}`);
      const pointsData = await pointsRes.json();
      setPlayerPoints(pointsData.points || []);

      // Obtener dinero del usuario actual si es diferente al jugador que se está viendo
      if (currentPlayerId !== parseInt(playerId)) {
        try {
          const currentPlayerRes = await fetch(`/api/playerbyleague?player_id=${currentPlayerId}&league_id=${selectedLeague.id}`);
          const currentPlayerData = await currentPlayerRes.json();
          setCurrentPlayerMoney(currentPlayerData.player_by_league?.money || 0);
        } catch (err) {
          console.error('Error fetching current player money:', err);
          setCurrentPlayerMoney(0);
        }
      }

      // Obtener ofertas existentes del usuario actual
      await fetchExistingOffers();

    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Error loading player data');
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener las ofertas existentes del usuario
  const fetchExistingOffers = async () => {
    if (!selectedLeague || currentPlayerId === parseInt(playerId)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/my-market-bids?league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setExistingOffers(data.bids || []);
    } catch (err) {
      console.error('Error fetching existing offers:', err);
      setExistingOffers([]);
    }
  };

  const handleCardClick = (item, type) => {
    switch (type) {
      case 'pilot':
        navigate(`/profile/${item.pilot_id}?league_id=${selectedLeague.id}`);
        break;
      case 'track_engineer':
        // Usar el ID del registro TrackEngineerByLeague, no el ID del TrackEngineer base
        navigate(`/profile/engineer/track/${item.id}?league_id=${selectedLeague.id}`);
        break;
      case 'chief_engineer':
        // Usar el ID del registro ChiefEngineerByLeague, no el ID del ChiefEngineer base
        navigate(`/profile/engineer/chief/${item.id}?league_id=${selectedLeague.id}`);
        break;
      case 'team_constructor':
        navigate(`/profile/team/${item.id}?league_id=${selectedLeague.id}`);
        break;
    }
  };

  const handleMakeOffer = async (item, itemType) => {
    // Abrir modal para hacer oferta
    setSelectedOfferItem(item);
    setSelectedOfferType(itemType);
    setOpenMakeOfferModal(true);
  };

  const handleConfirmMakeOffer = async (offerValue) => {
    if (!selectedOfferItem || !selectedOfferType) return;
    
    setLoadingMakeOffer(true);
    try {
      console.log('Enviando oferta:', { 
        item: selectedOfferItem, 
        itemType: selectedOfferType, 
        offerValue, 
        leagueId: selectedLeague.id 
      });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${selectedOfferType}/make-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: selectedOfferItem.id,
          league_id: selectedLeague.id,
          offer_value: offerValue
        })
      });

      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al enviar la oferta');
      }

      // Cerrar modal y mostrar mensaje de éxito
      setOpenMakeOfferModal(false);
      setSelectedOfferItem(null);
      setSelectedOfferType('');
      
      // Recargar datos del jugador y ofertas existentes
      fetchPlayerData();
      await fetchExistingOffers();
    } catch (error) {
      console.error('Error en handleConfirmMakeOffer:', error);
      alert(error.message);
    } finally {
      setLoadingMakeOffer(false);
    }
  };

  const handleCloseMakeOfferModal = () => {
    setOpenMakeOfferModal(false);
    setSelectedOfferItem(null);
    setSelectedOfferType('');
    setLoadingMakeOffer(false);
  };

  const handleActivateClausula = async (item, itemType, clausulaValue) => {
    try {
      console.log('Activando cláusula:', { item, itemType, clausulaValue, leagueId: selectedLeague.id });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${itemType}/activate-clausula`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          league_id: selectedLeague.id,
          clausula_value: clausulaValue
        })
      });

      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al activar la cláusula');
      }

      alert('Cláusula activada correctamente');
      // Recargar datos del jugador
      fetchPlayerData();
    } catch (error) {
      console.error('Error en handleActivateClausula:', error);
      throw new Error(error.message);
    }
  };

  // Funciones para la funcionalidad de puntos con alineaciones
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
      } else {
        console.error('Error loading GPs:', response.status);
      }
    } catch (error) {
      console.error('Error loading GPs:', error);
    } finally {
      setLoadingGPs(false);
    }
  };

  const loadCurrentPointsForGP = async (gpIndex) => {
    try {
      console.log('🔍 Cargando puntos para GP:', gpIndex);
      const token = localStorage.getItem('token');
      
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
            // Buscar nuevamente en el historial actualizado
            lineupData = lineupHistory.find(l => l.gp_index === gpIndex);
          }
          
          if (lineupData) {
            console.log('🔍 Cargando alineación para GP:', gpIndex);
            await loadHistoryLineup(lineupData);
            console.log('🔍 Cargando puntos individuales para GP:', gpIndex);
            await loadElementPoints(lineupData);
          } else {
            console.log('❌ No se encontró alineación para GP:', gpIndex);
            // Intentar cargar directamente desde el endpoint de history
            console.log('🔍 Intentando cargar alineación directamente...');
            const historyResponse = await fetch(`/api/lineup/history?player_id=${playerId}&league_id=${selectedLeague.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();
              const directLineupData = historyData.lineups?.find(l => l.gp_index === gpIndex);
              if (directLineupData) {
                console.log('🔍 Alineación encontrada directamente:', directLineupData);
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

  const loadLineupHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/lineup/history?player_id=${playerId}&league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLineupHistory(data.lineups || []);
      } else {
        console.error('Error loading lineup history:', response.status);
      }
    } catch (error) {
      console.error('Error loading lineup history:', error);
    }
  };

  const loadHistoryLineup = async (gpData) => {
    try {
      setSelectedHistoryGP(gpData);
      
      // Cargar pilotos de carrera
      const racePilots = [];
      if (gpData.race_pilots && gpData.race_pilots.length > 0) {
        for (const pilotId of gpData.race_pilots) {
          const pilot = await loadPilotById(pilotId);
          if (pilot) racePilots.push(pilot);
        }
      }
      
      // Cargar pilotos de clasificación
      const qualifyingPilots = [];
      if (gpData.qualifying_pilots && gpData.qualifying_pilots.length > 0) {
        for (const pilotId of gpData.qualifying_pilots) {
          const pilot = await loadPilotById(pilotId);
          if (pilot) qualifyingPilots.push(pilot);
        }
      }
      
      // Cargar pilotos de práctica
      const practicePilots = [];
      if (gpData.practice_pilots && gpData.practice_pilots.length > 0) {
        for (const pilotId of gpData.practice_pilots) {
          const pilot = await loadPilotById(pilotId);
          if (pilot) practicePilots.push(pilot);
        }
      }
      
      setHistoryLineup({
        race: racePilots,
        qualifying: qualifyingPilots,
        practice: practicePilots
      });
      
      // Cargar equipo constructor
      let teamConstructor = null;
      if (gpData.team_constructor_id) {
        teamConstructor = await loadTeamConstructorById(gpData.team_constructor_id);
      }
      
      // Cargar ingeniero jefe
      let chiefEngineer = null;
      if (gpData.chief_engineer_id) {
        chiefEngineer = await loadChiefEngineerById(gpData.chief_engineer_id);
      }
      
      // Cargar ingenieros de pista
      const trackEngineers = [];
      if (gpData.track_engineers && gpData.track_engineers.length > 0) {
        for (const engineerId of gpData.track_engineers) {
          const engineer = await loadTrackEngineerById(engineerId);
          if (engineer) trackEngineers.push(engineer);
        }
      }
      
      setHistoryTeamLineup({
        team_constructor: teamConstructor,
        chief_engineer: chiefEngineer,
        track_engineers: trackEngineers
      });
      
    } catch (error) {
      console.error('Error loading history lineup:', error);
    }
  };

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
        console.log(`🔍 Cargando puntos para piloto ${pilotByLeagueId} en GP ${gpData.gp_index}`);
        const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=pilot&element_id=${pilotByLeagueId}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          points[`pilot_${pilotByLeagueId}`] = data.points || 0;
          console.log(`✅ Piloto ${pilotByLeagueId}: ${data.points} puntos`);
        } else {
          console.log(`❌ Error cargando puntos para piloto ${pilotByLeagueId}`);
        }
      }

      // Cargar puntos de equipo constructor
      if (gpData.team_constructor_id) {
        console.log(`🔍 Cargando puntos para equipo constructor ${gpData.team_constructor_id} en GP ${gpData.gp_index}`);
        const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=team_constructor&element_id=${gpData.team_constructor_id}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          points[`team_constructor_${gpData.team_constructor_id}`] = data.points || 0;
          console.log(`✅ Equipo Constructor ${gpData.team_constructor_id}: ${data.points} puntos`);
        } else {
          console.log(`❌ Error cargando puntos para equipo constructor ${gpData.team_constructor_id}`);
        }
      }

      // Cargar puntos de ingeniero jefe
      if (gpData.chief_engineer_id) {
        console.log(`🔍 Cargando puntos para ingeniero jefe ${gpData.chief_engineer_id} en GP ${gpData.gp_index}`);
        const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=chief_engineer&element_id=${gpData.chief_engineer_id}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          points[`chief_engineer_${gpData.chief_engineer_id}`] = data.points || 0;
          console.log(`✅ Ingeniero Jefe ${gpData.chief_engineer_id}: ${data.points} puntos`);
        } else {
          console.log(`❌ Error cargando puntos para ingeniero jefe ${gpData.chief_engineer_id}`);
        }
      }

      // Cargar puntos de ingenieros de pista
      if (gpData.track_engineers) {
        for (const engineerId of gpData.track_engineers) {
          console.log(`🔍 Cargando puntos para track engineer ${engineerId} en GP ${gpData.gp_index}`);
          const response = await fetch(`/api/lineup/element-points?gp_index=${gpData.gp_index}&element_type=track_engineer&element_id=${engineerId}&player_id=${playerId}&league_id=${selectedLeague.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            points[`track_engineer_${engineerId}`] = data.points || 0;
            console.log(`✅ Track Engineer ${engineerId}: ${data.points} puntos`);
          } else {
            console.log(`❌ Error cargando puntos para track engineer ${engineerId}`);
          }
        }
      }

      setElementPoints(points);
      console.log('🎯 ElementPoints final:', points);
      
    } catch (error) {
      console.error('Error loading element points:', error);
    }
  };

  const loadPilotById = async (pilotId) => {
    try {
      const response = await fetch(`/api/pilots/${pilotId}`);
      if (response.ok) {
        const data = await response.json();
        return data.pilot;
      }
    } catch (error) {
      console.error('Error loading pilot:', error);
    }
    return null;
  };

  const loadTeamConstructorById = async (teamId) => {
    try {
      const response = await fetch(`/api/teamconstructorsbyleague?id=${teamId}&league_id=${selectedLeague.id}`);
      if (response.ok) {
        const data = await response.json();
        return data.team_constructor;
      }
    } catch (error) {
      console.error('Error loading team constructor:', error);
    }
    return null;
  };

  const loadChiefEngineerById = async (engineerId) => {
    try {
      const response = await fetch(`/api/chiefengineersbyleague?id=${engineerId}&league_id=${selectedLeague.id}`);
      if (response.ok) {
        const data = await response.json();
        return data.chief_engineer;
      }
    } catch (error) {
      console.error('Error loading chief engineer:', error);
    }
    return null;
  };

  const loadTrackEngineerById = async (engineerId) => {
    try {
      const response = await fetch(`/api/trackengineersbyleague?id=${engineerId}&league_id=${selectedLeague.id}`);
      if (response.ok) {
        const data = await response.json();
        return data.track_engineer;
      }
    } catch (error) {
      console.error('Error loading track engineer:', error);
    }
    return null;
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
        break;
      }
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
    
    return finalUrl;
  };

  // Función para obtener colores de borde según puntos
  const getBorderColor = (points) => {
    if (points === 0) return '#6B7280'; // Gris
    if (points > 0 && points <= 10) return '#10B981'; // Verde claro
    if (points > 10 && points <= 20) return '#059669'; // Verde medio
    if (points > 20 && points <= 30) return '#047857'; // Verde oscuro
    if (points > 30) return '#9D4EDD'; // Morado
    return '#EF4444'; // Rojo para puntos negativos
  };

  // Función para renderizar la sección de puntos
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
                onClick={() => {
                  setSelectedGP(gp);
                  loadCurrentPointsForGP(gp.gp_index);
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
                    <p className="text-caption text-text-secondary">Puntos Totales</p>
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
                    Pilotos
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Ingenieros & Equipos
                  </TabsTrigger>
                </TabsList>

                {/* Pestaña Pilotos */}
                <TabsContent value="pilots">
                  <Card className="bg-surface border border-border">
                    <CardHeader>
                      <CardTitle className="text-subtitle font-bold text-text-primary">
                        Pilotos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Pilotos de Carrera */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Carrera</h4>
                        <div className="flex justify-center gap-4">
                          {currentPoints.has_lineup ? (
                            [0, 1].map((index) => {
                              const pilot = historyLineup.race[index] || null;
                              const pilotId = selectedHistoryGP?.race_pilots?.[index];
                              const points = pilot && pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                              
                              return (
                                <div key={index} className="flex flex-col items-center">
                                  <div 
                                    className="w-24 h-24 rounded-lg overflow-hidden mb-2"
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
                          const pilot = historyLineup.qualifying[index] || null;
                          const pilotId = selectedHistoryGP?.qualifying_pilots?.[index];
                          const points = pilot && pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                          
                          return (
                            <div key={index} className="flex flex-col items-center">
                              <div 
                                className="w-24 h-24 rounded-lg overflow-hidden mb-2"
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
                                        alt={pilot.driver_name || pilot.DriverName}
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
                    <h4 className="text-small font-semibold text-text-primary mb-3">Práctica</h4>
                    <div className="flex justify-center gap-4">
                      {[0, 1].map((index) => {
                        const pilot = historyLineup.practice[index] || null;
                        const pilotId = selectedHistoryGP?.practice_pilots?.[index];
                        const points = pilot && pilotId ? (elementPoints[`pilot_${pilotId}`] || 0) : 0;
                        
                        return (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="w-24 h-24 rounded-lg overflow-hidden mb-2"
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
                                      alt={pilot.driver_name || pilot.DriverName}
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
                            </div>
                            <p className="text-caption font-bold text-text-primary">
                              {pilot ? `${points} pts` : '0 pts'}
                            </p>
                          </div>
                        );
                      })}
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
                          {(() => {
                            const points = elementPoints[`team_constructor_${selectedHistoryGP?.team_constructor_id}`] || 0;
                            
                            return (
                              <div className="flex flex-col items-center">
                                <div 
                                  className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                                  style={{
                                    background: historyTeamLineup.team_constructor ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                    border: `2px solid ${historyTeamLineup.team_constructor ? getBorderColor(points) : '#6B7280'}`,
                                    boxShadow: `0 0 15px ${historyTeamLineup.team_constructor ? getBorderColor(points) : '#6B7280'}30`
                                  }}
                                >
                                  {historyTeamLineup.team_constructor ? (
                                    <div className="w-full h-full flex items-center justify-center p-2">
                                      <div className="w-16 h-16 rounded-full overflow-hidden">
                                        <img
                                          src={getImageUrl(historyTeamLineup.team_constructor, 'team_constructor')}
                                          alt={historyTeamLineup.team_constructor.constructor_name || historyTeamLineup.team_constructor.name}
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
                                </div>
                                <p className="text-caption font-bold text-text-primary">
                                  {historyTeamLineup.team_constructor ? `${points} pts` : '0 pts'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Ingeniero Jefe */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Ingeniero Jefe</h4>
                        <div className="flex justify-center">
                          {(() => {
                            const points = elementPoints[`chief_engineer_${selectedHistoryGP?.chief_engineer_id}`] || 0;
                            
                            return (
                              <div className="flex flex-col items-center">
                                <div 
                                  className="w-24 h-24 rounded-lg overflow-hidden mb-2"
                                  style={{
                                    background: historyTeamLineup.chief_engineer ? `linear-gradient(135deg, ${getBorderColor(points)}20, ${getBorderColor(points)}40)` : 'linear-gradient(135deg, #6B728020, #6B728040)',
                                    border: `2px solid ${historyTeamLineup.chief_engineer ? getBorderColor(points) : '#6B7280'}`,
                                    boxShadow: `0 0 15px ${historyTeamLineup.chief_engineer ? getBorderColor(points) : '#6B7280'}30`
                                  }}
                                >
                                  {historyTeamLineup.chief_engineer ? (
                                    <div className="w-full h-full flex items-center justify-center p-2">
                                      <div className="w-16 h-16 rounded-full overflow-hidden">
                                        <img
                                          src={getImageUrl(historyTeamLineup.chief_engineer, 'chief_engineer')}
                                          alt={historyTeamLineup.chief_engineer.name}
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
                                </div>
                                <p className="text-caption font-bold text-text-primary">
                                  {historyTeamLineup.chief_engineer ? `${points} pts` : '0 pts'}
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Ingenieros de Pista */}
                      <div>
                        <h4 className="text-small font-semibold text-text-primary mb-3">Ingenieros de Pista</h4>
                        <div className="flex justify-center gap-4">
                          {[0, 1].map((index) => {
                            const engineer = historyTeamLineup.track_engineers[index] || null;
                            const engineerId = selectedHistoryGP?.track_engineers?.[index];
                            const points = engineer && engineerId ? (elementPoints[`track_engineer_${engineerId}`] || 0) : 0;
                            
                            return (
                              <div key={index} className="flex flex-col items-center">
                                <div 
                                  className="w-24 h-24 rounded-lg overflow-hidden mb-2"
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
                                </div>
                                <p className="text-caption font-bold text-text-primary">
                                  {engineer ? `${points} pts` : '0 pts'}
                                </p>
                              </div>
                            );
                          })}
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

  if (!selectedLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Users className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <CardTitle className="text-h3 text-text-primary mb-2">
              No League Selected
            </CardTitle>
            <p className="text-text-secondary text-body">
              Select a league to view player profiles
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-main mx-auto mb-4"></div>
            <p className="text-text-secondary text-body">Loading player profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Users className="h-12 w-12 text-state-error mx-auto mb-4" />
            <CardTitle className="text-h3 text-state-error mb-2">
              Error
            </CardTitle>
            <p className="text-text-secondary text-body">{error || 'Player not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-text-primary" />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="w-12 h-12 border-2 border-accent-main">
              <AvatarFallback className="text-text-primary font-bold text-lg">
                {player.name?.substring(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-h2 font-bold text-text-primary truncate">
                {player.name}
              </h1>
              <p className="text-text-secondary text-small">
                €{currentPlayerMoney || 0}
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-h2 font-bold text-accent-main">
              {player.points}
            </div>
            <p className="text-text-secondary text-caption">points</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs defaultValue="squad" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="squad" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Plantilla
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Puntos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="squad" className="space-y-6">
            {/* Pilots Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-5 w-5 text-accent-main" />
                <h2 className="text-h3 font-bold text-text-primary">Pilotos</h2>
                <Badge variant="secondary" className="ml-auto">
                  {playerSquad.pilots.length}
                </Badge>
              </div>
              
              {playerSquad.pilots.length === 0 ? (
                <Card className="text-center">
                  <CardContent className="py-8">
                    <Car className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary text-body">No pilots in squad</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {playerSquad.pilots.map((pilot) => (
                    <div key={pilot.id} className="relative">
                      <DriverRaceCard
                        driver={pilot}
                        showStats={true}
                        isOwned={pilot.owner_id === currentPlayerId}
                        onClick={() => handleCardClick(pilot, 'pilot')}
                        leagueId={selectedLeague.id}
                        hideOwnerInfo={true}
                      />
                      {pilot.owner_id !== currentPlayerId && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <PlayerItemActions
                            item={pilot}
                            itemType="pilot"
                            currentPlayerMoney={currentPlayerMoney}
                            onMakeOffer={(item, type) => handleMakeOffer(item, type)}
                            onActivateClausula={(clausulaValue) => handleActivateClausula(pilot, 'pilot', clausulaValue)}
                            isOwned={false}
                            existingOffers={existingOffers}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Track Engineers Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-accent-main" />
                <h2 className="text-h3 font-bold text-text-primary">Ingenieros de Pista</h2>
                <Badge variant="secondary" className="ml-auto">
                  {playerSquad.trackEngineers.length}
                </Badge>
              </div>
              
              {playerSquad.trackEngineers.length === 0 ? (
                <Card className="text-center">
                  <CardContent className="py-8">
                    <Wrench className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary text-body">No track engineers in squad</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {playerSquad.trackEngineers.map((engineer) => (
                    <div key={engineer.id} className="relative">
                      <EngineerCard
                        engineer={engineer}
                        type="track_engineer"
                        showStats={true}
                        isOwned={engineer.owner_id === currentPlayerId}
                        onClick={() => handleCardClick(engineer, 'track_engineer')}
                        leagueId={selectedLeague.id}
                        hideOwnerInfo={true}
                      />
                      {engineer.owner_id !== currentPlayerId && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <PlayerItemActions
                            item={engineer}
                            itemType="track_engineer"
                            currentPlayerMoney={currentPlayerMoney}
                            onMakeOffer={(item, type) => handleMakeOffer(item, type)}
                            onActivateClausula={(clausulaValue) => handleActivateClausula(engineer, 'track_engineer', clausulaValue)}
                            isOwned={false}
                            existingOffers={existingOffers}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chief Engineers Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-accent-main" />
                <h2 className="text-h3 font-bold text-text-primary">Ingenieros Jefe</h2>
                <Badge variant="secondary" className="ml-auto">
                  {playerSquad.chiefEngineers.length}
                </Badge>
              </div>
              
              {playerSquad.chiefEngineers.length === 0 ? (
                <Card className="text-center">
                  <CardContent className="py-8">
                    <Wrench className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary text-body">No chief engineers in squad</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {playerSquad.chiefEngineers.map((engineer) => (
                    <div key={engineer.id} className="relative">
                      <EngineerCard
                        engineer={engineer}
                        type="chief_engineer"
                        showStats={true}
                        isOwned={engineer.owner_id === currentPlayerId}
                        onClick={() => handleCardClick(engineer, 'chief_engineer')}
                        leagueId={selectedLeague.id}
                        hideOwnerInfo={true}
                      />
                      {engineer.owner_id !== currentPlayerId && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <PlayerItemActions
                            item={engineer}
                            itemType="chief_engineer"
                            currentPlayerMoney={currentPlayerMoney}
                            onMakeOffer={(item, type) => handleMakeOffer(item, type)}
                            onActivateClausula={(clausulaValue) => handleActivateClausula(engineer, 'chief_engineer', clausulaValue)}
                            isOwned={false}
                            existingOffers={existingOffers}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team Constructors Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-5 w-5 text-accent-main" />
                <h2 className="text-h3 font-bold text-text-primary">Equipos</h2>
                <Badge variant="secondary" className="ml-auto">
                  {playerSquad.teamConstructors.length}
                </Badge>
              </div>
              
              {playerSquad.teamConstructors.length === 0 ? (
                <Card className="text-center">
                  <CardContent className="py-8">
                    <Building2 className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                    <p className="text-text-secondary text-body">No teams in squad</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {playerSquad.teamConstructors.map((team) => (
                    <div key={team.id} className="relative">
                      <TeamCard
                        team={team}
                        showStats={true}
                        isOwned={team.owner_id === currentPlayerId}
                        onClick={() => handleCardClick(team, 'team_constructor')}
                        leagueId={selectedLeague.id}
                        hideOwnerInfo={true}
                      />
                      {team.owner_id !== currentPlayerId && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <PlayerItemActions
                            item={team}
                            itemType="team_constructor"
                            currentPlayerMoney={currentPlayerMoney}
                            onMakeOffer={(item, type) => handleMakeOffer(item, type)}
                            onActivateClausula={(clausulaValue) => handleActivateClausula(team, 'team_constructor', clausulaValue)}
                            isOwned={false}
                            existingOffers={existingOffers}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            {renderPoints()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal para hacer ofertas */}
      <MakeOfferModal
        isOpen={openMakeOfferModal}
        onClose={handleCloseMakeOfferModal}
        item={selectedOfferItem}
        type={selectedOfferType}
        onConfirm={handleConfirmMakeOffer}
        isLoading={loadingMakeOffer}
        playerMoney={currentPlayerMoney}
      />
    </div>
  );
} 