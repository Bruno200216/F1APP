import React from 'react';
import { Lock } from 'lucide-react';

const ClausulaBadge = ({ daysLeft, clausulaValue }) => {
  if (!daysLeft || daysLeft <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
      <Lock className="h-3 w-3" />
      <span>{daysLeft} días</span>
    </div>
  );
};

export default ClausulaBadge; 