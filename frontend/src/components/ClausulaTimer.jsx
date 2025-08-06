import React, { useState, useEffect } from 'react';
import { Lock, Clock } from 'lucide-react';

const ClausulaTimer = ({ 
  clausulaTime, 
  clausulaValue, 
  className = "",
  showValue = false,
  compact = false 
}) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!clausulaTime) {
      setTimeLeft(null);
      setIsExpired(true);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(clausulaTime);
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft(null);
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      
      // Calcular tiempo restante
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalHours: diff / (1000 * 60 * 60) });
    };

    // Actualizar inmediatamente
    updateTimer();

    // Si quedan más de 24 horas, actualizar cada minuto
    // Si quedan menos de 24 horas, actualizar cada segundo
    const interval = setInterval(updateTimer, timeLeft && timeLeft.totalHours > 24 ? 60000 : 1000);

    return () => clearInterval(interval);
  }, [clausulaTime, timeLeft?.totalHours]);

  if (!clausulaTime || isExpired) {
    return null;
  }

  if (!timeLeft) {
    return null;
  }

  const formatTime = () => {
    if (timeLeft.totalHours > 24) {
      // Mostrar solo días cuando quedan más de 24 horas
      return `${timeLeft.days} día${timeLeft.days !== 1 ? 's' : ''}`;
    } else {
      // Mostrar tiempo real cuando quedan menos de 24 horas
      if (timeLeft.hours > 0) {
        return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
      } else if (timeLeft.minutes > 0) {
        return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
      } else {
        return `${timeLeft.seconds}s`;
      }
    }
  };

  const getTimerColor = () => {
    if (timeLeft.totalHours > 24) {
      return '#EA5455'; // Rojo para días
    } else if (timeLeft.totalHours > 1) {
      return '#FF9F43'; // Naranja para horas
    } else {
      return '#EA5455'; // Rojo crítico para minutos/segundos
    }
  };

  const getBackgroundColor = () => {
    if (timeLeft.totalHours > 24) {
      return 'rgba(234, 84, 85, 0.1)'; // Fondo rojo suave para días
    } else if (timeLeft.totalHours > 1) {
      return 'rgba(255, 159, 67, 0.1)'; // Fondo naranja suave para horas
    } else {
      return 'rgba(234, 84, 85, 0.2)'; // Fondo rojo más intenso para crítico
    }
  };

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${className}`}
        style={{
          backgroundColor: getBackgroundColor(),
          color: getTimerColor()
        }}
      >
        <Lock className="h-3 w-3" />
        <span>{formatTime()}</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 p-3 rounded-lg border ${className}`}
      style={{
        backgroundColor: '#121012',
        border: `1px solid ${getTimerColor()}20`
      }}
    >
      <div 
        className="flex items-center justify-center w-10 h-10 rounded-full"
        style={{
          backgroundColor: getBackgroundColor(),
          color: getTimerColor()
        }}
      >
        {timeLeft.totalHours > 24 ? (
          <Lock className="h-5 w-5" />
        ) : (
          <Clock className="h-5 w-5" />
        )}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: '#C9A9DD' }}>
            Cláusula Activa
          </span>
          {showValue && clausulaValue && (
            <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
              €{clausulaValue.toLocaleString()}
            </span>
          )}
        </div>
        <div 
          className="text-lg font-bold"
          style={{ color: getTimerColor() }}
        >
          {formatTime()}
        </div>
        {timeLeft.totalHours <= 24 && timeLeft.totalHours > 0 && (
          <div className="text-xs" style={{ color: '#C9A9DD' }}>
            {timeLeft.totalHours <= 1 ? '¡Expira pronto!' : 'Menos de 24 horas'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClausulaTimer; 