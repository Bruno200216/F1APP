import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { formatNumberWithDots, getTeamColor } from '../lib/utils';
import { TrendingUp, Euro, Lock, AlertCircle } from 'lucide-react';

const UpgradeClausulaModal = ({ 
  isOpen, 
  onClose, 
  item, 
  type, 
  onConfirm, 
  isLoading = false,
  playerMoney = 0 
}) => {
  const [upgradeAmount, setUpgradeAmount] = useState('');
  const [error, setError] = useState('');

  const currentClausula = item?.clausula_value || 0;
  const upgradeAmountNum = Number(upgradeAmount) || 0;
  const newClausulaValue = currentClausula + (upgradeAmountNum * 2);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setUpgradeAmount(value);
    
    const amount = Number(value);
    if (amount < 0) {
      setError('El monto debe ser positivo');
    } else if (amount > playerMoney) {
      setError('No tienes suficiente dinero');
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    if (upgradeAmountNum <= 0) {
      setError('Introduce un monto válido');
      return;
    }
    if (upgradeAmountNum > playerMoney) {
      setError('No tienes suficiente dinero');
      return;
    }
    
    onConfirm(upgradeAmountNum);
  };

  const handleClose = () => {
    setUpgradeAmount('');
    setError('');
    onClose();
  };

  if (!item) return null;

  const teamColor = getTeamColor(item.team || item.Team || item.constructor_name);
  const itemName = item.driver_name || item.name || item.Name || item.constructor_name;
  const itemTeam = item.team || item.Team || item.constructor_name;

  const getImageUrl = (item, type) => {
    if (type === 'pilot') {
      return item.image_url ? `/images/${item.image_url}` : '';
    } else if (type === 'track_engineer' || type === 'chief_engineer') {
      return item.image_url ? `/images/ingenierosdepista/${item.image_url}` : '';
    } else if (type === 'team_constructor') {
      return item.image_url ? `/images/equipos/${item.image_url}` : '';
    }
    return '';
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'pilot': return 'Piloto';
      case 'track_engineer': return 'Ingeniero de Pista';
      case 'chief_engineer': return 'Ingeniero Jefe';
      case 'team_constructor': return 'Equipo Constructor';
      default: return 'Elemento';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        style={{
          backgroundColor: '#1E1A1E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px'
        }}
      >
        <DialogHeader>
          <DialogTitle 
            className="text-xl font-bold flex items-center gap-2"
            style={{ color: '#FFFFFF' }}
          >
            <TrendingUp className="h-5 w-5" style={{ color: '#9D4EDD' }} />
             Subir Cláusula
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Info */}
          <div 
            className="flex items-center gap-4 p-4 rounded-lg border"
            style={{
              backgroundColor: '#121012',
              border: `1px solid ${teamColor.primary}20`
            }}
          >
            <Avatar className="w-16 h-16 border-2" style={{ borderColor: teamColor.primary }}>
              <AvatarImage src={getImageUrl(item, type)} alt={itemName} />
              <AvatarFallback 
                className="font-bold"
                style={{ backgroundColor: '#080705', color: '#FFFFFF' }}
              >
                {itemName?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="font-bold text-lg" style={{ color: teamColor.primary }}>
                {itemName}
              </h3>
              <p className="text-sm" style={{ color: '#C9A9DD' }}>
                {itemTeam}
              </p>
              <Badge 
                variant="outline" 
                className="mt-1"
                style={{ 
                  borderColor: teamColor.primary,
                  color: teamColor.primary,
                  backgroundColor: 'transparent'
                }}
              >
                {getTypeLabel(type)}
              </Badge>
            </div>
          </div>

          {/* Current Clausula */}
          <div 
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: '#121012',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: '#C9A9DD' }}>
                Cláusula Actual
              </span>
              <Lock className="h-4 w-4" style={{ color: '#9D4EDD' }} />
            </div>
            <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
              €{formatNumberWithDots(currentClausula)}
            </div>
          </div>

          {/* Upgrade Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#C9A9DD' }}>
                Monto a Invertir
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: '#9D4EDD' }} />
                <Input
                  type="number"
                  value={upgradeAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="pl-10"
                  style={{
                    backgroundColor: '#121012',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#FFFFFF'
                  }}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-2 text-sm" style={{ color: '#EA5455' }}>
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>

            {/* Preview */}
            {upgradeAmountNum > 0 && (
              <div 
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: '#121012',
                  border: '1px solid rgba(157, 78, 221, 0.2)'
                }}
              >
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span style={{ color: '#C9A9DD' }}>Inversión:</span>
                    <span style={{ color: '#FFFFFF' }}>€{formatNumberWithDots(upgradeAmountNum)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: '#C9A9DD' }}>Aumento de cláusula:</span>
                    <span style={{ color: '#28C76F' }}>+€{formatNumberWithDots(upgradeAmountNum * 2)}</span>
                  </div>
                  <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                  <div className="flex justify-between font-bold">
                    <span style={{ color: '#9D4EDD' }}>Nueva Cláusula:</span>
                    <span style={{ color: '#9D4EDD' }}>€{formatNumberWithDots(newClausulaValue)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Money Info */}
            <div className="text-sm" style={{ color: '#C9A9DD' }}>
              Dinero disponible: <span style={{ color: '#FFFFFF' }}>€{formatNumberWithDots(playerMoney)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#C9A9DD'
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || !!error || upgradeAmountNum <= 0}
              className="flex-1"
              style={{
                backgroundColor: '#9D4EDD',
                color: '#FFFFFF',
                border: 'none'
              }}
            >
              {isLoading ? 'Subiendo...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeClausulaModal; 