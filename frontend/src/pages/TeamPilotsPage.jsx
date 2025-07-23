import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { cn } from '../lib/utils';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

// Icons
import { Users, Settings, Trophy, AlertCircle, Plus, Trash2 } from 'lucide-react';

// Existing components (will be phased out)
import DriverRaceCard from '../components/DriverRaceCard';
import EngineerRaceCard from '../components/EngineerRaceCard';
import TeamRaceCard from '../components/TeamRaceCard';
import EngineerActionsMenu from '../components/EngineerActionsMenu';
import TeamConstructorActionsMenu from '../components/TeamConstructorActionsMenu';

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

        const teamRes = await fetch(`/api/players/${player_id}/team?league_id=${selectedLeague.id}`);
        const teamData = await teamRes.json();
        
        if (teamData.team) {
          setTeamData({
            pilots: teamData.team.pilots || [],
            track_engineers: teamData.team.track_engineers || [],
            chief_engineers: teamData.team.chief_engineers || [],
            team_constructors: teamData.team.team_constructors || []
          });
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

  const handleAddToMarket = (item) => {
    setSelectedDriver(item);
    setSellPrice(item?.value || '');
    setOpenSellModal(true);
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
    
    try {
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const res = await fetch('/api/pilotbyleague/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          pilot_by_league_id: selectedDriver.id,
          venta: Number(sellPrice)
        })
      });
      
      const text = await res.clone().text();
      const data = JSON.parse(text);
      
      if (res.ok) {
        setSnackbar({ open: true, message: 'Piloto puesto a la venta', severity: 'success' });
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
        setSnackbar({ open: true, message: data.error || 'Error al poner a la venta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    } finally {
      setLoadingSell(false);
    }
  };

  // F1 Grid Layout for lineup
  const renderF1Grid = () => (
    <div className="flex flex-col items-center mt-6 mb-8">
      <Card className="w-80 min-h-96 bg-gradient-to-b from-surface to-surface-elevated border-border shadow-card">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* First row: 2 pilots */}
            <div className="flex justify-center gap-4">
              {teamData.pilots.slice(0, 2).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-16 h-16 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-small text-center">
                    {driver.driver_name}
                  </span>
                </div>
              ))}
            </div>

            {/* Second row: 4 pilots */}
            <div className="flex justify-center gap-3">
              {teamData.pilots.slice(2, 6).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold text-small">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-caption text-center">
                    {driver.driver_name}
                  </span>
                </div>
              ))}
            </div>

            {/* Third row: 4 pilots */}
            <div className="flex justify-center gap-2">
              {teamData.pilots.slice(6, 10).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-12 h-12 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold text-caption">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-caption text-center">
                    {driver.driver_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
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
              {teamData.pilots.map(driver => (
                <div key={driver.id} className="flex items-center bg-surface p-4 rounded-lg border border-border">
                  <Avatar className="w-14 h-14 mr-4 border-2 border-accent-main">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-text-primary font-bold text-body">{driver.driver_name}</h3>
                    <p className="text-text-secondary text-small">{driver.team}</p>
                    <span className="inline-block bg-state-success/20 text-state-success px-2 py-1 rounded text-caption">
                      Piloto
                    </span>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-accent-main font-bold text-body">
                      €{Number(driver.value).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToMarket(driver)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Vender
                  </Button>
                </div>
              ))}
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
              {teamData.track_engineers.map(engineer => (
                <div key={engineer.id} className="flex items-center bg-surface p-4 rounded-lg border border-border">
                  <Avatar className="w-14 h-14 mr-4 border-2 border-accent-main">
                    <AvatarImage 
                      src={engineer.image_url ? `/images/ingenierosdepista/${engineer.image_url}` : ''} 
                      alt={engineer.engineer_name}
                    />
                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                      {engineer.engineer_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-text-primary font-bold text-body">{engineer.engineer_name}</h3>
                    <p className="text-text-secondary text-small">{engineer.constructor_name}</p>
                    <span className="inline-block bg-state-success/20 text-state-success px-2 py-1 rounded text-caption">
                      Ingeniero de Pista
                    </span>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-accent-main font-bold text-body">
                      €{Number(engineer.value).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <EngineerActionsMenu 
                    engineer={{ ...engineer, type: 'track_engineer' }}
                    onSell={() => {
                      // Refresh team data
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
                </div>
              ))}
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
              {teamData.chief_engineers.map(engineer => (
            <div key={engineer.id} className="flex items-center bg-surface p-4 rounded-lg border border-border mb-4">
              <Avatar className="w-14 h-14 mr-4 border-2 border-accent-main">
                <AvatarImage 
                  src={engineer.image_url ? `/images/ingenierosdepista/${engineer.image_url}` : ''} 
                  alt={engineer.engineer_name}
                />
                <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                  {engineer.engineer_name?.substring(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-text-primary font-bold text-body">{engineer.engineer_name}</h3>
                <p className="text-text-secondary text-small">{engineer.constructor_name}</p>
                <span className="inline-block bg-state-success/20 text-state-success px-2 py-1 rounded text-caption">
                  Ingeniero Jefe
                </span>
              </div>
              <div className="text-right mr-4">
                <p className="text-accent-main font-bold text-body">
                  €{Number(engineer.value).toLocaleString('es-ES')}
                </p>
              </div>
              <EngineerActionsMenu 
                engineer={{ ...engineer, type: 'chief_engineer' }}
                onSell={() => {
                  // Refresh team data
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
            </div>
          ))}
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
              {teamData.team_constructors.map(team => (
                <div key={team.id} className="flex items-center bg-surface p-4 rounded-lg border border-border">
                  <Avatar className="w-14 h-14 mr-4 border-2 border-accent-main">
                    <AvatarImage 
                      src={team.image_url ? `/images/equipos/${team.image_url}` : ''} 
                      alt={team.constructor_name}
                    />
                    <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                      {team.constructor_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-text-primary font-bold text-body">{team.constructor_name}</h3>
                    <p className="text-text-secondary text-small">{team.constructor_name}</p>
                    <span className="inline-block bg-state-success/20 text-state-success px-2 py-1 rounded text-caption">
                      Equipo Constructor
                    </span>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-accent-main font-bold text-body">
                      €{Number(team.value).toLocaleString('es-ES')}
                    </p>
                  </div>
                  <TeamConstructorActionsMenu 
                    team={team}
                    onSell={() => {
                      // Refresh team data
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Points: lineup with points (for now just shows grid with 0 points)
  const renderPoints = () => (
    <div className="flex flex-col items-center mt-6 mb-8">
      <Card className="w-80 min-h-96 bg-gradient-to-b from-surface to-surface-elevated border-border shadow-card">
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* First row: 2 pilots with points */}
            <div className="flex justify-center gap-4">
              {teamData.pilots.slice(0, 2).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-16 h-16 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-small text-center mb-1">
                    {driver.driver_name}
                  </span>
                  <span className="text-accent-main font-bold text-body">0 pts</span>
                </div>
              ))}
            </div>

            {/* Second row: 4 pilots with points */}
            <div className="flex justify-center gap-3">
              {teamData.pilots.slice(2, 6).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-14 h-14 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold text-small">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-caption text-center mb-1">
                    {driver.driver_name}
                  </span>
                  <span className="text-accent-main font-bold text-small">0 pts</span>
                </div>
              ))}
            </div>

            {/* Third row: 4 pilots with points */}
            <div className="flex justify-center gap-2">
              {teamData.pilots.slice(6, 10).map((driver) => (
                <div key={driver.id} className="flex flex-col items-center">
                  <Avatar className="w-12 h-12 border-2 border-accent-main mb-2">
                    <AvatarImage 
                      src={driver.image_url ? `/images/${driver.image_url}` : ''} 
                      alt={driver.driver_name}
                    />
                    <AvatarFallback className="bg-surface text-text-primary font-bold text-caption">
                      {driver.driver_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-text-primary font-bold text-caption text-center mb-1">
                    {driver.driver_name}
                  </span>
                  <span className="text-accent-main font-bold text-small">0 pts</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="text-text-secondary mt-8">No hay jornadas jugadas.</p>
    </div>
  );

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
              Fijar precio de venta
            </DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-20 h-20 border-2 border-accent-main">
                <AvatarImage 
                  src={selectedDriver.image_url ? `/images/${selectedDriver.image_url}` : ''} 
                  alt={selectedDriver.driver_name}
                />
                <AvatarFallback className="bg-surface-elevated text-text-primary font-bold text-lg">
                  {selectedDriver.driver_name?.substring(0, 2) || '??'}
                </AvatarFallback>
              </Avatar>

              <div className="text-center space-y-2">
                <div className="space-y-1">
                  <p className="text-accent-main font-bold text-small">VALOR DE MERCADO</p>
                  <p className="text-text-primary font-bold text-body">
                    €{Number(selectedDriver.value).toLocaleString('es-ES')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-state-error font-bold text-small">VALOR DE CLÁUSULA</p>
                  <p className="text-text-primary font-bold text-body">
                    {selectedDriver.clausula}
                  </p>
                </div>
              </div>

              <div className="w-full space-y-4">
                <div className="flex items-center bg-surface-elevated border border-border rounded-md px-3 py-2">
                  <span className="text-text-secondary font-bold mr-2">€</span>
                  <Input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    placeholder={Number(selectedDriver.value).toLocaleString('es-ES')}
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