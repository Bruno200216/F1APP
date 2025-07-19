import React, { createContext, useContext, useState, useEffect } from 'react';

const LeagueContext = createContext();

export function LeagueProvider({ children }) {
  const [leagues, setLeagues] = useState([]);
  // Inicializar selectedLeague desde localStorage si existe
  const [selectedLeague, setSelectedLeague] = useState(() => {
    const stored = localStorage.getItem('selectedLeague');
    return stored ? JSON.parse(stored) : null;
  });

  // Guardar selectedLeague en localStorage cada vez que cambie
  useEffect(() => {
    if (selectedLeague) {
      localStorage.setItem('selectedLeague', JSON.stringify(selectedLeague));
    }
  }, [selectedLeague]);

  return (
    <LeagueContext.Provider value={{ leagues, setLeagues, selectedLeague, setSelectedLeague }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
} 