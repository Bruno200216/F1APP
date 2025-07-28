import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../context/LeagueContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Settings, Euro, Lock, User } from 'lucide-react';

const PlayerItemActions = ({ 
  item, 
  itemType, 
  currentPlayerMoney, 
  onMakeOffer, 
  onActivateClausula,
  isOwned = false,
  existingOffers = [] // Array de ofertas existentes del usuario
}) => {
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
  const navigate = useNavigate();
  const { selectedLeague } = useLeague();
  const [showActions, setShowActions] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerValue, setOfferValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Si es propiedad del usuario actual, no mostrar botones
  if (isOwned) {
    return null;
  }

  // Verificar si ya existe una oferta para este elemento
  const existingOffer = existingOffers.find(offer => 
    offer.id === item.id && offer.type === itemType
  );

  // Inicializar el valor de oferta con el valor de mercado o la oferta existente
  useEffect(() => {
    if (showOfferDialog && item) {
      if (existingOffer) {
        // Si ya existe una oferta, usar ese valor
        setOfferValue(existingOffer.offer_value.toString());
      } else {
        // Si no existe, usar el valor de mercado
        const marketValue = Number(item.value || item.valor_global || 0);
        setOfferValue(marketValue.toString());
      }
    }
  }, [showOfferDialog, item, existingOffer]);

  const handleMakeOffer = async () => {
    if (!offerValue || parseFloat(offerValue) <= 0) {
      alert('Por favor ingresa un valor válido');
      return;
    }

    if (parseFloat(offerValue) > currentPlayerMoney) {
      alert('No tienes suficiente dinero para hacer esta oferta');
      return;
    }

    setIsLoading(true);
    try {
      await onMakeOffer(parseFloat(offerValue));
      setShowOfferDialog(false);
      setOfferValue('');
      setShowActions(false);
    } catch (error) {
      alert('Error al enviar la oferta: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToOfferPage = () => {
    if (!selectedLeague) {
      alert('Debes seleccionar una liga primero');
      return;
    }
    
    // Usar el ID correcto según el tipo de elemento
    let correctId = item.id;
    
    // Para ingenieros, usar el ID del registro *ByLeague si está disponible
    if (itemType === 'track_engineer' && item.track_engineer_by_league_id) {
      correctId = item.track_engineer_by_league_id;
    } else if (itemType === 'chief_engineer' && item.chief_engineer_by_league_id) {
      correctId = item.chief_engineer_by_league_id;
    } else if (itemType === 'team_constructor' && item.team_constructor_by_league_id) {
      correctId = item.team_constructor_by_league_id;
    }
    
    const searchParams = new URLSearchParams({
      type: itemType,
      id: correctId.toString()
    });
    
    navigate(`/make-offer?${searchParams.toString()}`);
  };

  const handleActivateClausula = async () => {
    if (!item.clausula_value) {
      alert('Este elemento no tiene cláusula activa');
      return;
    }

    if (item.clausula_value > currentPlayerMoney) {
      alert('No tienes suficiente dinero para activar la cláusula');
      return;
    }

    setIsLoading(true);
    try {
      await onActivateClausula(item.clausula_value);
      setShowActions(false);
    } catch (error) {
      alert('Error al activar la cláusula: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemName = () => {
    switch (itemType) {
      case 'pilot':
        return item.driver_name || item.name;
      case 'track_engineer':
      case 'chief_engineer':
      case 'team_constructor':
        return item.name;
      default:
        return 'Elemento';
    }
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'pilot':
        return 'Piloto';
      case 'track_engineer':
        return 'Ingeniero de Pista';
      case 'chief_engineer':
        return 'Ingeniero Jefe';
      case 'team_constructor':
        return 'Constructor';
      default:
        return 'Elemento';
    }
  };

  const getItemImage = () => {
    if (itemType === 'pilot') {
      return item.image_url ? `/images/${item.image_url}` : '';
    } else if (itemType === 'track_engineer' || itemType === 'chief_engineer') {
      return item.image_url ? `/images/ingenierosdepista/${item.image_url}` : '';
    } else if (itemType === 'team_constructor') {
      return item.image_url ? `/images/equipos/${item.image_url}` : '';
    }
    return '';
  };

  // Colores de equipos de F1 (copiado de AuctionPilotBidPage)
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

  const teamColor = teamColors[item?.team] || { primary: '#666666', secondary: '#444444' };

  // Colores para el modo (copiado de AuctionPilotBidPage)
  const modeColors = {
    R: '#EA5455', // Rojo (error state)
    Q: '#9D4EDD', // Morado (accent main)
    P: '#28C76F', // Verde (success state)
  };

  return (
    <div className="relative">
      {/* Botón principal de Acciones - SIGUIENDO design.json */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowActions(!showActions)}
        className="flex items-center gap-2 transition-all duration-200"
        style={{
          borderColor: '#9D4EDD',
          color: '#9D4EDD',
          backgroundColor: 'transparent',
          borderRadius: 12,
          padding: '8px 16px',
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 0 8px rgba(157, 78, 221, 0.3)',
          fontFamily: "'Inter', 'Segoe UI', sans-serif"
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#9D4EDD';
          e.target.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.color = '#9D4EDD';
        }}
      >
        <Settings className="h-4 w-4" />
        Acciones
      </Button>

      {/* Botones de acción que aparecen HACIA ABAJO - POSICIÓN ABSOLUTA */}
      {showActions && (
        <div className="absolute top-full right-0 mt-2 flex flex-col gap-2 z-50">
          {/* Botón de Oferta */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNavigateToOfferPage}
            className="flex items-center gap-2 whitespace-nowrap transition-all duration-200"
            disabled={isLoading}
            style={{
              borderColor: existingOffer ? '#28C76F' : '#9D4EDD',
              color: '#FFFFFF',
              backgroundColor: existingOffer ? '#28C76F' : '#9D4EDD',
              borderRadius: 12,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              borderWidth: '2px',
              boxShadow: existingOffer ? '0 0 8px rgba(40, 199, 111, 0.3)' : '0 0 8px rgba(157, 78, 221, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                if (existingOffer) {
                  e.target.style.backgroundColor = '#24B263';
                  e.target.style.boxShadow = '0 0 12px rgba(40, 199, 111, 0.5)';
                } else {
                  e.target.style.backgroundColor = '#8B3DD6';
                  e.target.style.boxShadow = '0 0 12px rgba(157, 78, 221, 0.5)';
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                if (existingOffer) {
                  e.target.style.backgroundColor = '#28C76F';
                  e.target.style.boxShadow = '0 0 8px rgba(40, 199, 111, 0.3)';
                } else {
                  e.target.style.backgroundColor = '#9D4EDD';
                  e.target.style.boxShadow = '0 0 8px rgba(157, 78, 221, 0.3)';
                }
              }
            }}
          >
            <User className="h-3 w-3" />
            {existingOffer ? `Editar oferta (${formatNumberWithDots(existingOffer.offer_value)} €)` : 'Hacer oferta'}
          </Button>

          {/* Botón de Cláusula - SOLO CUANDO EXPIRA */}
          {item.clausula_value && item.clausulatime && new Date(item.clausulatime) <= new Date() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleActivateClausula}
              className="flex items-center gap-2 whitespace-nowrap transition-all duration-200"
              disabled={isLoading || item.clausula_value > currentPlayerMoney}
              style={{
                borderColor: '#9D4EDD',
                color: '#9D4EDD',
                backgroundColor: 'transparent',
                borderRadius: 12,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                borderWidth: '2px',
                boxShadow: '0 0 8px rgba(157, 78, 221, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && item.clausula_value <= currentPlayerMoney) {
                  e.target.style.backgroundColor = '#9D4EDD';
                  e.target.style.color = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 12px rgba(157, 78, 221, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && item.clausula_value <= currentPlayerMoney) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#9D4EDD';
                  e.target.style.boxShadow = '0 0 8px rgba(157, 78, 221, 0.3)';
                }
              }}
            >
              <Lock className="h-3 w-3" />
                              Pagar cláusula ({formatNumberWithDots(item.clausula_value)} €)
            </Button>
          )}

          {/* Información de cláusula activa - SOLO INFORMATIVA */}
          {item.clausula_value && item.clausulatime && new Date(item.clausulatime) > new Date() && (
            <div 
              className="p-3 rounded-lg min-w-max"
              style={{
                background: '#121012',
                border: '1px solid #28C76F',
                borderRadius: 12,
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
              }}
            >
              <div className="flex items-center gap-2">
                <Lock className="h-3 w-3" style={{ color: '#28C76F' }} />
                <div className="text-xs">
                  <p style={{ color: '#28C76F', fontWeight: 500 }}>
                    Cláusula activa: {formatNumberWithDots(item.clausula_value)} €
                  </p>
                  <p style={{ color: '#C9A9DD' }}>
                    Protegido hasta: {new Date(item.clausulatime).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Diálogo de oferta EXACTAMENTE como AuctionPilotBidPage */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="bg-[#080705] border-0 p-0 max-w-md overflow-hidden">
          <div className="min-h-screen bg-[#080705] flex flex-col items-center justify-start pt-4 relative">
            {/* Botón de cerrar */}
            <button
              onClick={() => setShowOfferDialog(false)}
              className="absolute top-6 right-6 p-2 rounded-lg hover:bg-[#1E1A1E] transition-colors text-white"
              style={{ borderRadius: 12 }}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Título */}
            <h2 
              className="text-[#FFFFFF] font-bold text-2xl mb-3 mt-2"
              style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
            >
              {existingOffer ? 'Editar oferta por' : 'Oferta por'} {getItemName()}
            </h2>
            
            {/* Imagen del elemento */}
            <div className="flex flex-col items-center mb-4 relative">
              <img
                src={getItemImage()}
                alt={getItemName()}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mb-4"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
              />
              {/* Badge de modo */}
              <div 
                className="absolute top-2 right-2 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm border-2 border-white"
                style={{
                  background: modeColors[item?.mode?.toUpperCase()] || '#28C76F',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                }}
              >
                {item?.mode?.toUpperCase() || (itemType === 'pilot' ? 'P' : itemType === 'track_engineer' ? 'T' : itemType === 'chief_engineer' ? 'C' : 'E')}
              </div>
            </div>
            
            {/* Información del elemento */}
            <div className="w-full max-w-80 mb-3">
              {/* Mostrar oferta existente si existe */}
              {existingOffer && (
                <div 
                  className="rounded-lg p-3 border mb-3"
                  style={{
                    background: '#1E1A1E',
                    border: '1px solid #28C76F',
                    borderRadius: 12,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#28C76F' }}></div>
                    <span 
                      className="font-semibold text-sm"
                      style={{ color: '#28C76F', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                    >
                      OFERTA ACTUAL
                    </span>
                  </div>
                  <p 
                    className="font-bold text-base"
                    style={{ color: '#FFFFFF', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    €{formatNumberWithDots(existingOffer.offer_value)}
                  </p>
                  <p 
                    className="text-xs mt-1"
                    style={{ color: '#C9A9DD', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    Realizada el {new Date(existingOffer.created_at || existingOffer.received_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
              
              <div 
                className="rounded-lg p-4 border"
                style={{
                  background: '#1E1A1E',
                  border: '1px solid #28C76F',
                  borderRadius: 12,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)'
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span 
                    className="font-semibold text-sm"
                    style={{ color: '#C9A9DD', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    VALOR DE MERCADO
                  </span>
                  <span 
                    className="font-bold text-base"
                    style={{ color: '#FFFFFF', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    {formatNumberWithDots(item.value || item.valor_global || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span 
                    className="font-semibold text-sm"
                    style={{ color: '#C9A9DD', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    PRECIO SOLICITADO
                  </span>
                  <span 
                    className="font-bold text-base"
                    style={{ color: '#FFFFFF', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    {formatNumberWithDots(item.value || item.valor_global || 0)}
                  </span>
                </div>
                
                {/* Campo de entrada */}
                <div 
                  className="flex items-center rounded-lg px-3 py-2 border"
                  style={{
                    background: '#121012',
                    border: '1px solid #28C76F',
                    borderRadius: 12
                  }}
                >
                  <span 
                    className="font-bold mr-2"
                    style={{ color: '#C9A9DD', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                  >
                    €
                  </span>
                  <Input
                    variant="standard"
                    value={offerValue}
                    onChange={(e) => setOfferValue(e.target.value)}
                    placeholder={formatNumberWithDots(item.value || item.valor_global || 0)}
                    type="number"
                    inputProps={{ min: 1 }}
                    className="flex-1 text-right font-bold text-lg bg-transparent border-none"
                    style={{ 
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: 18,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: "'Inter', 'Segoe UI', sans-serif"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Botón de oferta */}
            <Button
              variant="contained"
              fullWidth
              className="text-white font-bold text-xl rounded-lg py-3 max-w-80 mb-3 transition-all duration-200"
              onClick={handleMakeOffer}
              disabled={isLoading || !offerValue || Number(offerValue) <= 0 || Number(offerValue) > currentPlayerMoney}
              style={{
                background: '#28C76F',
                borderRadius: 12,
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                boxShadow: '0 0 8px rgba(40, 199, 111, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && offerValue && Number(offerValue) > 0 && Number(offerValue) <= currentPlayerMoney) {
                  e.target.style.background = '#24B263';
                  e.target.style.boxShadow = '0 0 12px rgba(40, 199, 111, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && offerValue && Number(offerValue) > 0 && Number(offerValue) <= currentPlayerMoney) {
                  e.target.style.background = '#28C76F';
                  e.target.style.boxShadow = '0 0 8px rgba(40, 199, 111, 0.3)';
                }
              }}
            >
              {isLoading ? 'Enviando oferta...' : (existingOffer ? 'Actualizar oferta' : 'Hacer oferta')}
            </Button>

            {/* Validación de importe mínimo */}
            {offerValue && Number(offerValue) < (item.value || item.valor_global || 0) && (
              <p 
                className="font-semibold text-sm mb-2"
                style={{ color: '#EA5455', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
              >
                El importe es inferior al valor de mercado
              </p>
            )}

            {/* Saldo del usuario */}
            <p 
              className="font-semibold text-base mb-2"
              style={{ color: '#28C76F', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
            >
                                  Tu saldo: €{formatNumberWithDots(currentPlayerMoney)}
            </p>

            {/* Saldo después de la oferta */}
            {offerValue && Number(offerValue) > 0 && (
              <p 
                className="font-semibold text-sm"
                style={{ 
                  color: Number(offerValue) > currentPlayerMoney ? '#EA5455' : '#28C76F',
                  fontFamily: "'Inter', 'Segoe UI', sans-serif"
                }}
              >
                                    Saldo después: €{formatNumberWithDots(currentPlayerMoney - Number(offerValue))}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlayerItemActions; 