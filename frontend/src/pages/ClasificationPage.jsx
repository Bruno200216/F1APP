import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';

// UI Components from design.json style
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Icons
import { Trophy, Award, Medal, Crown } from 'lucide-react';

export default function ClasificationPage() {
  const { selectedLeague } = useLeague();
  const [classification, setClassification] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const playerId = Number(localStorage.getItem('player_id'));

  // Fetch classification when selected league changes
  useEffect(() => {
    if (selectedLeague) {
      fetchClassification();
    } else {
      setClassification([]);
    }
  }, [selectedLeague]);

  const fetchClassification = async () => {
    if (!selectedLeague) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leagues/${selectedLeague.id}/classification`);
      const data = await res.json();
      // Ordenar por puntos descendente y luego por money descendente
      const sorted = (data.classification || []).sort((a, b) => b.points - a.points || b.money - a.money);
      setClassification(sorted);
    } catch (err) {
      setError('Error loading classification');
    } finally {
      setLoading(false);
    }
  };

  // Get position icon based on rank
  const getPositionIcon = (position) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  // Get position styling
  const getPositionStyling = (position) => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 border-yellow-400/50';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/50';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-amber-500/20 border-amber-600/50';
      default:
        return '';
    }
  };

  if (!selectedLeague) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Trophy className="h-12 w-12 text-text-secondary mx-auto mb-4" />
            <CardTitle className="text-h3 text-text-primary mb-2">
              No League Selected
            </CardTitle>
            <p className="text-text-secondary text-body">
              Select a league to view the classification
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
            <p className="text-text-secondary text-body">Loading classification...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <Award className="h-12 w-12 text-state-error mx-auto mb-4" />
            <CardTitle className="text-h3 text-state-error mb-2">
              Error
            </CardTitle>
            <p className="text-text-secondary text-body">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="h-8 w-8 text-accent-main" />
            <h1 className="text-h1 font-bold text-text-primary">Classification</h1>
          </div>
          <p className="text-text-secondary text-body">
            League: <span className="text-accent-main font-semibold">{selectedLeague.name}</span>
          </p>
        </div>

        {/* Classification List */}
        <div className="space-y-3">
          {classification.length === 0 ? (
            <Card className="text-center">
              <CardContent className="py-12">
                <Trophy className="h-12 w-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary text-body">No players in this league yet</p>
              </CardContent>
            </Card>
          ) : (
            classification.map((player, idx) => {
              const position = idx + 1;
              const isCurrentPlayer = player.player_id === playerId;
              
              return (
                <Card
                  key={player.player_id}
                  className={`transition-all duration-200 ${
                    isCurrentPlayer
                      ? 'border-accent-main shadow-glow-accent bg-surface-elevated'
                      : 'border-border hover:border-accent-hover'
                  } ${getPositionStyling(position)}`}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    {/* Position and Icon */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-elevated border border-border flex-shrink-0">
                        {getPositionIcon(position) || (
                          <span className={`text-h3 font-bold ${
                            isCurrentPlayer ? 'text-accent-main' : 'text-text-primary'
                          }`}>
                            {position}
                          </span>
                        )}
                      </div>
                      
                      {/* Player Info */}
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-subtitle font-bold truncate ${
                          isCurrentPlayer ? 'text-accent-main' : 'text-text-primary'
                        }`}>
                          {player.name}
                        </h3>
                        <p className="text-text-secondary text-small mt-1">
                          €{player.money?.toLocaleString('es-ES') || '0'}
                        </p>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <div className={`text-h2 font-bold ${
                        position === 1 ? 'text-yellow-400' :
                        position === 2 ? 'text-gray-400' :
                        position === 3 ? 'text-amber-600' :
                        isCurrentPlayer ? 'text-accent-main' : 'text-text-primary'
                      }`}>
                        {player.points}
                      </div>
                      <p className="text-text-secondary text-caption">points</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer Info */}
        {classification.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-text-secondary text-small">
              Total players: {classification.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 