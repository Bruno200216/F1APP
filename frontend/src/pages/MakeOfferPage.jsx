import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';

// UI Components
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';

// Icons
import { ArrowLeft, Euro, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// Utils
import { formatNumberWithDots } from '../lib/utils';

// Helper functions
const getTeamColor = (teamName) => {
  const teamColors = {
    'Red Bull Racing': { primary: '#3671C6', secondary: '#1E41C3' },
    'Mercedes': { primary: '#6CD3BF', secondary: '#00D2BE' },
    'McLaren': { primary: '#FF8700', secondary: '#FF5800' },
    'Ferrari': { primary: '#DC0000', secondary: '#B80000' },
    'Aston Martin': { primary: '#358C75', secondary: '#006F62' },
    'Alpine': { primary: '#0090FF', secondary: '#0051FF' },
    'Stake F1 Team Kick Sauber': { primary: '#52E252', secondary: '#37BEDD' },
    'Haas': { primary: '#FFFFFF', secondary: '#E8E8E8' },
    'Williams': { primary: '#37BEDD', secondary: '#005AFF' },
    'Visa Cash App RB': { primary: '#5E8FAA', secondary: '#1E41C3' }
  };
  return teamColors[teamName] || { primary: '#9D4EDD', secondary: '#E0AAFF' };
};

const getImageUrl = (item, type) => {
  if (!item) return '';
  
  const baseUrl = '/images';
  if (type === 'pilot') {
    return `${baseUrl}/${item.driver_name?.toLowerCase().replace(/\s+/g, '-')}.png`;
  } else if (type === 'track_engineer' || type === 'chief_engineer') {
    return `${baseUrl}/ingenierosdepista/${item.name?.replace(/\s+/g, '_')}.png`;
  } else if (type === 'team_constructor') {
    return `${baseUrl}/equipos/${item.name?.replace(/\s+/g, '_')}.png`;
  }
  return '';
};

const getShortName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}. ${parts[parts.length - 1]}`;
  }
  return fullName;
};

export default function MakeOfferPage() {
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offerValue, setOfferValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [playerMoney, setPlayerMoney] = useState(0);
  const [success, setSuccess] = useState(false);



  const itemType = searchParams.get('type');
  const itemId = searchParams.get('id');

  useEffect(() => {
    if (!selectedLeague || !itemType || !itemId) {
      setError('Parámetros inválidos');
      setLoading(false);
      return;
    }

    fetchItemData();
    fetchPlayerMoney();
  }, [selectedLeague, itemType, itemId]);

  const fetchItemData = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      
      let endpoint = '';
      switch (itemType) {
        case 'pilot':
          endpoint = `/api/pilot-by-league/${itemId}`;
          break;
        case 'track_engineer':
          endpoint = `/api/trackengineersbyleague?id=${itemId}&league_id=${selectedLeague.id}`;
          break;
        case 'chief_engineer':
          endpoint = `/api/chiefengineersbyleague?id=${itemId}&league_id=${selectedLeague.id}`;
          break;
        case 'team_constructor':
          endpoint = `/api/teamconstructorsbyleague?id=${itemId}`;
          break;
        default:
          throw new Error('Tipo de elemento no válido');
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar el elemento');
      }

      const data = await response.json();
      let itemData;
      let baseData;
      
      switch (itemType) {
        case 'pilot':
          itemData = data.pilot_by_league;
          baseData = data.pilot;
          break;
        case 'track_engineer':
          itemData = data.engineer;
          baseData = data.track_engineer;
          break;
        case 'chief_engineer':
          itemData = data.engineer;
          baseData = data.chief_engineer;
          break;
        case 'team_constructor':
          itemData = data.team;
          baseData = data.team_constructor;
          break;
        default:
          throw new Error('Tipo de elemento no válido');
      }
      
      if (!itemData || !baseData) {
        throw new Error('Elemento no encontrado');
      }

      // Combinar datos del elemento base con los datos de la liga
      const combinedData = { ...baseData, ...itemData };
      setItem(combinedData);
      setOfferValue(combinedData.value?.toString() || '0');
    } catch (err) {
      console.error('Error fetching item data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerMoney = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user?.id) return;

      const response = await fetch(`/api/playerbyleague?player_id=${user.id}&league_id=${selectedLeague.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerMoney(data.player_by_league?.money || 0);
      }
    } catch (err) {
      console.error('Error fetching player money:', err);
    }
  };

  const handleMakeOffer = async () => {
    if (!offerValue || parseFloat(offerValue) <= 0) {
      setError('Por favor ingresa un valor válido');
      return;
    }

    if (parseFloat(offerValue) > playerMoney) {
      setError('No tienes suficiente dinero para hacer esta oferta');
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const response = await fetch(`/api/${itemType}/make-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          item_id: parseInt(itemId),
          league_id: selectedLeague.id,
          offer_value: parseFloat(offerValue)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la oferta');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/market');
      }, 2000);
    } catch (err) {
      console.error('Error making offer:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080705] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9D4EDD] mx-auto mb-4"></div>
          <p className="text-[#C9A9DD]">Cargando elemento...</p>
        </div>
      </div>
    );
  }

  if (error && !item) {
    return (
      <div className="min-h-screen bg-[#080705] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-[#EA5455] mx-auto mb-4" />
          <p className="text-[#C9A9DD] mb-4">{error}</p>
          <Button 
            onClick={() => navigate('/market')}
            className="bg-[#9D4EDD] hover:bg-[#E0AAFF] text-white"
          >
            Volver al mercado
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#080705] flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-[#28C76F] mx-auto mb-4" />
          <p className="text-[#C9A9DD] text-xl mb-2">¡Oferta enviada!</p>
          <p className="text-[#C9A9DD]">Redirigiendo al mercado...</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const displayName = item.driver_name || item.name;
  const displayTeam = item.team;
  const teamColor = getTeamColor(displayTeam);
  const imageUrl = getImageUrl(item, itemType);
  const badgeLetter = itemType === 'pilot' ? 'P' : 
                     itemType === 'track_engineer' ? 'T' : 
                     itemType === 'chief_engineer' ? 'C' : 'E';

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'pilot': return 'Piloto';
      case 'track_engineer': return 'Ingeniero de Pista';
      case 'chief_engineer': return 'Ingeniero Jefe';
      case 'team_constructor': return 'Equipo Constructor';
      default: return 'Elemento';
    }
  };

  return (
    <div className="min-h-screen bg-[#080705] flex flex-col">
      {/* Header */}
      <div className="bg-[#121012] border-b border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate('/market')}
            variant="ghost"
            className="text-[#C9A9DD] hover:bg-[#1E1A1E]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-[#FFFFFF] font-bold text-xl">
              Hacer oferta
            </h1>
            <p className="text-[#C9A9DD] text-sm">
              {getItemTypeLabel()} • {selectedLeague?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <Card className="bg-[#1E1A1E] border-[rgba(255,255,255,0.08)] shadow-[0_4px_16px_rgba(0,0,0,0.35)]">
          <CardContent className="p-6">
            {/* Item Info */}
            <div className="flex items-start gap-6 mb-8">
              {/* Avatar and Badge */}
              <div className="flex flex-col items-center gap-3 flex-shrink-0">
                <div
                  className="flex items-center justify-center font-bold"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `2px solid ${teamColor.primary}`,
                    background: '#000',
                    color: teamColor.primary,
                    fontSize: 16,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  {badgeLetter}
                </div>
                <Avatar className="w-20 h-20 border-2 border-[#9D4EDD]">
                  <AvatarImage src={imageUrl} alt={displayName} />
                  <AvatarFallback className="bg-[#121012] text-[#FFFFFF] font-bold">
                    {displayName?.substring(0, 2) || '??'}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="accent" className="text-xs">
                  {getItemTypeLabel()}
                </Badge>
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h2 className="text-[#FFFFFF] font-bold text-2xl mb-2">
                  {getShortName(displayName)}
                </h2>
                <p className="text-[#C9A9DD] text-lg mb-1">{displayTeam}</p>
                <p className="text-[#9D4EDD] text-sm font-medium">
                  Valor de mercado: €{formatNumberWithDots(item.value || 0)}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-[rgba(234,84,85,0.1)] border border-[#EA5455] rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-[#EA5455]" />
                  <p className="text-[#EA5455]">{error}</p>
                </div>
              </div>
            )}

            {/* Offer Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-[#C9A9DD] font-medium mb-3">
                  Valor de la oferta
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Euro className="h-5 w-5 text-[#9D4EDD]" />
                  </div>
                  <Input
                    type="number"
                    value={offerValue}
                    onChange={(e) => setOfferValue(e.target.value)}
                    placeholder="0"
                    className="pl-10 bg-[#121012] border-[rgba(255,255,255,0.08)] text-[#FFFFFF] text-lg font-bold"
                    style={{ borderRadius: 12 }}
                  />
                </div>
              </div>

              {/* Player Money Info */}
              <div className="bg-[#121012] p-4 rounded-lg border border-[rgba(255,255,255,0.08)]">
                <div className="flex justify-between items-center">
                  <span className="text-[#C9A9DD]">Tu saldo disponible:</span>
                  <span className="text-[#FFFFFF] font-bold">
                    €{formatNumberWithDots(playerMoney)}
                  </span>
                </div>
                {offerValue && parseFloat(offerValue) > 0 && (
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-[#C9A9DD]">Saldo restante:</span>
                    <span className={`font-bold ${parseFloat(offerValue) > playerMoney ? 'text-[#EA5455]' : 'text-[#28C76F]'}`}>
                      €{formatNumberWithDots(playerMoney - parseFloat(offerValue))}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleMakeOffer}
                disabled={submitting || !offerValue || parseFloat(offerValue) <= 0 || parseFloat(offerValue) > playerMoney}
                className="w-full bg-[#9D4EDD] hover:bg-[#E0AAFF] text-white font-bold text-lg py-4"
                style={{ 
                  borderRadius: 12,
                  boxShadow: '0 0 8px #640160, 0 0 16px #640160'
                }}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Enviando oferta...
                  </div>
                ) : (
                  'Enviar oferta'
                )}
              </Button>

              {/* Validation Messages */}
              {offerValue && parseFloat(offerValue) < (item.value || 0) && (
                <div className="text-center">
                  <p className="text-[#FF9F43] text-sm">
                    ⚠️ El importe es inferior al valor de mercado
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 