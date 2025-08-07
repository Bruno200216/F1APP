import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Euro } from 'lucide-react';

const MakeOfferModal = ({ 
  isOpen, 
  onClose, 
  item, 
  type, 
  onConfirm, 
  isLoading = false,
  playerMoney = 0 
}) => {
  const [offerAmount, setOfferAmount] = useState('');

  const handleConfirm = () => {
    const amount = Number(offerAmount);
    if (amount > 0 && amount <= playerMoney) {
      onConfirm(amount);
      setOfferAmount('');
    }
  };

  const handleClose = () => {
    setOfferAmount('');
    onClose();
  };

  const isValidAmount = () => {
    const amount = Number(offerAmount);
    return amount > 0 && amount <= playerMoney;
  };

  const getItemInfo = () => {
    if (!item) return {};
    
    switch (type) {
      case 'pilot':
        return {
          name: item.driver_name || item.name,
          team: item.team,
          image: item.image_url,
          type: 'Piloto'
        };
      case 'track_engineer':
      case 'chief_engineer':
        return {
          name: item.name,
          team: item.team,
          image: item.image_url,
          type: type === 'track_engineer' ? 'Ingeniero de Pista' : 'Ingeniero Jefe'
        };
      case 'team_constructor':
        return {
          name: item.name,
          team: item.team,
          image: item.image_url,
          type: 'Constructor'
        };
      default:
        return {
          name: item.name || 'Item',
          team: item.team,
          image: item.image_url,
          type: 'Item'
        };
    }
  };

  const itemInfo = getItemInfo();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-surface-elevated border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary text-h4 font-bold">
            Hacer Oferta
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Información del item */}
          <div className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-border">
            <Avatar className="w-16 h-16 border-2 border-accent-main">
              <AvatarImage 
                src={`/images/${itemInfo.image}`}
                alt={itemInfo.name}
              />
              <AvatarFallback className="bg-surface-elevated text-text-primary font-bold">
                {itemInfo.name?.substring(0, 2) || '??'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-body text-text-primary">{itemInfo.name}</h3>
              <p className="text-text-secondary text-small">{itemInfo.team}</p>
              <p className="text-accent-main text-small font-medium">{itemInfo.type}</p>
            </div>
          </div>

          {/* Input para el monto de la oferta */}
          <div className="space-y-2">
            <Label htmlFor="offer-amount" className="text-text-primary font-medium">
              Monto de la Oferta
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                id="offer-amount"
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="0"
                className="pl-10 bg-surface border-border text-text-primary"
                min="1"
                max={playerMoney}
              />
            </div>
            <p className="text-text-secondary text-xs">
              Dinero disponible: €{playerMoney.toLocaleString()}
            </p>
          </div>

          {/* Validación */}
          {offerAmount && !isValidAmount() && (
            <div className="p-3 bg-state-error/10 border border-state-error rounded-lg">
              <p className="text-state-error text-sm">
                {Number(offerAmount) <= 0 
                  ? 'El monto debe ser mayor a 0' 
                  : 'No tienes suficiente dinero'}
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-text-primary hover:bg-surface"
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValidAmount() || isLoading}
            className="flex-1 bg-accent-main text-white hover:bg-accent-main/90"
          >
            {isLoading ? 'Enviando...' : 'Confirmar Oferta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferModal; 