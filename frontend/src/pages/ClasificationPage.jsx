import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { useNavigate } from 'react-router-dom';

// UI Components from design.json style
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

// Icons
import { Trophy, Award, Medal, Crown, Flag } from 'lucide-react';

// Utils
import { formatNumberWithDots } from '../lib/utils';

export default function ClasificationPage() {
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [classification, setClassification] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedGP, setSelectedGP] = useState(null);
  const [availableGPs, setAvailableGPs] = useState([]);
  const [loadingGPs, setLoadingGPs] = useState(false);
  const [showGPSelector, setShowGPSelector] = useState(false);
  const playerId = Number(localStorage.getItem('player_id'));

  // Fetch classification when selected league changes
  useEffect(() => {
    if (selectedLeague) {
      fetchClassification();
      fetchAvailableGPs();
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
      // Ordenar por valor de equipo descendente y luego por puntos descendente
      const sorted = (data.classification || []).sort((a, b) => b.team_value - a.team_value || b.points - a.points);
      setClassification(sorted);
    } catch (err) {
      setError('Error loading classification');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableGPs = async () => {
    if (!selectedLeague) return;
    
    setLoadingGPs(true);
    try {
      const res = await fetch('/api/gp/started');
      const data = await res.json();
      setAvailableGPs(data.gps || []);
    } catch (err) {
      console.error('Error loading GPs:', err);
    } finally {
      setLoadingGPs(false);
    }
  };

  const handleGPSelection = (gp) => {
    setSelectedGP(gp);
    setShowGPSelector(false);
    // Aquí podrías filtrar la clasificación por GP si es necesario
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

  // Handle player click
  const handlePlayerClick = (player) => {
    navigate(`/player/${player.player_id}`);
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
          
          {/* GP Selector */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setShowGPSelector(!showGPSelector)}
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              {selectedGP ? selectedGP.name : 'Select Grand Prix'}
            </Button>
            
            {selectedGP && (
              <Button
                variant="ghost"
                onClick={() => setSelectedGP(null)}
                className="text-text-secondary"
              >
                Show Total
              </Button>
            )}
          </div>

          {/* GP List */}
          {showGPSelector && (
            <div className="mt-4 max-w-md mx-auto">
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                    {availableGPs.map((gp) => (
                      <Button
                        key={gp.gp_index}
                        variant="ghost"
                        onClick={() => handleGPSelection(gp)}
                        className={`justify-start text-left ${
                          selectedGP?.gp_index === gp.gp_index ? 'bg-accent-main/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {gp.flag && (
                            <img
                              src={`/images/flags/${gp.flag}`}
                              alt={gp.country}
                              className="w-6 h-4 rounded border"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-text-primary">{gp.name}</div>
                            <div className="text-caption text-text-secondary">
                              {new Date(gp.start_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                  className={`transition-all duration-200 cursor-pointer ${
                    isCurrentPlayer
                      ? 'border-accent-main shadow-glow-accent bg-surface-elevated'
                      : 'border-border hover:border-accent-hover'
                  } ${getPositionStyling(position)}`}
                  onClick={() => handlePlayerClick(player)}
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
                          €{formatNumberWithDots(player.team_value) || '0'}
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
                        {selectedGP 
                          ? (player.points_by_gp && player.points_by_gp[selectedGP.gp_index]) || 0
                          : player.points
                        }
                      </div>
                      <p className="text-text-secondary text-caption">
                        {selectedGP ? `${selectedGP.name} points` : 'total points'}
                      </p>
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