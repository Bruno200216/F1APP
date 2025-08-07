import React, { useState } from 'react';
import { Button } from './ui/button';
import { MoreVertical, Plus, Unlock } from 'lucide-react';

const PlayerItemActions = ({ 
  item, 
  type, 
  itemType, 
  onSell, 
  onActivateClausula, 
  onMakeOffer, 
  currentPlayerMoney,
  isOwned,
  existingOffers,
  className = "" 
}) => {
  // Usar itemType si está disponible, sino usar type
  const finalType = itemType || type;
  const [isOpen, setIsOpen] = useState(false);

  const handleSell = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onSell) {
      onSell(item, finalType);
    } else if (onMakeOffer) {
      // Si no hay onSell pero hay onMakeOffer, usar onMakeOffer
      onMakeOffer(item, finalType);
    }
  };

  const handleActivateClausula = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onActivateClausula) {
      onActivateClausula(item, finalType);
    }
  };

  // Para elementos propios, siempre se puede "subir" la cláusula
  // Para elementos de otros, solo se puede "activar" si ha expirado
  const playerId = Number(localStorage.getItem('player_id'));
  const isOwnItem = item.owner_id === playerId;
  
  // Verificar si tiene cláusula disponible
  const hasClausula = item.clausula_value && item.clausula_value > 0;
  
  // Calcular días restantes de cláusula si existe
  let clausulaDias = null;
  if (item.clausulatime || item.clausula_expires_at) {
    const expira = new Date(item.clausulatime || item.clausula_expires_at);
    const ahora = new Date();
    const diff = expira - ahora;
    if (diff > 0) {
      clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  // Lógica de habilitación:
  // - Si es propio: siempre habilitado (para subir cláusula)
  // - Si es de otro: solo si la cláusula ha expirado (para activar)
  const canUseClausula = isOwnItem || (hasClausula && (!clausulaDias || clausulaDias <= 0));

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 border-accent-main text-accent-main hover:bg-accent-main/10"
      >
        <MoreVertical className="h-4 w-4" />
        Acciones
      </Button>

      {isOpen && (
        <>
          {/* Backdrop para cerrar el menú */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menú desplegable */}
          <div className="absolute right-0 top-full mt-1 z-20 bg-surface-elevated border border-border rounded-lg shadow-lg min-w-[160px] overflow-hidden">
            {/* Opción Vender/Hacer Oferta */}
            <button
              onClick={handleSell}
              className="w-full px-4 py-3 text-left text-sm hover:bg-surface flex items-center gap-2 text-text-primary"
            >
              <Plus className="h-4 w-4" />
              {onSell ? 'Vender' : 'Hacer Oferta'}
            </button>

            {/* Opción Subir/Activar Cláusula */}
            <button
              onClick={handleActivateClausula}
              disabled={!canUseClausula}
              className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2 ${
                canUseClausula 
                  ? 'hover:bg-surface text-text-primary' 
                  : 'text-text-secondary cursor-not-allowed opacity-50'
              }`}
              title={
                isOwnItem 
                  ? 'Subir valor de tu cláusula' 
                  : !hasClausula 
                    ? 'No tiene cláusula disponible' 
                    : clausulaDias > 0 
                      ? `Cláusula activa por ${clausulaDias} días más` 
                      : 'Pagar cláusula de rescate'
              }
            >
              <Unlock className="h-4 w-4" />
              {isOwnItem ? 'Subir Cláusula' : 'Pagar Cláusula'}
              {/* Removido el tiempo de cláusula del botón - solo se muestra en el perfil */}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PlayerItemActions; 