import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getTeamColor, formatCurrency } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp } from 'lucide-react';

export default function EngineerCard({ 
  engineer, 
  type = 'track', // 'track' or 'chief'
  showStats = false, 
  isOwned = false, 
  onClick, 
  leagueId, 
  onPujar, 
  players = [], 
  bidActionsButton,
  hideOwnerInfo = false
}) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(engineer.team);

  // Get owner name
  const getOwnerName = (owner_id) => {
    if (!owner_id || owner_id === 0) return 'FIA';
    const player = players.find(p => p.id === owner_id);
    return player ? player.name : 'Desconocido';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(engineer);
    } else {
      navigate(`/profile/engineer/${type}/${engineer.id}`);
    }
  };

  const getEngineerTypeLabel = () => {
    return type === 'track' ? 'INGENIERO DE PISTA' : 'INGENIERO JEFE';
  };

  // Utilidad para evitar rutas duplicadas
  const getEngineerImageUrl = (image_url) => {
    if (!image_url) return '';
    return image_url.startsWith('ingenierosdepista/')
      ? `/images/${image_url}`
      : `/images/ingenierosdepista/${image_url}`;
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
        "border-2 hover:shadow-glow-accent"
      )}
      onClick={handleClick}
      style={{
        borderColor: teamColor.primary,
        background: `linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px ${teamColor.primary}20`
      }}
    >
      {/* Team color top bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`
        }}
      />

      <CardContent className="pt-4">
        {/* Ownership indicator */}
        {isOwned && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-state-success border-2 border-white z-10" />
        )}

        {/* Engineer info */}
        <div className="flex items-start space-x-4 mb-4">
          <Avatar className="w-16 h-16 border-2 shadow-lg" style={{ 
            borderColor: teamColor.primary,
            boxShadow: `0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px ${teamColor.primary}40`
          }}>
            <AvatarImage 
              src={getEngineerImageUrl(engineer.image_url)}
              alt={engineer.name}
            />
            <AvatarFallback className="text-text-primary font-bold text-lg" style={{
              backgroundColor: `${teamColor.primary}20`,
              color: teamColor.primary
            }}>
              {engineer.name?.substring(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-text-primary text-lg leading-tight">
                {engineer.name}
              </h3>
              
              {/* Engineer type indicator */}
              <div 
                className="w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center text-xs font-bold"
                style={{ 
                  borderColor: teamColor.primary,
                  color: teamColor.primary,
                  boxShadow: `0 2px 4px rgba(0,0,0,0.3)`
                }}
              >
                {type === 'chief' ? 'C' : 'T'}
              </div>
            </div>

            {/* Team name - más prominente */}
            <div className="mb-2">
              <p 
                className="font-bold text-base uppercase tracking-wide"
                style={{ 
                  color: teamColor.primary,
                  textShadow: `0 1px 2px rgba(0,0,0,0.3)`
                }}
              >
                {engineer.team}
              </p>
            </div>

            {/* Engineer type label */}
            <p className="text-text-secondary text-xs font-medium mb-1">
              {getEngineerTypeLabel()}
            </p>

            {/* Associated driver */}
            {engineer.driver_name && (
              <p className="text-text-secondary text-small">
                Piloto: {engineer.driver_name}
              </p>
            )}

            {/* Number of bids */}
            {typeof engineer.num_bids !== 'undefined' && (
              <p className="text-state-warning font-bold text-small mb-1">
                {engineer.num_bids} puja{engineer.num_bids !== 1 ? 's' : ''}
                {engineer.my_bid && (
                  <span className="text-accent-main ml-2">
                    (Mi puja: €{formatCurrency(engineer.my_bid)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Stats section */}
        {showStats && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-small">Valor:</span>
              <span className="font-bold text-state-success text-small">
                {formatCurrency(engineer.value || 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-small">Tipo:</span>
              <span className="font-bold text-accent-main text-small">
                {getEngineerTypeLabel()}
              </span>
            </div>
            
            {!hideOwnerInfo && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Propietario:</span>
                <span className="text-text-primary text-small font-medium">
                  {getOwnerName(engineer.owner_id)}
                </span>
              </div>
            )}

            {/* My bid */}
            {engineer.my_bid && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Mi puja:</span>
                <span className="text-accent-main font-bold text-small">
                  {formatCurrency(engineer.my_bid)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {showStats && (
              <>
                <TrendingUp className="w-4 h-4 text-text-secondary" />
                <span className="text-small text-text-secondary">
                  Especialización
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPujar && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onPujar(engineer, type);
                }}
                size="sm"
                className="bg-gradient-to-r from-accent-main to-accent-hover hover:shadow-glow-accent"
              >
                PUJAR
              </Button>
            )}
            {bidActionsButton}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}