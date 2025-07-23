import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import { getTeamColor, cn } from '../lib/utils';


export default function ProfilePage() {
  const { id } = useParams(); // id de pilots
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGP, setSelectedGP] = useState(0);

  useEffect(() => {
    if (!id || !selectedLeague?.id) return;
    setLoading(true);
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/pilot-profile/${id}?league_id=${selectedLeague.id}`);
        if (!res.ok) throw new Error('Piloto no encontrado');
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, selectedLeague]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-body text-text-primary">Cargando perfil...</p>
    </div>
  );

  if (!profile || !profile.pilot) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <h2 className="text-h2 font-semibold text-state-error">Piloto no encontrado</h2>
    </div>
  );
  const { pilot, pilot_by_league, grand_prix, scoring_criteria } = profile;
  const teamColor = getTeamColor(pilot?.team);

  // Calcular días restantes de la cláusula
  let clausulaDias = null;
  if (pilot_by_league?.clausula) {
    const expira = new Date(pilot_by_league.clausula);
    const ahora = new Date();
    const diff = expira - ahora;
    if (diff > 0) {
      clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  // Diccionario para mostrar nombres legibles de los criterios
  const readableCriteria = {
    practice_point_finish: 'Puntos por posición',
    practice_team_battle: 'Batalla de equipo',
    practice_red_flag: 'Bandera roja',
    qualifying_pass_q1: 'Pasa a Q1',
    qualifying_pass_q2: 'Pasa a Q2',
    qualifying_position_finish: 'Posición final',
    qualifying_team_battle: 'Batalla de equipo',
    qualifying_red_flag: 'Bandera roja',
    race_points: 'Puntos por posición',
    race_position: 'Posición en carrera',
    start_position: 'Posición de salida',
    finish_position: 'Posición final',
    fastest_lap: 'Vuelta rápida',
    driver_of_the_day: 'Piloto del día',
    safety_car: 'Safety Car',
    race_team_battle: 'Batalla de equipo',
    race_red_flag: 'Bandera roja',
  };

  return (
    <div className="min-h-screen bg-background p-0">
      <div className="max-w-lg mx-auto pt-16">
        <Card className="relative border-2 shadow-card" style={{ borderColor: teamColor.primary }}>
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="icon"
            className="absolute top-3 right-3 text-text-primary hover:bg-surface-elevated"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 border-2" style={{ borderColor: teamColor.primary }}>
                <AvatarImage src={pilot?.image_url ? `/images/${pilot.image_url}` : ''} alt={pilot.driver_name} />
                <AvatarFallback className="text-text-primary bg-surface">
                  {pilot.driver_name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-h2 font-bold mb-1" style={{ color: teamColor.primary }}>
                  {pilot.driver_name}
                </CardTitle>
                <p className="text-small text-text-secondary font-medium mb-2">{pilot.team}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent" className="font-bold">
                    Modo: {pilot_by_league?.mode?.toUpperCase()}
                  </Badge>
                  <Badge variant="success" className="font-bold">
                    {(pilot.value || 0).toLocaleString()} €
                  </Badge>
                  {clausulaDias && (
                    <Badge variant="error" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>{clausulaDias} días</span>
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Grand Prix Selector using Tabs */}
            <Tabs value={selectedGP.toString()} onValueChange={(value) => setSelectedGP(parseInt(value))}>
              <div className="mb-4">
                <h3 className="text-subtitle font-semibold text-text-primary mb-3 text-center">Gran Premio</h3>
                <TabsList className="grid w-full grid-cols-4 gap-1 bg-surface h-auto p-1">
                  {(grand_prix || []).slice(0, 8).map((gp, idx) => (
                    <TabsTrigger 
                      key={gp.id} 
                      value={idx.toString()}
                      className="flex flex-col items-center p-2 h-auto data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
                      style={{ 
                        '--active-color': teamColor.primary 
                      }}
                    >
                      <div className="flex flex-col items-center">
                        {gp.flag && (
                          <img 
                            src={`/images/flags/${gp.flag}`} 
                            alt={gp.country} 
                            className="w-6 h-4 mb-1 rounded-sm border border-border"
                          />
                        )}
                        <span className="text-xs font-medium truncate max-w-full">
                          {gp.country?.length > 8 ? gp.country.substring(0, 6) + '...' : gp.country}
                        </span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {/* Show more GPs if there are more than 8 */}
                {(grand_prix || []).length > 8 && (
                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                    {(grand_prix || []).slice(8).map((gp, idx) => (
                      <Button
                        key={gp.id}
                        variant={selectedGP === idx + 8 ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedGP(idx + 8)}
                        className="text-xs px-2 py-1 h-auto flex flex-col items-center gap-1"
                      >
                        <div className="flex flex-col items-center">
                          {gp.flag && (
                            <img 
                              src={`/images/flags/${gp.flag}`} 
                              alt={gp.country} 
                              className="w-4 h-3 mb-1 rounded-sm border border-border"
                            />
                          )}
                          <span className="text-xs">
                            {gp.country?.length > 6 ? gp.country.substring(0, 4) + '...' : gp.country}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </Tabs>
            
            {/* Selected GP Display */}
            <div className="text-center mb-6">
              <h2 className="text-h3 font-bold mb-2" style={{ color: teamColor.primary }}>
                {(grand_prix && grand_prix[selectedGP]) ? grand_prix[selectedGP].country : ''}
              </h2>
            </div>
            {/* Points Display */}
            <div className="text-center mb-6">
              <h3 className="text-subtitle font-bold mb-2" style={{ color: teamColor.primary }}>
                Puntos en este GP
              </h3>
              <div className="text-4xl font-black text-accent-main">
                {pilot_by_league?.points && pilot_by_league.points[selectedGP] !== undefined ? pilot_by_league.points[selectedGP] : 0}
              </div>
            </div>
            {/* Scoring Criteria Table */}
            <div className="mt-6">
              <h3 className="text-subtitle font-bold mb-4" style={{ color: teamColor.primary }}>
                Criterios de Puntuación ({pilot_by_league?.mode?.toUpperCase()})
              </h3>
              <div className="bg-surface-elevated rounded-md border border-border overflow-hidden">
                <table className="w-full text-text-primary">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left py-3 px-4 text-small font-semibold text-text-secondary">Criterio</th>
                      <th className="text-right py-3 px-4 text-small font-semibold text-text-secondary">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoring_criteria && Object.entries(scoring_criteria).map(([key, value]) => (
                      <tr key={key} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                        <td className="py-3 px-4 text-small">{readableCriteria[key] || key}</td>
                        <td className="py-3 px-4 text-small text-right font-medium">
                          {Array.isArray(value) && value !== null
                            ? (value[selectedGP] !== undefined && value[selectedGP] !== null ? value[selectedGP] : 0)
                            : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 