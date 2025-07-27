import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { ChevronLeft, ChevronRight, X, Lock } from 'lucide-react';
import { useLeague } from '../context/LeagueContext';
import { getTeamColor } from '../lib/utils';
import PlayerItemActions from '../components/PlayerItemActions';

export default function EngineerProfilePage() {
  const { type, id } = useParams();
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [engineer, setEngineer] = useState(null);
  const [trackEngineer, setTrackEngineer] = useState(null);
  const [chiefEngineer, setChiefEngineer] = useState(null);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grandPrix, setGrandPrix] = useState([]);
  const [selectedGP, setSelectedGP] = useState(0);
  const [playerMoney, setPlayerMoney] = useState(0);
  const gpRefs = useRef([]);

  // Función para formatear números con puntos
  const formatNumberWithDots = (amount) => {
    const num = Number(amount);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(num);
  };

  useEffect(() => {
    if (!id || !type || !selectedLeague?.id) return;
    setLoading(true);
    setError('');
    fetch(`/api/${type === 'track' ? 'trackengineersbyleague' : 'chiefengineersbyleague'}?id=${id}&league_id=${selectedLeague.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'No data');
        
        // Los datos vienen en formato { engineer: {...}, track_engineer: {...}, pilots: [...] }
        const engineerData = data.engineer;
        const baseEngineerData = type === 'track' ? data.track_engineer : data.chief_engineer;
        
        if (engineerData && baseEngineerData) {
          // Combinar datos del engineer (liga) con los datos base
          const combinedData = { ...baseEngineerData, ...engineerData };
          setEngineer(combinedData);
          setTrackEngineer(type === 'track' ? combinedData : null);
          setChiefEngineer(type === 'chief' ? combinedData : null);
        } else {
          setEngineer(null);
          setTrackEngineer(null);
          setChiefEngineer(null);
        }
        setPilots(data.pilots || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, type, selectedLeague]);

  useEffect(() => {
    fetch('/api/grand-prix')
      .then(res => res.json())
      .then(data => setGrandPrix(data.gps || []));
  }, []);

  useEffect(() => {
    // Obtener dinero del jugador
    const fetchPlayerMoney = async () => {
      try {
        const player_id = localStorage.getItem('player_id');
        if (player_id && selectedLeague) {
          const res = await fetch(`/api/playerbyleague?player_id=${player_id}&league_id=${selectedLeague.id}`);
          const data = await res.json();
          setPlayerMoney(data.player_by_league?.money ?? 0);
        }
      } catch (e) {
        setPlayerMoney(0);
      }
    };
    fetchPlayerMoney();
  }, [selectedLeague]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-body text-text-primary">Cargando perfil...</p></div>;
  if (error || !engineer) return <div className="min-h-screen bg-background flex items-center justify-center"><h2 className="text-h2 font-semibold text-state-error">{error || 'Ingeniero no encontrado'}</h2></div>;

  // Datos principales
  const data = type === 'track' ? trackEngineer : chiefEngineer;
  if (!data) return <div className="min-h-screen bg-background flex items-center justify-center"><h2 className="text-h2 font-semibold text-state-error">Ingeniero no encontrado</h2></div>;
  const teamColor = getTeamColor(data.team || '');

  // Parse points_by_gp (puede ser json string o array)
  let pointsByGP = [];
  try {
    if (data.points_by_gp) {
      pointsByGP = typeof data.points_by_gp === 'string' ? JSON.parse(data.points_by_gp) : data.points_by_gp;
    }
  } catch (e) { pointsByGP = []; }

  // Tabla de criterios legibles
  const readableCriteria = type === 'chief'
    ? {
        TeamExpectedPosition: 'Posición esperada equipo',
        TeamFinishPosition: 'Posición real equipo',
        Delta: 'Delta equipo',
        TotalPoints: 'Puntos totales',
      }
    : {
        Performance: 'Performance',
        TotalPoints: 'Puntos totales',
      };

  // Barra de navegación de GPs con flechas y scroll
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
                <AvatarImage src={data.image_url ? `/images/ingenierosdepista/${data.image_url}` : ''} alt={data.name} />
                <AvatarFallback className="text-text-primary bg-surface">
                  {data.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-h2 font-bold mb-1" style={{ color: teamColor.primary }}>
                  {data.name}
                </CardTitle>
                                  <p className="text-small text-text-secondary font-medium mb-2">{data.team || ''}</p>
                {type === 'track' && pilots && pilots.length > 0 && (
                  <p className="text-small text-text-primary font-medium mb-2">
                    👤 Piloto asignado: <span className="font-bold" style={{ color: teamColor.primary }}>{pilots[0].driver_name}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent" className="font-bold">
                    {type === 'track' ? 'Ingeniero de pista' : 'Chief Engineer'}
                  </Badge>
                  <Badge variant="success" className="font-bold">
                    {formatNumberWithDots(data.value || 0)} €
                  </Badge>
                  {engineer.clausula_value && (
                    <Badge variant="error" className="flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      <span>{formatNumberWithDots(engineer.clausula_value)} €</span>
                    </Badge>
                  )}
                  {engineer.clausulatime && (
                    <Badge variant="warning" className="text-xs">
                      Exp: {new Date(engineer.clausulatime).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* Botón de acciones para hacer oferta */}
          <div className="px-6 pb-4">
            <PlayerItemActions
              item={{
                id: engineer.id,
                name: data.name,
                value: data.value,
                image_url: data.image_url,
                team: data.team || '',
                clausula_value: engineer.clausula_value,
                clausula_expires_at: engineer.clausulatime
              }}
              itemType={type === 'track' ? 'track_engineer' : 'chief_engineer'}
              currentPlayerMoney={playerMoney}
              onMakeOffer={async (offerValue) => {
                // Navegar a la página de oferta
                const searchParams = new URLSearchParams({
                  type: type === 'track' ? 'track_engineer' : 'chief_engineer',
                  id: engineer.id.toString()
                });
                navigate(`/make-offer?${searchParams.toString()}`);
              }}
              onActivateClausula={async () => {
                // Implementar activación de cláusula si es necesario
                console.log('Activar cláusula');
              }}
              isOwned={false}
              existingOffers={[]}
            />
          </div>
          
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