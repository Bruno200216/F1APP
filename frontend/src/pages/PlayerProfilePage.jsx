import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { cn, formatCurrency, getTeamColor } from '../lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';

// Icons
import { ArrowLeft, Trophy, Users, TrendingUp, Car, Wrench, Building2 } from 'lucide-react';

// Components
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerCard from '../components/EngineerCard';
import TeamCard from '../components/TeamCard';
import PlayerItemActions from '../components/PlayerItemActions';

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
  
  // Obtener el ID del usuario actual
  const currentPlayerId = Number(localStorage.getItem('player_id'));

  useEffect(() => {
    if (selectedLeague && playerId) {
      fetchPlayerData();
    }
  }, [selectedLeague, playerId]);

  const fetchPlayerData = async () => {
    if (!selectedLeague || !playerId) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Fetch player basic info
      const playerRes = await fetch(`/api/leagues/${selectedLeague.id}/classification`);
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
        navigate(`/profile/engineer/track/${item.track_engineer_id}?league_id=${selectedLeague.id}`);
        break;
      case 'chief_engineer':
        navigate(`/profile/engineer/chief/${item.chief_engineer_id}?league_id=${selectedLeague.id}`);
        break;
      case 'team_constructor':
        navigate(`/profile/team/${item.team_constructor_id}?league_id=${selectedLeague.id}`);
        break;
    }
  };

  const handleMakeOffer = async (item, itemType, offerValue) => {
    try {
      console.log('Enviando oferta:', { item, itemType, offerValue, leagueId: selectedLeague.id });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/${itemType}/make-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_id: item.id,
          league_id: selectedLeague.id,
          offer_value: offerValue
        })
      });

      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al enviar la oferta');
      }

      alert('Oferta enviada correctamente');
      // Recargar datos del jugador y ofertas existentes
      fetchPlayerData();
      await fetchExistingOffers();
    } catch (error) {
      console.error('Error en handleMakeOffer:', error);
      throw new Error(error.message);
    }
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
                €{player.money?.toLocaleString('es-ES') || '0'}
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
                            onMakeOffer={(offerValue) => handleMakeOffer(pilot, 'pilot', offerValue)}
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
                            onMakeOffer={(offerValue) => handleMakeOffer(engineer, 'track_engineer', offerValue)}
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
                            onMakeOffer={(offerValue) => handleMakeOffer(engineer, 'chief_engineer', offerValue)}
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
                            onMakeOffer={(offerValue) => handleMakeOffer(team, 'team_constructor', offerValue)}
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
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-accent-main" />
              <h2 className="text-h3 font-bold text-text-primary">Historial de Puntos</h2>
            </div>
            
            {playerPoints.length === 0 ? (
              <Card className="text-center">
                <CardContent className="py-12">
                  <Trophy className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                  <p className="text-text-secondary text-body">No points history available</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {playerPoints.map((point, index) => (
                  <Card key={index} className="border-border hover:border-accent-hover transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {point.gp_name || `GP ${point.gp_index}`}
                          </h3>
                          <p className="text-text-secondary text-small">
                            {point.date ? new Date(point.date).toLocaleDateString('es-ES') : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-h3 font-bold text-accent-main">
                            {point.points}
                          </div>
                          <p className="text-text-secondary text-caption">points</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 