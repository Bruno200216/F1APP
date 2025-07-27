import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Lock } from 'lucide-react';
import { getTeamColor, cn, formatNumberWithDots } from '../lib/utils';

export default function EngineerRaceCard({ 
  engineer, 
  type = 'track_engineer', // 'track_engineer' o 'chief_engineer'
  showStats = false, 
  leagueId, 
  grand_prix = [],
  scoring_criteria = {},
  points = [],
  ...props
}) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(engineer.team);
  const [selectedGP, setSelectedGP] = useState(0);

  // Calcular días restantes de la cláusula
  let clausulaDias = null;
  if (engineer.clausula) {
    const expira = new Date(engineer.clausula);
    const ahora = new Date();
    const diff = expira - ahora;
    if (diff > 0) {
      clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  // Diccionario para mostrar nombres legibles de los criterios
  const readableCriteria = {
    exp_pos_mean: 'Posición esperada',
    experience: 'Experiencia',
    // Puedes añadir más criterios si los tienes
  };

  // Navegación al perfil de ingeniero
  const handleClick = () => {
    const engineerType = type === 'chief_engineer' ? 'chief' : 'track';
    navigate(`/profile/engineer/${engineerType}/${engineer.id}`);
  };

  return (
    <div className="max-w-lg w-full pt-4">
      <Card className="relative border-2 shadow-card cursor-pointer" style={{ borderColor: teamColor.primary }} onClick={handleClick}>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2" style={{ borderColor: teamColor.primary }}>
              <AvatarImage src={engineer.image_url ? `/images/ingenierosdepista/${engineer.image_url}` : ''} alt={engineer.name} />
              <AvatarFallback className="text-text-primary bg-surface">
                {engineer.name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-h2 font-bold mb-1" style={{ color: teamColor.primary }}>
                {engineer.name}
              </CardTitle>
              <p className="text-small text-text-secondary font-medium mb-2">{engineer.team}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" className="font-bold">
                  {type === 'chief_engineer' ? 'Ingeniero Jefe' : 'Ingeniero de Pista'}
                </Badge>
                <Badge variant="success" className="font-bold">
                  {formatNumberWithDots(engineer.value || 0)} €
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
          {/* Selector de GP si aplica */}
          {grand_prix && grand_prix.length > 0 && (
            <Tabs value={selectedGP.toString()} onValueChange={v => setSelectedGP(parseInt(v))}>
              <div className="mb-4">
                <h3 className="text-subtitle font-semibold text-text-primary mb-3 text-center">Gran Premio</h3>
                <TabsList className="grid w-full grid-cols-4 gap-1 bg-surface h-auto p-1">
                  {grand_prix.slice(0, 8).map((gp, idx) => (
                    <TabsTrigger 
                      key={gp.id} 
                      value={idx.toString()}
                      className="flex flex-col items-center p-2 h-auto data-[state=active]:bg-surface-elevated data-[state=active]:shadow-sm"
                      style={{ '--active-color': teamColor.primary }}
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
              </div>
            </Tabs>
          )}
          {/* Puntos en GP seleccionado */}
          {points && points.length > 0 && (
            <div className="text-center mb-6">
              <h3 className="text-subtitle font-bold mb-2" style={{ color: teamColor.primary }}>
                Puntos en este GP
              </h3>
              <div className="text-4xl font-black text-accent-main">
                {points[selectedGP] !== undefined ? points[selectedGP] : 0}
              </div>
            </div>
          )}
          {/* Tabla de criterios */}
          {scoring_criteria && Object.keys(scoring_criteria).length > 0 && (
            <div className="mt-6">
              <h3 className="text-subtitle font-bold mb-4" style={{ color: teamColor.primary }}>
                Criterios de Puntuación
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
                    {Object.entries(scoring_criteria).map(([key, value]) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 