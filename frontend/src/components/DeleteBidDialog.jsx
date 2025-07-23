import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { formatCurrency } from '../lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function DeleteBidDialog({ open, onClose, onConfirm, pilot }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5 text-state-error" />
            Eliminar Oferta
          </DialogTitle>
        </DialogHeader>
        
        {pilot && (
          <div className="text-center space-y-4">
            <p className="text-text-primary">
              Vas a eliminar la puja por{' '}
              <span className="text-state-warning font-bold">
                {pilot.driver_name || pilot.name}
              </span>
              {' '}por{' '}
              <span className="text-state-warning font-bold">
                {formatCurrency(pilot.value)}
              </span>
            </p>
            
            <p className="text-text-secondary text-small">
              ¿Estás seguro? Esta acción no se puede deshacer.
            </p>
          </div>
        )}
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}