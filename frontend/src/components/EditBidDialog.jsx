import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { formatCurrency } from '../lib/utils';

export default function EditBidDialog({ 
  open, 
  onClose, 
  onSubmit, 
  pilot, 
  editBidValue, 
  setEditBidValue, 
  playerMoney 
}) {
  if (!pilot) return null;

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Editar Puja por {pilot.driver_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-20 h-20">
            <AvatarImage 
              src={pilot.image_url ? `/images/${pilot.image_url}` : ''}
              alt={pilot.driver_name || pilot.name}
            />
            <AvatarFallback className="text-lg font-bold">
              {(pilot.driver_name || pilot.name)?.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          
          <div className="text-center space-y-1">
            <p className="text-state-warning font-bold text-small uppercase tracking-wide">
              Valor de Mercado
            </p>
            <p className="text-text-primary font-bold text-body">
              {formatCurrency(Number(pilot.value))}
            </p>
            <p className="text-text-secondary text-small">
              Precio actual: {pilot.venta ? formatCurrency(pilot.venta) : '-'}
            </p>
          </div>
          
          <div className="w-full space-y-2">
            <label className="text-small font-medium text-text-secondary">
              Importe
            </label>
            <Input
              type="number"
              value={editBidValue}
              onChange={e => setEditBidValue(e.target.value)}
              placeholder="Introduce tu puja..."
            />
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={Number(editBidValue) > playerMoney || Number(editBidValue) <= 0}
            className="w-full bg-state-success hover:bg-state-success/90"
          >
            Editar Puja
          </Button>
          
          {Number(editBidValue) > playerMoney && (
            <p className="text-state-error text-small text-center">
              No tienes suficiente saldo
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}