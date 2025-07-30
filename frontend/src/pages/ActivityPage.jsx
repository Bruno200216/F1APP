import React, { useEffect, useState } from 'react';

// UI Components from design.json style
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Icons
import { Activity, Clock, TrendingUp, TrendingDown, Users } from 'lucide-react';

// Utils
import { formatNumberWithDots } from '../lib/utils';

function formatDate(fecha) {
  const d = new Date(fecha);
  return isNaN(d) ? '' : d.toLocaleString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

function getPhrase({ Tipo, PlayerName, CounterName, PilotName, PilotMode, ValorPagado }) {
  const modo = PilotMode ? PilotMode.charAt(0).toUpperCase() + PilotMode.slice(1) : '';
  const valor = ValorPagado ? `€${formatNumberWithDots(ValorPagado)}` : '';
  
  if (Tipo === 'fichaje') {
    return {
      action: 'purchase',
      text: `${PlayerName} has signed ${PilotName} (${modo}) from ${CounterName}`,
      amount: valor
    };
  } else if (Tipo === 'venta') {
    return {
      action: 'sale',
      text: `${PlayerName} has sold ${PilotName} (${modo}) to ${CounterName}`,
      amount: valor
    };
  }
  
  return {
    action: 'unknown',
    text: '',
    amount: valor
  };
}

function getActionIcon(action) {
  switch (action) {
    case 'purchase':
      return <TrendingUp className="h-4 w-4 text-state-success" />;
    case 'sale':
      return <TrendingDown className="h-4 w-4 text-state-warning" />;
    default:
      return <Users className="h-4 w-4 text-text-secondary" />;
  }
}

function getActionColor(action) {
  switch (action) {
    case 'purchase':
      return 'text-state-success';
    case 'sale':
      return 'text-state-warning';
    default:
      return 'text-text-secondary';
  }
}

export default function ActivityPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/activity');
        const data = await res.json();
        setHistory(data.history || []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-main mx-auto mb-4"></div>
            <p className="text-text-secondary text-body">Loading market activity...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="h-6 w-6 text-accent-main" />
            <h1 className="text-h2 font-bold text-text-primary">Market Activity</h1>
          </div>
          <p className="text-text-secondary text-small">Recent transfers and market operations</p>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          {history.length === 0 ? (
            <Card className="text-center">
              <CardContent className="py-8">
                <Activity className="h-8 w-8 text-text-secondary mx-auto mb-3" />
                <CardTitle className="text-subtitle text-text-primary mb-1">No Recent Activity</CardTitle>
                <p className="text-text-secondary text-small">
                  No market operations have been recorded yet
                </p>
              </CardContent>
            </Card>
          ) : (
            history.map((item, idx) => {
              const phraseData = getPhrase(item);
              
              return (
                <Card key={idx} className="transition-all duration-200 hover:border-accent-hover">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Action Icon */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-elevated border border-border flex-shrink-0">
                        {getActionIcon(phraseData.action)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header with amount */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1">
                            <span className={`text-caption font-semibold uppercase tracking-wide ${getActionColor(phraseData.action)}`}>
                              {phraseData.action === 'purchase' ? 'Transfer In' : 
                               phraseData.action === 'sale' ? 'Transfer Out' : 'Market Operation'}
                            </span>
                          </div>
                          
                          {/* Amount */}
                          {phraseData.amount && (
                            <div className="text-right flex-shrink-0">
                              <div className={`text-small font-bold ${getActionColor(phraseData.action)}`}>
                                {phraseData.amount}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Text spanning full width */}
                        <p className="text-text-primary text-small font-medium leading-tight mb-1 pr-2">
                          {phraseData.text}
                        </p>
                        
                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-text-secondary">
                          <Clock className="h-3 w-3" />
                          <span className="text-caption">
                            {formatDate(item.Fecha)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer Stats */}
        {history.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-text-secondary text-caption">
              Showing {history.length} recent market operation{history.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 