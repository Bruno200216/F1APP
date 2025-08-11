import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getTeamColor, formatCurrency, formatNumberWithDots } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { TrendingUp } from 'lucide-react';
import ClausulaTimer from './ClausulaTimer';

export default function TeamCard({ 
  team, 
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
  const teamColor = getTeamColor(team.name);

  // Get owner name
  const getOwnerName = (owner_id) => {
    if (!owner_id || owner_id === 0) return 'FIA';
    const player = players.find(p => p.id === owner_id);
    return player ? player.name : 'Desconocido';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(team);
    } else {
      navigate(`/profile/team/${team.id}`);
    }
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
        background: `linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)`
      }}
    >
      {/* Team color top bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`
        }}
      />

      <CardContent className="pt-4">
        {/* Ownership indicator */}
        {isOwned && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-state-success border-2 border-white z-10" />
        )}

        {/* Team info */}
        <div className="flex items-start space-x-4 mb-4">
          <Avatar className="w-16 h-16 border-2 shadow-lg" style={{ borderColor: teamColor.primary }}>
            <AvatarImage 
              src={team.image_url ? `/images/equipos/${team.image_url}` : ''}
              alt={team.name}
            />
            <AvatarFallback className="text-text-primary font-bold text-lg">
              {team.name?.substring(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-text-primary text-lg leading-tight">
                {team.name}
              </h3>
              
              {/* Clause timer */}
              {(team.clausulatime || team.clausula_expires_at) && (
                <ClausulaTimer
                  clausulaTime={team.clausulatime || team.clausula_expires_at}
                  clausulaValue={team.clausula_value}
                  compact={true}
                />
              )}
            </div>

            {/* Team name (constructor) */}
            <p 
              className="font-semibold text-sm uppercase tracking-wide mb-2"
              style={{ color: teamColor.primary }}
            >
              {team.team || team.name}
            </p>

            {/* Team type label */}
            <p className="text-text-secondary text-xs font-medium mb-1">
              EQUIPO CONSTRUCTOR
            </p>

            {/* Associated pilots */}
            {team.pilots && team.pilots.length > 0 && (
              <p className="text-text-secondary text-small">
                Pilotos: {team.pilots.join(', ')}
              </p>
            )}

            {/* Number of bids */}
            {typeof team.num_bids !== 'undefined' && (
              <p className="text-state-warning font-bold text-small mb-1">
                {team.num_bids} puja{team.num_bids !== 1 ? 's' : ''}
                {team.my_bid && (
                  <span className="text-accent-main ml-2">
                    (Mi puja: €{formatNumberWithDots(team.my_bid)})
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
                {formatNumberWithDots(team.value || 0)}€
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-small">Tipo:</span>
              <span className="font-bold text-accent-main text-small">
                CONSTRUCTOR
              </span>
            </div>
            
            {!hideOwnerInfo && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Propietario:</span>
                <span className="text-text-primary text-small font-medium">
                  {getOwnerName(team.owner_id)}
                </span>
              </div>
            )}

            {/* Pilots count */}
            {team.pilots && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Pilotos:</span>
                <span className="text-text-primary text-small font-medium">
                  {team.pilots.length}
                </span>
              </div>
            )}

            {/* My bid */}
            {team.my_bid && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Mi puja:</span>
                <span className="text-accent-main font-bold text-small">
                  {formatNumberWithDots(team.my_bid)}€
                </span>
              </div>
            )}

            {/* Performance indicator */}
            <div className="flex gap-4 pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor.primary }}></div>
                <span className="text-small font-medium" style={{ color: teamColor.primary }}>
                  Constructor
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {showStats && (
              <>
                <TrendingUp className="w-4 h-4 text-text-secondary" />
                <span className="text-small text-text-secondary">
                  Performance
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPujar && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onPujar(team);
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