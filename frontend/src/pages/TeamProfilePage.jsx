import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { X, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTeamColor } from '../lib/utils';
import { useLeague } from '../context/LeagueContext';

export default function TeamProfilePage() {
  const { id } = useParams();
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [teamConstructor, setTeamConstructor] = useState(null);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grandPrix, setGrandPrix] = useState([]);
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
    setSelectedGP((prev) => Math.min(prev + 1, grandPrix.length - 1));
    setTimeout(() => {
      if (gpRefs.current[selectedGP + 1]) {
        gpRefs.current[selectedGP + 1].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 50);
  };

  useEffect(() => {
    if (!id || !selectedLeague?.id) return;
    setLoading(true);
    setError('');
    fetch(`/api/teamconstructorsbyleague?id=${id}&league_id=${selectedLeague.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'No data');
        setTeam(data.team || data);
        setTeamConstructor(data.team_constructor || null);
        setPilots(data.pilots || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, selectedLeague]);

  useEffect(() => {
    fetch('/api/grand-prix')
      .then(res => res.json())
      .then(data => setGrandPrix(data.gps || []));
  }, []);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-body text-text-primary">Cargando perfil...</p></div>;
  if (error || !team) return <div className="min-h-screen bg-background flex items-center justify-center"><h2 className="text-h2 font-semibold text-state-error">{error || 'Equipo no encontrado'}</h2></div>;

  const data = teamConstructor;
  if (!data) return <div className="min-h-screen bg-background flex items-center justify-center"><h2 className="text-h2 font-semibold text-state-error">Equipo no encontrado</h2></div>;
  const teamColor = getTeamColor(data.Name);

  // Parse points_by_gp (puede ser json string o array)
  let pointsByGP = [];
  try {
    if (data.points_by_gp) {
      pointsByGP = typeof data.points_by_gp === 'string' ? JSON.parse(data.points_by_gp) : data.points_by_gp;
    }
  } catch (e) { pointsByGP = []; }

  // Tabla de criterios legibles
  const readableCriteria = {
    exp_pos_mean: 'Posición esperada',
    real_mean: 'Posición real media',
    delta: 'Delta',
    total_points: 'Puntos totales',
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
                <AvatarImage src={data.ImageURL ? `/images/equipos/${data.ImageURL}` : ''} alt={data.Name} />
                <AvatarFallback className="text-text-primary bg-surface">
                  {data.Name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-h2 font-bold mb-1" style={{ color: teamColor.primary }}>
                  {data.Name}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent" className="font-bold">
                    Equipo
                  </Badge>
                  <Badge variant="success" className="font-bold">
                    {(data.Value || 0).toLocaleString()} €
                  </Badge>
                  {/* Mostrar cláusula y expiración si existen en el objeto team (by_league) */}
                  {(team.ClausulaValue || team.clausula_value) && (
                    <Badge variant="error" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>{Number(team.ClausulaValue || team.clausula_value).toLocaleString()} €</span>
                    </Badge>
                  )}
                  {(team.ClausulaExpiresAt || team.clausula_expires_at) && (
                    <Badge variant="warning" className="text-xs">
                      Exp: {new Date(team.ClausulaExpiresAt || team.clausula_expires_at).toLocaleDateString()}
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
                {grandPrix.map((gp, idx) => (
                  <div
                    key={gp.gp_index}
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
                disabled={selectedGP === grandPrix.length - 1}
                className="text-accent-main hover:bg-surface-elevated"
                style={{ borderRadius: 12 }}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
            {/* Selected GP Display */}
            <div className="text-center mb-6">
              <h2 className="text-h3 font-bold mb-2" style={{ color: teamColor.primary }}>
                {(grandPrix && grandPrix[selectedGP]) ? grandPrix[selectedGP].country : ''}
              </h2>
            </div>
            {/* Points Display */}
            <div className="text-center mb-6">
              <h3 className="text-subtitle font-bold mb-2" style={{ color: teamColor.primary }}>
                Puntos en este GP
              </h3>
              <div className="text-4xl font-black text-accent-main">
                {pointsByGP && pointsByGP[selectedGP] !== undefined ? pointsByGP[selectedGP] : 0}
              </div>
            </div>
            {/* Pilotos asignados */}
            <div className="mt-6">
              <div className="text-md font-bold mb-2">Pilotos asignados</div>
              {Array.isArray(pilots) && pilots.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {pilots.map(pilot => (
                    <div key={pilot.id} className="flex items-center gap-3 p-2 bg-surface rounded">
                      <Avatar className="w-10 h-10 border-2 border-accent-main">
                        <AvatarImage src={pilot.image_url ? `/images/${pilot.image_url}` : ''} alt={pilot.driver_name} />
                        <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                          {pilot.driver_name?.substring(0, 2) || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-text-primary truncate">{pilot.driver_name}</div>
                        <div className="text-xs text-text-secondary truncate">{pilot.team}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-secondary">No hay pilotos asignados a este equipo.</div>
              )}
            </div>
            {/* Scoring Criteria Table */}
            <div className="mt-6">
              <h3 className="text-subtitle font-bold mb-4" style={{ color: teamColor.primary }}>
                Criterios de Puntuación
              </h3>
              <div className="bg-surface-elevated rounded-md border border-border overflow-hidden">
                <table className="w-full text-text-primary">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="text-left py-3 px-4 text-small font-semibold text-text-secondary">Cantidad</th>
                      <th className="text-left py-3 px-4 text-small font-semibold text-text-secondary">Criterio</th>
                      <th className="text-right py-3 px-4 text-small font-semibold text-text-secondary">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(readableCriteria).map(([key, label]) => (
                      <tr key={key} className="border-b border-border last:border-b-0 hover:bg-surface transition-colors">
                        <td className="py-3 px-4 text-small text-center font-medium">
                          {data[key] !== undefined && data[key] !== null ? data[key] : 0}
                        </td>
                        <td className="py-3 px-4 text-small">{label}</td>
                        <td className="py-3 px-4 text-small text-right font-medium">
                          {data[key] !== undefined && data[key] !== null ? data[key] : '-'}
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