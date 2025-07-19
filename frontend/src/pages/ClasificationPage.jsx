import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useLeague } from '../context/LeagueContext';
import { useTheme } from '@mui/material/styles';

export default function ClasificationPage() {
  const { selectedLeague } = useLeague();
  const [classification, setClassification] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const playerId = Number(localStorage.getItem('player_id'));

  // Fetch classification when selected league changes
  useEffect(() => {
    if (selectedLeague) {
      fetchClassification();
    } else {
      setClassification([]);
    }
  }, [selectedLeague]);

  const fetchClassification = async () => {
    if (!selectedLeague) return;
    
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/leagues/${selectedLeague.id}/classification`);
      const data = await res.json();
      // Ordenar por puntos descendente y luego por money descendente
      const sorted = (data.classification || []).sort((a, b) => b.points - a.points || b.money - a.money);
      setClassification(sorted);
    } catch (err) {
      setError('Error loading classification');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedLeague) {
    return (
      <Box sx={{ padding: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Selecciona una liga para ver la clasificación
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ background: '#18192a', minHeight: '100vh', py: 2 }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2, textAlign: 'center' }}>
        Clasificación
      </Typography>
      <TableContainer component={Paper} sx={{ background: 'transparent', boxShadow: 'none', maxWidth: 500, mx: 'auto' }}>
        <Table>
          <TableBody>
            {classification.map((player, idx) => (
              <TableRow
                key={player.player_id}
                sx={{
                  background: player.player_id === playerId ? '#23243a' : 'rgba(255,255,255,0.03)',
                  borderRadius: 2,
                  mb: 1,
                  boxShadow: player.player_id === playerId ? '0 0 8px #FFD600' : 'none',
                }}
              >
                {/* Posición */}
                <TableCell align="center" sx={{ color: '#fff', fontWeight: 700, fontSize: 18, border: 0, width: 32 }}>
                  {idx + 1}
                </TableCell>
                {/* Nombre y valor de equipo */}
                <TableCell sx={{ color: '#fff', border: 0 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{player.name}</Typography>
                    <Typography sx={{ fontWeight: 500, fontSize: 13, color: '#b0b0b0', mt: 0.5 }}>
                      {player.money?.toLocaleString('es-ES')}
                    </Typography>
                  </Box>
                </TableCell>
                {/* Puntos a la derecha */}
                <TableCell align="right" sx={{ color: '#FFD600', fontWeight: 700, fontSize: 18, border: 0, pr: 2 }}>
                  {player.points}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 