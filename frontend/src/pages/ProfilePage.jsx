import React, { useEffect, useState, useRef } from 'react';
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
  const gpRefs = useRef([]);

  const handlePrevGP = () => {
    setSelectedGP((prev) => Math.max(prev - 1, 0));
    setTimeout(() => {
      if (gpRefs.current[selectedGP - 1]) {
        gpRefs.current[selectedGP - 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);
  };
  const handleNextGP = () => {
    setSelectedGP((prev) => Math.min(prev + 1, (grand_prix || []).length - 1));
    setTimeout(() => {
      if (gpRefs.current[selectedGP + 1]) {
        gpRefs.current[selectedGP + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);
  };

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
  if (pilot_by_league?.clausula_expires_at) {
    const expira = new Date(pilot_by_league.clausula_expires_at);
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
                  {pilot_by_league?.clausula_value && (
                    <Badge variant="error" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>{pilot_by_league.clausula_value?.toLocaleString()} €</span>
                    </Badge>
                  )}
                  {clausulaDias && (
                    <Badge variant="warning" className="text-xs">
                      Exp: {clausulaDias} días
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de navegación de GPs con flechas SIEMPRE visible */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevGP}
                disabled={selectedGP === 0}
                className="text-accent-main hover:bg-surface-elevated"
                style={{ borderRadius: 12 }}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-2" style={{ maxWidth: 320 }}>
                {(grand_prix || []).map((gp, idx) => (
                  <div
                    key={gp.gp_index || gp.id}
                    ref={el => gpRefs.current[idx] = el}
                    onClick={() => setSelectedGP(idx)}
                    className={
                      'flex flex-col items-center cursor-pointer p-2 rounded-lg transition-all ' +
                      (selectedGP === idx
                        ? 'bg-surface-elevated shadow-card border-2 border-accent-main'
                        : 'bg-surface hover:bg-surface-elevated border border-border')
                    }
                    style={{ minWidth: 64, maxWidth: 80 }}
                  >
                    {gp.flag && (
                      <img
                        src={`/images/flags/${gp.flag}`}
                        alt={gp.country}
                        className="w-8 h-5 mb-1 rounded border border-border"
                        style={{ boxShadow: selectedGP === idx ? '0 0 8px #9D4EDD' : undefined }}
                      />
                    )}
                    <span
                      className="text-xs font-semibold text-center"
                      style={{ color: selectedGP === idx ? '#9D4EDD' : '#C9A9DD', fontWeight: 600 }}
                    >
                      {gp.country?.length > 8 ? gp.country.substring(0, 6) + '...' : gp.country}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextGP}
                disabled={selectedGP === (grand_prix || []).length - 1}
                className="text-accent-main hover:bg-surface-elevated"
                style={{ borderRadius: 12 }}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
            
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
                      <th className="text-left py-3 px-4 text-small font-semibold text-text-secondary">Cantidad</th>
                      <th className="text-left py-3 px-4 text-small font-semibold text-text-secondary">Criterio</th>
                      <th className="text-right py-3 px-4 text-small font-semibold text-text-secondary">Puntos que da</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Adaptar scoring_criteria si es objeto de arrays (formato antiguo)
                      let criteriaArr = [];
                      if (Array.isArray(scoring_criteria) && scoring_criteria[selectedGP]) {
                        criteriaArr = scoring_criteria[selectedGP];
                      } else if (scoring_criteria && typeof scoring_criteria === 'object' && !Array.isArray(scoring_criteria)) {
                        // Transformar a array de objetos {name, value} para el GP seleccionado
                        criteriaArr = Object.entries(scoring_criteria).map(([key, arr]) => ({
                          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          value: Array.isArray(arr) && arr[selectedGP] != null ? arr[selectedGP] : 0
                        }));
                      }
                      return criteriaArr.filter(crit => crit && crit.name && !crit.name.toLowerCase().includes('delta')).map((crit, idx) => {
                        // Lógica de puntos por criterio según las reglas del juego
                        let points = 0;
                        const originalKey = Object.keys(scoring_criteria).find(key => 
                          key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) === crit.name
                        );
                        
                        if (originalKey) {
                          switch (originalKey) {
                            case 'points': points = crit.value || 0; break;
                            case 'positions_gained_at_start': points = crit.value > 1 ? 3 : 0; break;
                            case 'clean_overtakes': points = crit.value * 2; break;
                            case 'net_positions_lost': points = crit.value * -1; break;
                            case 'fastest_lap': points = crit.value ? 5 : 0; break;
                            case 'caused_vsc': points = crit.value ? -5 : 0; break;
                            case 'caused_sc': points = crit.value ? -8 : 0; break;
                            case 'caused_red_flag': points = crit.value ? -12 : 0; break;
                            case 'dnf_driver_error': points = crit.value ? -10 : 0; break;
                            case 'dnf_no_fault': points = crit.value ? -3 : 0; break;
                            case 'expected_position': points = 0; break;
                            case 'finish_position': 
                              // Calcular puntos del delta de posición
                              const expectedPos = scoring_criteria.expected_position?.[selectedGP];
                              const finishPos = crit.value;
                              if (expectedPos && finishPos) {
                                const delta = expectedPos - finishPos;
                                const mode = pilot_by_league?.mode?.toLowerCase();
                                const multiplier = mode === 'r' || mode === 'race' ? 10 : 
                                                 mode === 'q' || mode === 'qualy' ? 6 : 2;
                                const cap = mode === 'r' || mode === 'race' ? 50 : 
                                           mode === 'q' || mode === 'qualy' ? 30 : 10;
                                let deltaPoints = delta > 0 ? delta * multiplier : delta * (multiplier / 2);
                                points = Math.max(-cap, Math.min(cap, deltaPoints));
                              } else {
                                points = 0;
                              }
                              break;
                            case 'delta_position': points = 0; break;
                            default: points = 0;
                          }
                        }
                        return (
                          <tr key={crit.name} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                            <td className="py-3 px-4 text-small text-center font-medium">{crit.value || 0}</td>
                            <td className="py-3 px-4 text-small">{crit.name}</td>
                            <td className="py-3 px-4 text-small text-right font-medium">{points}</td>
                          </tr>
                        );
                      });
                    })()}
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