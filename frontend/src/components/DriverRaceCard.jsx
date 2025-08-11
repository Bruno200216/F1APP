import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn, getTeamColor, formatCurrency, formatNumberWithDots } from '../lib/utils';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Lock, TrendingUp, Users } from 'lucide-react';
import ClausulaBadge from './ClausulaBadge';
import ClausulaTimer from './ClausulaTimer';

// Map driver mode/session to distinctive border colors (keeps team color elsewhere)
const getDriverMode = (driver) => {
  const raw = (driver?.mode || driver?.session_type || '').toString().toLowerCase();
  if (raw === 'race' || raw === 'r') return 'race';
  if (raw === 'qualifying' || raw === 'qualy' || raw === 'q') return 'qualifying';
  if (raw === 'practice' || raw === 'p') return 'practice';
  return 'race';
};

const getModeColor = (mode) => {
  switch (mode) {
    case 'qualifying':
      return '#28C76F'; // success (green)
    case 'practice':
      return '#3B82F6'; // blue
    case 'race':
    default:
      return '#9D4EDD'; // accent (purple)
  }
};

export function goToDriverProfile(navigate, driver, leagueId) {
  if (!driver || !driver.driver_code || !leagueId) return;
  navigate(`/profile/${driver.driver_code}?league_id=${leagueId}`);
}

export default function DriverRaceCard({ 
  driver, 
  showStats = false, 
  isOwned = false, 
  onClick, 
  leagueId, 
  onFichar, 
  players = [], 
  showBidActions = false, 
  onEditBid, 
  onDeleteBid, 
  bidActionsButton,
  hideOwnerInfo = false
}) {
  const navigate = useNavigate();
  const teamColor = getTeamColor(driver.team);
  const mode = getDriverMode(driver);
  const modeColor = getModeColor(mode);

  // Get owner name
  const getOwnerName = (owner_id) => {
    if (!owner_id || owner_id === 0) return 'FIA';
    const player = players.find(p => p.id === owner_id);
    return player ? player.name : 'Unknown';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(driver);
    } else {
      const pilotId = driver.pilot_id || driver.id;
      navigate(`/profile/${pilotId}`);
    }
  };

  // Get current player ID
  const playerId = Number(localStorage.getItem('player_id'));

  // Calculate remaining clause days
  let clausulaDias = null;
  if (driver.clausula) {
    const expira = new Date(driver.clausula);
    const ahora = new Date();
    const diff = expira - ahora;
    if (diff > 0) {
      clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
        "border-2 hover:shadow-glow-accent"
      )}
      onClick={handleClick}
      style={{
        // Border uses mode color for stronger visibility per session
        borderColor: modeColor,
        background: `linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)`
      }}
    >
      {/* Team color top bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          // Use mode color for top bar to reinforce session distinction
          background: `linear-gradient(90deg, ${modeColor}, ${modeColor})`
        }}
      />

      <CardContent className="pt-4">
        {/* Ownership indicator */}
        {isOwned && (
          <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-state-success border-2 border-white z-10" />
        )}

        {/* Driver info */}
        <div className="flex items-start space-x-4 mb-4">
          {/* Avatar ring uses mode color; team name text below keeps team color */}
          <Avatar className="w-16 h-16 border-2 shadow-lg" style={{ borderColor: modeColor }}>
            <AvatarImage 
              src={driver.image_url ? `/images/${driver.image_url}` : ''}
              alt={driver.driver_name}
            />
            <AvatarFallback className="text-text-primary font-bold text-lg">
              {driver.driver_name?.substring(0, 2) || '??'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-text-primary text-lg leading-tight">
                {driver.driver_name}
              </h3>
              
              {/* Driver type indicator */}
              <div 
                className="w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center text-xs font-bold"
                style={{ 
                  borderColor: modeColor,
                  color: modeColor
                }}
              >
                {(driver.pilot_type === 'estrella') ? '★' : 
                 (driver.pilot_type === 'rookie') ? 'R' : 
                 (driver.mode || 'R').toUpperCase().charAt(0)}
              </div>

              {/* Clause indicator */}
              {(driver.clausulatime || driver.clausula_expires_at) && (
                <ClausulaTimer
                  clausulaTime={driver.clausulatime || driver.clausula_expires_at}
                  clausulaValue={driver.clausula_value}
                  compact={true}
                />
              )}
            </div>

            {/* Team name */}
            <p 
              className="font-semibold text-sm uppercase tracking-wide mb-2"
              style={{ color: teamColor.primary }}
            >
              {driver.team}
            </p>

            {/* Number of bids */}
            {typeof driver.num_bids !== 'undefined' && (
              <p className="text-state-warning font-bold text-small mb-1">
                {driver.num_bids} bid{driver.num_bids !== 1 ? 's' : ''}
                {driver.my_bid && (
                  <span className="text-accent-main ml-2">
                    (My bid: €{formatNumberWithDots(driver.my_bid)})
                  </span>
                )}
              </p>
            )}

            {/* Aggregated total points (temporary) */}
            {typeof driver.total_points !== 'undefined' && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Total Points:</span>
                <span className="font-bold text-state-warning text-small">{driver.total_points}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats section */}
        {showStats && (
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-small">Value:</span>
              <span className="font-bold text-state-success text-small">
                {formatNumberWithDots(driver.value ?? driver.valor_global ?? driver.valorGlobal ?? 0)}€
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-text-secondary text-small">Points:</span>
              <span className="font-bold text-state-warning text-small">
                {driver.total_points || 0}
              </span>
            </div>
            
            {!hideOwnerInfo && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">Owner:</span>
                <span className="text-text-primary text-small font-medium">
                  {getOwnerName(driver.owner_id)}
                </span>
              </div>
            )}

            {/* My bid */}
            {driver.my_bid && (
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-small">My bid:</span>
                <span className="text-accent-main font-bold text-small">
                  {formatNumberWithDots(driver.my_bid)}€
                </span>
              </div>
            )}

            {/* Removed P/Q/R performance averages per request */}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            {showStats && (
              <>
                <TrendingUp className="w-4 h-4 text-text-secondary" />
                <span className="text-small text-text-secondary">
                  
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onFichar && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onFichar(driver);
                }}
                size="sm"
                className="bg-gradient-to-r from-accent-main to-accent-hover hover:shadow-glow-accent"
              >
                BID
              </Button>
            )}
            {bidActionsButton}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}