import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// UI Components from design.json style
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';

// Icons
import { Settings, ArrowLeft, Save, X, Trophy, Flag, Timer } from 'lucide-react';

export default function AdminScoresPage() {
  const [step, setStep] = useState(0); // 0: elegir GP, 1: elegir tipo, 2: elegir modo, 3: posiciones esperadas
  const [sessionType, setSessionType] = useState('');
  const [expectedMode, setExpectedMode] = useState('');
  const [pilots, setPilots] = useState([]);
  const [gps, setGps] = useState([]);
  const [selectedGP, setSelectedGP] = useState('');
  const [expectedPositions, setExpectedPositions] = useState(Array(20).fill(''));
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [sessionPilots, setSessionPilots] = useState([]);
  const [selectedSessionPilot, setSelectedSessionPilot] = useState('');
  const [sessionForm, setSessionForm] = useState({});
  const [sessionSnackbar, setSessionSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Estado para mostrar puntos calculados en tiempo real
  const [calculatedPoints, setCalculatedPoints] = useState(0);
  const [expectedPositionForCalc, setExpectedPositionForCalc] = useState(0);
  const [isUpdatingLineupPoints, setIsUpdatingLineupPoints] = useState(false);
  const [isResettingLineupPoints, setIsResettingLineupPoints] = useState(false);
  const [isClearingLineupPoints, setIsClearingLineupPoints] = useState(false);
  const [selectedGPForPoints, setSelectedGPForPoints] = useState('');
  
  // Estados para posiciones de equipos
  const [teamExpectedPositions, setTeamExpectedPositions] = useState(Array(10).fill(''));
  const [teamFinishPositions, setTeamFinishPositions] = useState(Array(10).fill(''));
  const [teams, setTeams] = useState([]);
  const [teamSnackbar, setTeamSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Estados para formularios de equipos
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamForm, setTeamForm] = useState({});
  const [teamSessionSnackbar, setTeamSessionSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/pilots').then(res => res.json()).then(data => setPilots(data.pilots || []));
    fetch('/api/grand-prix').then(res => res.json()).then(data => setGps(data.gps || []));
  }, []);

  // Cargar equipos únicos cuando se selecciona un GP
  useEffect(() => {
    if (selectedGP) {
      // Obtener team constructors del GP seleccionado
      fetch(`/api/admin/team-constructors?gp_index=${selectedGP}`)
        .then(res => res.json())
        .then(data => {
          const teamNames = data.team_constructors?.map(tc => tc.name) || [];
          setTeams(teamNames);
          
          // Inicializar arrays de posiciones (10 posiciones para equipos)
          setTeamExpectedPositions(Array(10).fill(''));
          setTeamFinishPositions(Array(10).fill(''));
        });
    }
  }, [selectedGP]);

  // Cargar posiciones existentes cuando se selecciona un paso de equipo
  useEffect(() => {
    if (selectedGP && (step === 'team-expected' || step === 'team-finish')) {
      const endpoint = step === 'team-expected' ? 'team-expected-positions' : 'team-finish-positions';
      
      fetch(`/api/admin/${endpoint}?gp_index=${selectedGP}`)
        .then(res => res.json())
        .then(data => {
          if (data.positions && data.positions.length > 0) {
            if (step === 'team-expected') {
              // Crear array de 10 posiciones y llenar con los datos existentes
              const newPositions = Array(10).fill('');
              data.positions.forEach(pos => {
                const positionIndex = Math.floor(pos.expected_position) - 1;
                if (positionIndex >= 0 && positionIndex < 10) {
                  newPositions[positionIndex] = pos.team;
                }
              });
              setTeamExpectedPositions(newPositions);
            } else {
              // Crear array de 10 posiciones y llenar con los datos existentes
              const newPositions = Array(10).fill('');
              data.positions.forEach(pos => {
                const positionIndex = Math.floor(pos.finish_position) - 1;
                if (positionIndex >= 0 && positionIndex < 10) {
                  newPositions[positionIndex] = pos.team;
                }
              });
              setTeamFinishPositions(newPositions);
            }
          }
        })
        .catch(error => {
          console.error('Error loading team positions:', error);
        });
    }
  }, [selectedGP, step]);

  // Cargar datos existentes cuando se selecciona un equipo
  useEffect(() => {
    if (selectedGP && selectedTeam && step === 'team-session') {
      fetch(`/api/admin/team-session-result?gp_index=${selectedGP}&team=${encodeURIComponent(selectedTeam)}`)
        .then(res => res.json())
        .then(data => {
          if (data.result) {
            setTeamForm(data.result);
          } else {
            setTeamForm({});
          }
        })
        .catch(error => {
          console.error('Error loading team session data:', error);
          setTeamForm({});
        });
    }
  }, [selectedGP, selectedTeam, step]);

  useEffect(() => {
    // Cuando se selecciona GP y modo, precargar datos si existen
    if (selectedGP && expectedMode) {
      fetch(`/api/admin/expected-positions?gp_index=${selectedGP}&mode=${expectedMode}`)
        .then(res => res.json())
        .then(data => {
          if (data.positions && data.positions.length > 0) {
            // Ordenar por expected_position y mapear a array de 20 ids
            const arr = Array(20).fill('');
            data.positions.forEach((pos, idx) => {
              if (pos.expected_position >= 1 && pos.expected_position <= 20) {
                arr[pos.expected_position - 1] = pos.pilot_id;
              }
            });
            setExpectedPositions(arr);
          } else {
            setExpectedPositions(Array(20).fill(''));
          }
        });
    }
  }, [selectedGP, expectedMode]);

  // Cuando se selecciona GP y sessionType, cargar pilotos y datos existentes
  useEffect(() => {
    if (selectedGP && sessionType) {
      // Cargar pilotos para el modo
      const modeMap = { race: "R", qualy: "Q", practice: "P" };
      setSessionPilots(pilots.filter(p => p.mode === modeMap[sessionType]).slice(0, 20));
      setSelectedSessionPilot('');
      setSessionForm({});
    }
  }, [selectedGP, sessionType, pilots]);

  // Al seleccionar un piloto, cargar sus datos existentes
  useEffect(() => {
    if (selectedGP && sessionType && selectedSessionPilot) {
      fetch(`/api/admin/session-result?gp_index=${selectedGP}&mode=${sessionType}&pilot_id=${selectedSessionPilot}`)
        .then(res => res.json())
        .then(data => {
          console.log('[DEBUG] data.result recibido:', data.result);
          if (data.result) {
            // Mapear campos booleanos a 'true'/'false' string para selects
            const mapped = { ...data.result };
            sessionFields[sessionType].forEach(field => {
              if (field.type === 'checkbox' && field.name in mapped) {
                if (mapped[field.name] === 1 || mapped[field.name] === true) mapped[field.name] = 'true';
                else if (mapped[field.name] === 0 || mapped[field.name] === false) mapped[field.name] = 'false';
                else if (mapped[field.name] === null || mapped[field.name] === undefined) mapped[field.name] = 'false';
              }
            });
            console.log('[DEBUG] mapped después de conversión:', mapped);
            setSessionForm(mapped);
          } else setSessionForm({});
        });
    }
  }, [selectedSessionPilot, selectedGP, sessionType]);

  // Efecto para calcular puntos en tiempo real cuando cambian los valores del formulario
  useEffect(() => {
    const calculateRealTimePoints = async () => {
      if (!selectedSessionPilot || !sessionForm.finish_position) {
        setCalculatedPoints(0);
        return;
      }

      // Obtener posición esperada si no la tenemos
      let expectedPos = expectedPositionForCalc;
      if (!expectedPos) {
        try {
          const expectedResponse = await fetch(`/api/admin/session-result?gp_index=${selectedGP}&mode=${sessionType}&pilot_id=${selectedSessionPilot}`);
          const expectedData = await expectedResponse.json();
          expectedPos = expectedData.result?.expected_position || 0;
          
          if (!expectedPos) {
            const expectedPositionsResponse = await fetch(`/api/admin/expected-positions?gp_index=${selectedGP}&mode=${sessionType}`);
            const expectedPositionsData = await expectedPositionsResponse.json();
            const pilotExpected = expectedPositionsData.positions?.find(p => p.pilot_id === parseInt(selectedSessionPilot));
            expectedPos = pilotExpected?.expected_position || 0;
          }
          setExpectedPositionForCalc(expectedPos);
        } catch (error) {
          console.error('Error getting expected position:', error);
          return;
        }
      }

      if (expectedPos && sessionForm.finish_position) {
        const bonuses = {
          positions_gained_at_start: parseInt(sessionForm.positions_gained_at_start) || 0,
          clean_overtakes: parseInt(sessionForm.clean_overtakes) || 0,
          net_positions_lost: parseInt(sessionForm.net_positions_lost) || 0,
          fastest_lap: sessionForm.fastest_lap === 'true',
          caused_vsc: sessionForm.caused_vsc === 'true',
          caused_sc: sessionForm.caused_sc === 'true',
          caused_red_flag: sessionForm.caused_red_flag === 'true',
          dnf_driver_error: sessionForm.dnf_driver_error === 'true',
          dnf_no_fault: sessionForm.dnf_no_fault === 'true'
        };
        
        const points = calculatePoints(expectedPos, parseInt(sessionForm.finish_position), sessionType, bonuses);
        setCalculatedPoints(points);
      }
    };

    calculateRealTimePoints();
  }, [sessionForm, selectedSessionPilot, selectedGP, sessionType, expectedPositionForCalc]);

  // Limpiar estados cuando cambia el piloto seleccionado
  useEffect(() => {
    setCalculatedPoints(0);
    setExpectedPositionForCalc(0);
  }, [selectedSessionPilot]);

  // Filtrar solo 20 pilotos para el modo seleccionado
  const getModePilots = () => {
    if (pilots.length === 0) return [];
    // Mapear expectedMode a la letra usada en los datos
    const modeMap = { race: "R", qualy: "Q", practice: "P" };
    if (pilots[0].mode) {
      return pilots.filter(p => p.mode === modeMap[expectedMode]).slice(0, 20);
    }
    return pilots.slice(0, 20);
  };

  // Opciones de pilotos disponibles para cada fila (sin repetir)
  const getAvailablePilots = idx => {
    const selected = expectedPositions.map((p, i) => i !== idx ? p : null).filter(Boolean);
    return getModePilots().filter(p => !selected.includes(p.id));
  };

  const handleExpectedPilotChange = (idx, value) => {
    const updated = expectedPositions.map((p, i) => i === idx ? value : p);
    setExpectedPositions(updated);
  };

  const handleSaveExpected = async () => {
    try {
      const payload = {
        gp_index: parseInt(selectedGP),
        mode: expectedMode,
        positions: expectedPositions.map((pilot_id, idx) => ({ pilot_id: parseInt(pilot_id), expected_position: idx + 1 }))
      };
      console.log('📤 Enviando expected positions:', payload);
      const res = await fetch('/api/admin/expected-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Posiciones guardadas', severity: 'success' });
        setTimeout(() => setSnackbar({ open: false, message: '', severity: 'success' }), 3000);
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
        setTimeout(() => setSnackbar({ open: false, message: '', severity: 'error' }), 3000);
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Error de red', severity: 'error' });
      setTimeout(() => setSnackbar({ open: false, message: '', severity: 'error' }), 3000);
    }
  };

  const handleSessionFieldChange = (e) => {
    const { name, value, type } = e.target;
    setSessionForm(f => ({ ...f, [name]: type === 'checkbox' ? e.target.checked : value }));
  };

  // Función para calcular puntos automáticamente según las fórmulas
  const calculatePoints = (expectedPosition, finishPosition, sessionType, bonuses = {}) => {
    // Calcular delta: expected_position - actual_position
    const delta = expectedPosition - finishPosition;
    
    // Multiplicadores por sesión según las reglas
    const multipliers = {
      race: { up: 10, down: -5, cap: 50 },
      qualy: { up: 6, down: -3, cap: 30 },
      practice: { up: 2, down: -1, cap: 10 }
    };
    
    const sessionMultiplier = multipliers[sessionType];
    if (!sessionMultiplier) return 0;
    
    // Calcular puntos base por delta
    let points = 0;
    if (delta > 0) {
      // Mejor posición de la esperada
      points = sessionMultiplier.up * delta;
    } else if (delta < 0) {
      // Peor posición de la esperada
      points = sessionMultiplier.down * delta; // delta es negativo, down es negativo, resultado positivo
    }
    
    // Aplicar límite (cap)
    points = Math.max(-sessionMultiplier.cap, Math.min(sessionMultiplier.cap, points));
    
    // Añadir bonificaciones y penalizaciones por eventos
    if (bonuses.positions_gained_at_start > 1) {
      points += 3; // Posiciones ganadas en la salida
    }
    
    if (bonuses.clean_overtakes) {
      points += bonuses.clean_overtakes * 2; // +2 por adelantamiento limpio
    }
    
    if (bonuses.net_positions_lost) {
      points -= bonuses.net_positions_lost * 1; // -1 por posición perdida
    }
    
    if (bonuses.fastest_lap && finishPosition <= 10) {
      points += 5; // Vuelta rápida (solo si termina P1-10)
    }
    
    if (bonuses.caused_vsc) {
      points -= 5; // Causar Virtual SC
    }
    
    if (bonuses.caused_sc) {
      points -= 8; // Causar Safety Car
    }
    
    if (bonuses.caused_red_flag) {
      points -= 12; // Causar bandera roja
    }
    
    if (bonuses.dnf_driver_error) {
      points -= 10; // DNF por error del piloto
    }
    
    if (bonuses.dnf_no_fault) {
      points -= 3; // DNF sin culpa
    }
    
    return Math.round(points);
  };

  // Función para obtener la posición del compañero de equipo
  const getTeammatePosition = async (pilotId, gpIndex, mode) => {
    try {
      // Primero obtener el equipo del piloto actual
      const pilotResponse = await fetch(`/api/pilots/${pilotId}`);
      const pilotData = await pilotResponse.json();
      const currentPilotTeam = pilotData.pilot?.team;
      
      if (!currentPilotTeam) return null;
      
      // Buscar todos los pilotos del mismo equipo y modo
      const modeMap = { race: "R", qualy: "Q", practice: "P" };
      const teammates = pilots.filter(p => 
        p.team === currentPilotTeam && 
        p.mode === modeMap[mode] && 
        p.id !== parseInt(pilotId)
      );
      
      if (teammates.length === 0) return null;
      
      // Obtener la posición del compañero en este GP
      const teammateId = teammates[0].id;
      const resultResponse = await fetch(`/api/admin/session-result?gp_index=${gpIndex}&mode=${mode}&pilot_id=${teammateId}`);
      const resultData = await resultResponse.json();
      
      return resultData.result?.finish_position || null;
    } catch (error) {
      console.error('Error getting teammate position:', error);
      return null;
    }
  };

  const handleSaveSession = async () => {
    try {
      // Obtener la posición esperada del piloto
      let expectedPosition = 0;
      const expectedResponse = await fetch(`/api/admin/session-result?gp_index=${selectedGP}&mode=${sessionType}&pilot_id=${selectedSessionPilot}`);
      const expectedData = await expectedResponse.json();
      expectedPosition = expectedData.result?.expected_position || 0;
      
      // Si no hay posición esperada, intentar obtenerla de las posiciones esperadas guardadas
      if (!expectedPosition) {
        const expectedPositionsResponse = await fetch(`/api/admin/expected-positions?gp_index=${selectedGP}&mode=${sessionType}`);
        const expectedPositionsData = await expectedPositionsResponse.json();
        const pilotExpected = expectedPositionsData.positions?.find(p => p.pilot_id === parseInt(selectedSessionPilot));
        expectedPosition = pilotExpected?.expected_position || 0;
      }
      
      // Calcular puntos automáticamente si tenemos posición esperada y final
      let calculatedPoints = 0;
      const finishPosition = parseInt(sessionForm.finish_position) || 0;
      
      if (expectedPosition && finishPosition) {
        // Preparar bonificaciones
        const bonuses = {
          positions_gained_at_start: parseInt(sessionForm.positions_gained_at_start) || 0,
          clean_overtakes: parseInt(sessionForm.clean_overtakes) || 0,
          net_positions_lost: parseInt(sessionForm.net_positions_lost) || 0,
          fastest_lap: sessionForm.fastest_lap === true || sessionForm.fastest_lap === 'true',
          caused_vsc: sessionForm.caused_vsc === true || sessionForm.caused_vsc === 'true',
          caused_sc: sessionForm.caused_sc === true || sessionForm.caused_sc === 'true',
          caused_red_flag: sessionForm.caused_red_flag === true || sessionForm.caused_red_flag === 'true',
          dnf_driver_error: sessionForm.dnf_driver_error === true || sessionForm.dnf_driver_error === 'true',
          dnf_no_fault: sessionForm.dnf_no_fault === true || sessionForm.dnf_no_fault === 'true'
        };
        
        calculatedPoints = calculatePoints(expectedPosition, finishPosition, sessionType, bonuses);
        
        // Obtener posición del compañero para multiplicador de Track Engineer
        const teammatePosition = await getTeammatePosition(selectedSessionPilot, selectedGP, sessionType);
        
        // Aplicar multiplicador de Track Engineer si corresponde
        if (teammatePosition) {
          const multiplier = finishPosition < teammatePosition ? 1.5 : 1.2;
          calculatedPoints = Math.round(calculatedPoints * multiplier);
        }
      }
      
      // Calcular delta position
      const deltaPosition = expectedPosition - finishPosition;
      
      // Construir payload con tipos correctos
      const payload = {
        gp_index: parseInt(selectedGP),
        mode: sessionType,
        pilot_id: parseInt(selectedSessionPilot),
        expected_position: expectedPosition,
        delta_position: deltaPosition,
        points: calculatedPoints || parseInt(sessionForm.points) || 0,
        // Campos numéricos
        start_position: parseInt(sessionForm.start_position) || null,
        finish_position: parseInt(sessionForm.finish_position) || null,
        positions_gained_at_start: parseInt(sessionForm.positions_gained_at_start) || null,
        clean_overtakes: parseInt(sessionForm.clean_overtakes) || null,
        net_positions_lost: parseInt(sessionForm.net_positions_lost) || null,
        // Campos booleanos
        fastest_lap: sessionForm.fastest_lap === true || sessionForm.fastest_lap === 'true' || false,
        caused_vsc: sessionForm.caused_vsc === true || sessionForm.caused_vsc === 'true' || false,
        caused_sc: sessionForm.caused_sc === true || sessionForm.caused_sc === 'true' || false,
        caused_red_flag: sessionForm.caused_red_flag === true || sessionForm.caused_red_flag === 'true' || false,
        dnf_driver_error: sessionForm.dnf_driver_error === true || sessionForm.dnf_driver_error === 'true' || false,
        dnf_no_fault: sessionForm.dnf_no_fault === true || sessionForm.dnf_no_fault === 'true' || false
      };
      
      const res = await fetch('/api/admin/session-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        // Llamar al endpoint para calcular puntos de Track Engineers
        try {
          await fetch('/api/admin/calculate-track-engineer-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gp_index: parseInt(selectedGP),
              mode: sessionType,
              pilot_id: parseInt(selectedSessionPilot),
              league_id: 35 // TODO: obtener de contexto
            })
          });
        } catch (trackEngError) {
          console.error('Error calculando puntos Track Engineer:', trackEngError);
        }

        const deltaPoints = Math.round((expectedPosition - finishPosition) * (sessionType === 'race' ? 10 : sessionType === 'qualy' ? 6 : 2));
        const eventPoints = calculatedPoints - deltaPoints;
        setSessionSnackbar({ 
          open: true, 
          message: `✅ Guardado. Total: ${calculatedPoints} (Delta: ${deltaPoints} + Eventos: ${eventPoints})`, 
          severity: 'success' 
        });
        setTimeout(() => setSessionSnackbar({ open: false, message: '', severity: 'success' }), 5000);
      } else {
        setSessionSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
        setTimeout(() => setSessionSnackbar({ open: false, message: '', severity: 'error' }), 3000);
      }
    } catch (e) {
      setSessionSnackbar({ open: true, message: 'Error de red', severity: 'error' });
      setTimeout(() => setSessionSnackbar({ open: false, message: '', severity: 'error' }), 3000);
    }
  };

  // Campos de edición por modo (sin start_position ni delta_position)
  const sessionFields = {
    race: [
      { name: 'finish_position', label: 'Posición final', type: 'number' },
      { name: 'points', label: 'Puntos', type: 'number' },
      { name: 'positions_gained_at_start', label: 'Posiciones ganadas en salida', type: 'number' },
      { name: 'clean_overtakes', label: 'Adelantamientos limpios', type: 'number' },
      { name: 'net_positions_lost', label: 'Posiciones netas perdidas', type: 'number' },
      { name: 'fastest_lap', label: 'Vuelta rápida', type: 'checkbox' },
      { name: 'caused_vsc', label: 'Causó VSC', type: 'checkbox' },
      { name: 'caused_sc', label: 'Causó SC', type: 'checkbox' },
      { name: 'caused_red_flag', label: 'Causó bandera roja', type: 'checkbox' },
      { name: 'dnf_driver_error', label: 'DNF error piloto', type: 'checkbox' },
      { name: 'dnf_no_fault', label: 'DNF sin culpa', type: 'checkbox' },
    ],
    qualy: [
      { name: 'finish_position', label: 'Posición final', type: 'number' },
      { name: 'points', label: 'Puntos', type: 'number' },
      { name: 'caused_red_flag', label: 'Causó bandera roja', type: 'checkbox' },
    ],
    practice: [
      { name: 'finish_position', label: 'Posición final', type: 'number' },
      { name: 'points', label: 'Puntos', type: 'number' },
      { name: 'caused_red_flag', label: 'Causó bandera roja', type: 'checkbox' },
    ]
  };

  const getSessionIcon = (session) => {
    switch (session) {
      case 'race': return <Flag className="h-5 w-5" />;
      case 'qualy': return <Trophy className="h-5 w-5" />;
      case 'practice': return <Timer className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const handleUpdateLineupPoints = async () => {
    if (!selectedGPForPoints) {
      setSnackbar({ open: true, message: 'Por favor selecciona un Grand Prix para actualizar puntos', severity: 'error' });
      return;
    }

    setIsUpdatingLineupPoints(true);
    try {
      // Obtener el league_id del localStorage o de algún contexto
      const leagueId = localStorage.getItem('currentLeagueId') || '1'; // Default a 1 si no hay
      
      const response = await fetch('/api/admin/update-lineup-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          league_id: parseInt(leagueId),
          gp_index: parseInt(selectedGPForPoints)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `✅ ${data.message}`, 
          severity: 'success' 
        });
      } else {
        // Manejar específicamente el error de puntos ya calculados
        if (data.error && data.error.includes('ya tienen puntos calculados')) {
          setSnackbar({ 
            open: true, 
            message: `⚠️ ${data.error}`, 
            severity: 'warning' 
          });
        } else {
          setSnackbar({ 
            open: true, 
            message: `❌ Error: ${data.error}`, 
            severity: 'error' 
          });
        }
      }
    } catch (error) {
      console.error('Error updating lineup points:', error);
      setSnackbar({ 
        open: true, 
        message: '❌ Error de conexión', 
        severity: 'error' 
      });
    } finally {
      setIsUpdatingLineupPoints(false);
    }
  };

  const handleResetLineupPoints = async () => {
    if (!selectedGPForPoints) {
      setSnackbar({ open: true, message: 'Por favor selecciona un Grand Prix para resetear puntos', severity: 'error' });
      return;
    }

    // Confirmar antes de resetear
    if (!window.confirm(`¿Estás seguro de que quieres resetear todos los puntos de alineaciones para el GP ${selectedGPForPoints}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsResettingLineupPoints(true);
    try {
      const leagueId = localStorage.getItem('currentLeagueId') || '1';
      
      const response = await fetch('/api/admin/reset-lineup-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          league_id: parseInt(leagueId),
          gp_index: parseInt(selectedGPForPoints)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `✅ ${data.message}`, 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `❌ Error: ${data.error}`, 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Error resetting lineup points:', error);
      setSnackbar({ 
        open: true, 
        message: '❌ Error de conexión', 
        severity: 'error' 
      });
    } finally {
      setIsResettingLineupPoints(false);
    }
  };

  const handleClearLineupPoints = async () => {
    if (!selectedGPForPoints) {
      setSnackbar({ open: true, message: 'Por favor selecciona un Grand Prix para limpiar puntos', severity: 'error' });
      return;
    }

    // Confirmar antes de limpiar
    if (!window.confirm(`¿Estás seguro de que quieres LIMPIAR TODOS los puntos de alineaciones para el GP ${selectedGPForPoints}? Esta acción es irreversible y eliminará todos los puntos calculados.`)) {
      return;
    }

    setIsClearingLineupPoints(true);
    try {
      const leagueId = localStorage.getItem('currentLeagueId') || '1';
      
      const response = await fetch('/api/admin/reset-lineup-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          league_id: parseInt(leagueId),
          gp_index: parseInt(selectedGPForPoints)
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `✅ ${data.message}`, 
          severity: 'success' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `❌ Error: ${data.error}`, 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Error clearing lineup points:', error);
      setSnackbar({ 
        open: true, 
        message: '❌ Error de conexión', 
        severity: 'error' 
      });
    } finally {
      setIsClearingLineupPoints(false);
    }
  };

  // Funciones para manejar posiciones de equipos
  const handleTeamExpectedPositionChange = (idx, value) => {
    const updated = teamExpectedPositions.map((team, i) => i === idx ? value : team);
    setTeamExpectedPositions(updated);
  };

  const handleTeamFinishPositionChange = (idx, value) => {
    const updated = teamFinishPositions.map((team, i) => i === idx ? value : team);
    setTeamFinishPositions(updated);
  };

  // Opciones de equipos disponibles para cada fila (sin repetir)
  const getAvailableTeams = idx => {
    const selected = teamExpectedPositions.map((team, i) => i !== idx ? team : null).filter(Boolean);
    return teams.filter(team => !selected.includes(team));
  };

  const getAvailableTeamsForFinish = idx => {
    const selected = teamFinishPositions.map((team, i) => i !== idx ? team : null).filter(Boolean);
    return teams.filter(team => !selected.includes(team));
  };

  const handleSaveTeamExpectedPositions = async () => {
    try {
      const payload = {
        gp_index: parseInt(selectedGP),
        positions: teamExpectedPositions.map((team, idx) => ({ 
          team: team, 
          expected_position: idx + 1 
        })).filter(pos => pos.team !== '')
      };
      
      const res = await fetch('/api/admin/team-expected-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setTeamSnackbar({ open: true, message: 'Posiciones esperadas de equipos guardadas', severity: 'success' });
        setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'success' }), 3000);
      } else {
        setTeamSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
        setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'error' }), 3000);
      }
    } catch (e) {
      setTeamSnackbar({ open: true, message: 'Error de red', severity: 'error' });
      setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'error' }), 3000);
    }
  };

  const handleSaveTeamFinishPositions = async () => {
    try {
      const payload = {
        gp_index: parseInt(selectedGP),
        positions: teamFinishPositions.map((team, idx) => ({ 
          team: team, 
          finish_position: idx + 1 
        })).filter(pos => pos.team !== '')
      };
      
      const res = await fetch('/api/admin/team-finish-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setTeamSnackbar({ open: true, message: 'Posiciones finales de equipos guardadas', severity: 'success' });
        setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'success' }), 3000);
      } else {
        setTeamSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
        setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'error' }), 3000);
      }
    } catch (e) {
      setTeamSnackbar({ open: true, message: 'Error de red', severity: 'error' });
      setTimeout(() => setTeamSnackbar({ open: false, message: '', severity: 'error' }), 3000);
    }
  };

  // Funciones para manejar formularios de equipos
  const handleTeamFieldChange = (e) => {
    const { name, value, type } = e.target;
    setTeamForm(f => ({ ...f, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSaveTeamSession = async () => {
    try {
      // Calcular delta position
      const expectedPosition = parseFloat(teamForm.expected_position) || 0;
      const finishPosition = parseInt(teamForm.finish_position) || 0;
      const deltaPosition = expectedPosition - finishPosition;
      
      // Construir payload
      const payload = {
        gp_index: parseInt(selectedGP),
        team: selectedTeam,
        expected_position: expectedPosition,
        finish_position: finishPosition,
        delta_position: deltaPosition,
        pitstop_time: parseFloat(teamForm.pitstop_time) || null,
        points: parseInt(teamForm.points) || 0
      };
      
      const res = await fetch('/api/admin/team-session-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setTeamSessionSnackbar({ 
          open: true, 
          message: `✅ Resultados del equipo guardados. Delta: ${deltaPosition}`, 
          severity: 'success' 
        });
        setTimeout(() => setTeamSessionSnackbar({ open: false, message: '', severity: 'success' }), 5000);
      } else {
        setTeamSessionSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
        setTimeout(() => setTeamSessionSnackbar({ open: false, message: '', severity: 'error' }), 3000);
      }
    } catch (e) {
      setTeamSessionSnackbar({ open: true, message: 'Error de red', severity: 'error' });
      setTimeout(() => setTeamSessionSnackbar({ open: false, message: '', severity: 'error' }), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Settings className="h-8 w-8 text-accent-main" />
            <h1 className="text-h1 font-bold text-text-primary">Admin Scores</h1>
          </div>
          <p className="text-text-secondary text-body">Manage race results and expected positions</p>
        </div>

        {/* Success/Error Messages */}
        {snackbar.open && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
            snackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
          } text-white`}>
            {snackbar.message}
          </div>
        )}
        
        {sessionSnackbar.open && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
            sessionSnackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
          } text-white`}>
            {sessionSnackbar.message}
          </div>
        )}
        
        {teamSnackbar.open && (
          <div className={`fixed top-16 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
            teamSnackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
          } text-white`}>
            {teamSnackbar.message}
          </div>
        )}
        
        {teamSessionSnackbar.open && (
          <div className={`fixed top-28 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
            teamSessionSnackbar.severity === 'success' ? 'bg-state-success' : 'bg-state-error'
          } text-white`}>
            {teamSessionSnackbar.message}
          </div>
        )}

        <Card>
          <CardContent className="p-6">
            {/* Step 0: Select GP */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-text-primary text-small font-medium mb-3">
                    Select Grand Prix
                  </label>
                  <select
                    value={selectedGP}
                    onChange={(e) => setSelectedGP(e.target.value)}
                    className="w-full p-3 bg-surface-elevated border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                  >
                    <option value="">Choose a Grand Prix...</option>
                    {gps.map(gp => (
                      <option key={gp.gp_index} value={gp.gp_index}>{gp.name}</option>
                    ))}
                  </select>
                </div>

                {selectedGP && (
                  <div className="space-y-4">
                    <Button
                      onClick={() => setStep('expected')}
                      className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                    >
                      <Trophy className="h-6 w-6" />
                      Expected Positions
                    </Button>
                    <Button
                      onClick={() => setStep(1)}
                      className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                    >
                      <Flag className="h-6 w-6" />
                      Session Results
                    </Button>
                    <Button
                      onClick={() => setStep('team-expected')}
                      className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                    >
                      <Trophy className="h-6 w-6" />
                      Team Expected Positions
                    </Button>
                    <Button
                      onClick={() => setStep('team-finish')}
                      className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                    >
                      <Flag className="h-6 w-6" />
                      Team Finish Positions
                    </Button>
                    <Button
                      onClick={() => setStep('team-session')}
                      className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                    >
                      <Settings className="h-6 w-6" />
                      Team Session Results
                    </Button>
                  </div>
                )}

                {/* Sección de gestión de puntos de alineaciones */}
                <div className="space-y-4">
                  <div className="p-4 bg-surface-elevated border border-border rounded-md">
                    <div className="text-text-primary text-small font-medium mb-2">🎯 Gestión de Puntos de Alineaciones</div>
                    <div className="text-text-secondary text-small space-y-1 mb-4">
                      <p>• Los puntos solo se pueden calcular una vez por GP</p>
                      <p>• Selecciona un GP específico para gestionar sus puntos</p>
                      <p>• <strong>Actualizar:</strong> Calcula puntos por primera vez</p>
                      <p>• <strong>Resetear:</strong> Pone puntos a 0 (para recalcular)</p>
                      <p>• <strong>Limpiar:</strong> Elimina todos los puntos (acción irreversible)</p>
                    </div>
                    
                    {/* Selector de GP para puntos */}
                    <div className="space-y-3">
                      <label className="block text-text-primary text-small font-medium">
                        Seleccionar GP para puntos
                      </label>
                      <select
                        value={selectedGPForPoints}
                        onChange={(e) => setSelectedGPForPoints(e.target.value)}
                        className="w-full p-3 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                      >
                        <option value="">Elegir un Grand Prix...</option>
                        {gps.map(gp => (
                          <option key={gp.gp_index} value={gp.gp_index}>{gp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Botones de gestión de puntos */}
                  {selectedGPForPoints && (
                    <div className="space-y-3">
                      <Button
                        onClick={handleUpdateLineupPoints}
                        disabled={isUpdatingLineupPoints}
                        className="w-full flex items-center justify-center gap-3 py-4 text-subtitle bg-accent-main hover:bg-accent-hover disabled:opacity-50"
                      >
                        <Save className="h-6 w-6" />
                        {isUpdatingLineupPoints ? 'Actualizando...' : 'Actualizar Puntos Jugadores'}
                      </Button>
                      <Button
                        onClick={handleResetLineupPoints}
                        disabled={isResettingLineupPoints}
                        variant="ghost"
                        className="w-full flex items-center justify-center gap-3 py-3 text-small text-state-warning hover:bg-state-warning/10 border border-state-warning/20"
                      >
                        <X className="h-5 w-5" />
                        {isResettingLineupPoints ? 'Reseteando...' : 'Resetear Puntos'}
                      </Button>
                      <Button
                        onClick={handleClearLineupPoints}
                        disabled={isClearingLineupPoints}
                        variant="ghost"
                        className="w-full flex items-center justify-center gap-3 py-3 text-small text-state-error hover:bg-state-error/10 border border-state-error/20"
                      >
                        <X className="h-5 w-5" />
                        {isClearingLineupPoints ? 'Limpiando...' : 'Limpiar Puntos'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Select Session Type */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">Select Session Type</h2>
                  <p className="text-text-secondary text-body">Choose which session to manage</p>
                </div>
                
                <Button
                  onClick={() => setSessionType('practice')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Timer className="h-6 w-6" />
                  Practice
                </Button>
                <Button
                  onClick={() => setSessionType('race')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Flag className="h-6 w-6" />
                  Race
                </Button>
                <Button
                  onClick={() => setSessionType('qualy')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Trophy className="h-6 w-6" />
                  Qualifying
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep(0)}
                  className="w-full flex items-center justify-center gap-2 mt-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}

            {/* Expected Positions - Mode Selection */}
            {step === 'expected' && !expectedMode && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">Expected Positions</h2>
                  <p className="text-text-secondary text-body">Select session type for expected positions</p>
                </div>
                
                <Button
                  onClick={() => setExpectedMode('practice')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Timer className="h-6 w-6" />
                  Practice
                </Button>
                <Button
                  onClick={() => setExpectedMode('race')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Flag className="h-6 w-6" />
                  Race
                </Button>
                <Button
                  onClick={() => setExpectedMode('qualy')}
                  className="w-full flex items-center justify-center gap-3 py-4 text-subtitle"
                >
                  <Trophy className="h-6 w-6" />
                  Qualifying
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStep(0)}
                  className="w-full flex items-center justify-center gap-2 mt-6"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}

            {/* Expected Positions - Position Assignment */}
            {step === 'expected' && expectedMode && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">
                    Expected Positions ({expectedMode.charAt(0).toUpperCase() + expectedMode.slice(1)})
                  </h2>
                  <p className="text-text-secondary text-body">Assign pilots to expected positions</p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...Array(20)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-md">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-main text-white font-bold text-small">
                        {idx + 1}
                      </div>
                      <select
                        value={expectedPositions[idx]}
                        onChange={(e) => handleExpectedPilotChange(idx, e.target.value)}
                        className="flex-1 p-2 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                      >
                        <option value="">Select pilot...</option>
                        {getAvailablePilots(idx).map(p => (
                          <option key={p.id} value={p.id}>{p.driver_name}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExpectedPilotChange(idx, '')}
                        className="p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveExpected}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setExpectedMode('');
                      setExpectedPositions(Array(20).fill(''));
                    }}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Team Expected Positions */}
            {step === 'team-expected' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">
                    Team Expected Positions
                  </h2>
                  <p className="text-text-secondary text-body">Assign teams to expected positions</p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...Array(10)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-md">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-main text-white font-bold text-small">
                        {idx + 1}
                      </div>
                      <select
                        value={teamExpectedPositions[idx]}
                        onChange={(e) => handleTeamExpectedPositionChange(idx, e.target.value)}
                        className="flex-1 p-2 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                      >
                        <option value="">Select team...</option>
                        {getAvailableTeams(idx).map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTeamExpectedPositionChange(idx, '')}
                        className="p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveTeamExpectedPositions}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(0);
                      setTeamExpectedPositions(Array(10).fill(''));
                    }}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Team Finish Positions */}
            {step === 'team-finish' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">
                    Team Finish Positions
                  </h2>
                  <p className="text-text-secondary text-body">Assign teams to finish positions</p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...Array(10)].map((_, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-md">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-main text-white font-bold text-small">
                        {idx + 1}
                      </div>
                      <select
                        value={teamFinishPositions[idx]}
                        onChange={(e) => handleTeamFinishPositionChange(idx, e.target.value)}
                        className="flex-1 p-2 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                      >
                        <option value="">Select team...</option>
                        {getAvailableTeamsForFinish(idx).map(team => (
                          <option key={team} value={team}>{team}</option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTeamFinishPositionChange(idx, '')}
                        className="p-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSaveTeamFinishPositions}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(0);
                      setTeamFinishPositions(Array(10).fill(''));
                    }}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Team Session Results */}
            {step === 'team-session' && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-h2 font-bold text-text-primary mb-2">
                    Team Session Results
                  </h2>
                  <p className="text-text-secondary text-body">Manage detailed team results</p>
                </div>

                <div>
                  <label className="block text-text-primary text-small font-medium mb-3">
                    Select Team
                  </label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full p-3 bg-surface-elevated border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                  >
                    <option value="">Choose a team...</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>

                {selectedTeam && (
                  <Card className="bg-surface-elevated">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <label className="block text-text-primary text-small font-medium mb-2">
                          Expected Position
                        </label>
                        <Input
                          name="expected_position"
                          type="number"
                          step="0.1"
                          value={teamForm.expected_position || ''}
                          onChange={handleTeamFieldChange}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-text-primary text-small font-medium mb-2">
                          Finish Position
                        </label>
                        <Input
                          name="finish_position"
                          type="number"
                          value={teamForm.finish_position || ''}
                          onChange={handleTeamFieldChange}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-text-primary text-small font-medium mb-2">
                          Pit Stop Time (seconds)
                        </label>
                        <Input
                          name="pitstop_time"
                          type="number"
                          step="0.1"
                          value={teamForm.pitstop_time || ''}
                          onChange={handleTeamFieldChange}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-text-primary text-small font-medium mb-2">
                          Points
                        </label>
                        <Input
                          name="points"
                          type="number"
                          value={teamForm.points || ''}
                          onChange={handleTeamFieldChange}
                          className="w-full"
                        />
                      </div>
                      
                      <Button
                        onClick={handleSaveTeamSession}
                        className="w-full flex items-center justify-center gap-2 mt-6"
                      >
                        <Save className="h-4 w-4" />
                        Save Team Results
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedTeam('');
                    setTeamForm({});
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}

            {/* Session Results */}
            {step === 1 && sessionType && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    {getSessionIcon(sessionType)}
                    <h2 className="text-h2 font-bold text-text-primary">
                      {sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} Results
                    </h2>
                  </div>
                  <p className="text-text-secondary text-body">Manage session results for pilots</p>
                </div>

                <div>
                  <label className="block text-text-primary text-small font-medium mb-3">
                    Select Pilot
                  </label>
                  <select
                    value={selectedSessionPilot}
                    onChange={(e) => setSelectedSessionPilot(e.target.value)}
                    className="w-full p-3 bg-surface-elevated border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                  >
                    <option value="">Choose a pilot...</option>
                    {sessionPilots.map(p => (
                      <option key={p.id} value={p.id}>{p.driver_name}</option>
                    ))}
                  </select>
                </div>

                {selectedSessionPilot && (
                  <Card className="bg-surface-elevated">
                    <CardContent className="p-4 space-y-4">
                      {console.log('[DEBUG] sessionForm antes de render:', sessionForm)}
                      {sessionFields[sessionType].map(field => (
                        <div key={field.name}>
                          <label className="block text-text-primary text-small font-medium mb-2">
                            {field.label}
                          </label>
                          {field.type === 'checkbox' ? (
                            <select
                              name={field.name}
                              value={sessionForm[field.name] === 'true' ? 'true' : 'false'}
                              onChange={(e) => setSessionForm(f => ({ ...f, [field.name]: e.target.value }))}
                              className="w-full p-2 bg-surface border border-border rounded-md text-text-primary focus:border-accent-main focus:outline-none"
                            >
                              <option value={'false'}>No</option>
                              <option value={'true'}>Yes</option>
                            </select>
                          ) : (
                            <Input
                              name={field.name}
                              type={field.type}
                              value={sessionForm[field.name] || ''}
                              onChange={handleSessionFieldChange}
                              className="w-full"
                            />
                          )}
                        </div>
                      ))}
                      {/* Mostrar información de cálculo de puntos */}
                      {expectedPositionForCalc > 0 && sessionForm.finish_position && (
                        <div className="p-3 bg-accent-main/10 border border-accent-main/20 rounded-md">
                          <div className="text-text-primary text-small font-medium mb-2">📊 Cálculo Automático de Puntos</div>
                          <div className="space-y-1 text-small">
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Posición esperada:</span>
                              <span className="text-text-primary font-medium">{expectedPositionForCalc}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Posición final:</span>
                              <span className="text-text-primary font-medium">{sessionForm.finish_position}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-text-secondary">Delta (esperada - final):</span>
                              <span className={`font-medium ${(expectedPositionForCalc - parseInt(sessionForm.finish_position)) > 0 ? 'text-state-success' : 'text-state-error'}`}>
                                {expectedPositionForCalc - parseInt(sessionForm.finish_position)}
                              </span>
                            </div>
                            <div className="border-t border-border pt-2 mt-2">
                              <div className="flex justify-between">
                                <span className="text-text-primary font-medium">Puntos Calculados:</span>
                                <span className="text-accent-main font-bold text-subtitle">{calculatedPoints}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <Button
                        onClick={handleSaveSession}
                        className="w-full flex items-center justify-center gap-2 mt-6"
                      >
                        <Save className="h-4 w-4" />
                        Save Results
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Button
                  variant="ghost"
                  onClick={() => {
                    setSessionType('');
                    setSelectedSessionPilot('');
                    setSessionForm({});
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 