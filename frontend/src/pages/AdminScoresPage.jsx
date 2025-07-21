import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

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

  useEffect(() => {
    fetch('/api/pilots').then(res => res.json()).then(data => setPilots(data.pilots || []));
    fetch('/api/grand-prix').then(res => res.json()).then(data => setGps(data.gps || []));
  }, []);

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
        gp_index: selectedGP,
        mode: expectedMode,
        positions: expectedPositions.map((pilot_id, idx) => ({ pilot_id, expected_position: idx + 1 }))
      };
      const res = await fetch('/api/admin/expected-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Posiciones guardadas', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Error de red', severity: 'error' });
    }
  };

  const handleSessionFieldChange = (e) => {
    const { name, value, type } = e.target;
    setSessionForm(f => ({ ...f, [name]: type === 'checkbox' ? e.target.checked : value }));
  };

  const handleSaveSession = async () => {
    try {
      const payload = {
        gp_index: selectedGP,
        mode: sessionType,
        pilot_id: selectedSessionPilot,
        ...sessionForm
      };
      const res = await fetch('/api/admin/session-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setSessionSnackbar({ open: true, message: 'Resultado guardado', severity: 'success' });
      } else {
        setSessionSnackbar({ open: true, message: data.error || 'Error al guardar', severity: 'error' });
      }
    } catch (e) {
      setSessionSnackbar({ open: true, message: 'Error de red', severity: 'error' });
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

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3, background: '#181818', borderRadius: 3, minHeight: 300 }}>
      <Typography variant="h5" sx={{ mb: 3, color: '#fff', textAlign: 'center' }}>Administrar Puntuaciones</Typography>
      {step === 0 && (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel sx={{ color: '#fff' }}>Gran Premio</InputLabel>
          <Select
            value={selectedGP}
            label="Gran Premio"
            onChange={e => setSelectedGP(e.target.value)}
            sx={{ color: '#fff', background: '#23243a' }}
            required
          >
            {gps.map(gp => (
              <MenuItem key={gp.gp_index} value={gp.gp_index} sx={{ color: '#fff', background: '#23243a' }}>{gp.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {step === 0 && selectedGP && (
        <Stack spacing={3}>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setStep('expected')}>Posiciones esperadas</Button>
          <Button variant="contained" color="secondary" size="large" sx={{ fontSize: 20 }} onClick={() => setStep(1)}>Resultados sesiones</Button>
        </Stack>
      )}
      {step === 1 && (
        <Stack spacing={3}>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setSessionType('practice')}>Practice</Button>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setSessionType('race')}>Race</Button>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setSessionType('qualy')}>Qualy</Button>
          <Button variant="outlined" color="inherit" onClick={() => setStep(0)} sx={{ color: '#fff' }}>Volver</Button>
        </Stack>
      )}
      {step === 'expected' && !expectedMode && (
        <Stack spacing={3}>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setExpectedMode('practice')}>Practice</Button>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setExpectedMode('race')}>Race</Button>
          <Button variant="contained" color="primary" size="large" sx={{ fontSize: 20 }} onClick={() => setExpectedMode('qualy')}>Qualy</Button>
          <Button variant="outlined" color="inherit" onClick={() => setStep(0)} sx={{ color: '#fff' }}>Volver</Button>
        </Stack>
      )}
      {step === 'expected' && expectedMode && (
        <Box>
          <Typography sx={{ color: '#fff', mb: 2, textAlign: 'center' }}>Posiciones esperadas ({expectedMode.charAt(0).toUpperCase() + expectedMode.slice(1)})</Typography>
          {[...Array(20)].map((_, idx) => (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <FormControl sx={{ flex: 2, mr: 2 }}>
                <InputLabel sx={{ color: '#fff' }}>Piloto</InputLabel>
                <Select
                  value={expectedPositions[idx]}
                  onChange={e => handleExpectedPilotChange(idx, e.target.value)}
                  sx={{ color: '#fff', background: '#23243a' }}
                  required
                >
                  {getAvailablePilots(idx).map(p => (
                    <MenuItem key={p.id} value={p.id} sx={{ color: '#fff', background: '#23243a' }}>{p.driver_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton aria-label="Quitar" onClick={() => handleExpectedPilotChange(idx, '')} sx={{ color: '#fff', mx: 1 }}>
                <CloseIcon />
              </IconButton>
              <Typography sx={{ color: '#fff', minWidth: 80, textAlign: 'right', fontWeight: 700 }}>
                #{idx + 1}
              </Typography>
            </Box>
          ))}
          <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSaveExpected}>Guardar</Button>
          <Button variant="outlined" color="inherit" onClick={() => { setExpectedMode(''); setExpectedPositions(Array(20).fill('')); }} sx={{ color: '#fff', mt: 2 }}>Volver</Button>
          <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      )}
      {step === 1 && sessionType && (
        <Box>
          <Typography sx={{ color: '#fff', mb: 2, textAlign: 'center' }}>Resultados de sesión ({sessionType.charAt(0).toUpperCase() + sessionType.slice(1)})</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#fff' }}>Piloto</InputLabel>
            <Select
              value={selectedSessionPilot}
              onChange={e => setSelectedSessionPilot(e.target.value)}
              sx={{ color: '#fff', background: '#23243a' }}
            >
              {sessionPilots.map(p => (
                <MenuItem key={p.id} value={p.id} sx={{ color: '#fff', background: '#23243a' }}>{p.driver_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedSessionPilot && (
            <Box sx={{ background: '#23243a', borderRadius: 2, p: 2, mb: 2 }}>
              {console.log('[DEBUG] sessionForm antes de render:', sessionForm)}
              {sessionFields[sessionType].map(field => (
                <Box key={field.name} sx={{ mb: 2 }}>
                  {field.type === 'checkbox' ? (
                    <FormControl fullWidth>
                      <InputLabel shrink sx={{ color: '#fff' }}>{field.label}</InputLabel>
                      <Select
                        name={field.name}
                        value={sessionForm[field.name] === 'true' ? 'true' : 'false'}
                        onChange={e => setSessionForm(f => ({ ...f, [field.name]: e.target.value }))}
                        displayEmpty
                        sx={{ color: '#fff', background: '#23243a' }}
                      >
                        <MenuItem value={'false'} sx={{ color: '#fff', background: '#23243a' }}>No</MenuItem>
                        <MenuItem value={'true'} sx={{ color: '#fff', background: '#23243a' }}>Sí</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <FormControl fullWidth>
                      <InputLabel shrink sx={{ color: '#fff' }}>{field.label}</InputLabel>
                      <input
                        name={field.name}
                        type={field.type}
                        value={sessionForm[field.name] || ''}
                        onChange={handleSessionFieldChange}
                        style={{ width: '100%', color: '#fff', background: '#23243a', border: 'none', borderRadius: 4, padding: 8 }}
                      />
                    </FormControl>
                  )}
                </Box>
              ))}
              <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }} onClick={handleSaveSession}>Guardar</Button>
            </Box>
          )}
          <Button variant="outlined" color="inherit" onClick={() => { setSessionType(''); setSelectedSessionPilot(''); setSessionForm({}); }} sx={{ color: '#fff', mt: 2 }}>Volver</Button>
          <Snackbar open={sessionSnackbar.open} autoHideDuration={3000} onClose={() => setSessionSnackbar({ ...sessionSnackbar, open: false })}>
            <Alert onClose={() => setSessionSnackbar({ ...sessionSnackbar, open: false })} severity={sessionSnackbar.severity} sx={{ width: '100%' }}>
              {sessionSnackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      )}
    </Box>
  );
} 