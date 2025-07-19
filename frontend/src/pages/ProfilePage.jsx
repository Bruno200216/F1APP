import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { useLeague } from '../context/LeagueContext';

const teamColors = {
  'Red Bull Racing': { primary: '#3671C6', secondary: '#1E41C3' },
  'Mercedes': { primary: '#6CD3BF', secondary: '#00D2BE' },
  'McLaren': { primary: '#FF8700', secondary: '#FF5800' },
  'Ferrari': { primary: '#DC0000', secondary: '#B80000' },
  'Aston Martin': { primary: '#358C75', secondary: '#006F62' },
  'Alpine': { primary: '#0090FF', secondary: '#0051FF' },
  'Stake F1 Team Kick Sauber': { primary: '#52E252', secondary: '#37BEDD' },
  'Haas': { primary: '#FFFFFF', secondary: '#E8E8E8' },
  'Williams': { primary: '#37BEDD', secondary: '#005AFF' },
  'Visa Cash App RB': { primary: '#5E8FAA', secondary: '#1E41C3' }
};

export default function ProfilePage() {
  const { id } = useParams(); // id de pilots
  const { selectedLeague } = useLeague();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGP, setSelectedGP] = useState(0);
  const paisesRef = React.useRef();

  const scrollByCountries = (dir) => {
    if (paisesRef.current) {
      const box = paisesRef.current;
      const countryWidth = 70 + 8; // minWidth + gap
      box.scrollBy({ left: dir * countryWidth * 3, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!id || !selectedLeague?.id) return;
    setLoading(true);
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/pilot-profile/${id}?league_id=${selectedLeague.id}`);
        if (!res.ok) throw new Error('Piloto no encontrado');
        const data = await res.json();
        setProfile(data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, selectedLeague]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography>Cargando perfil...</Typography>
    </Box>
  );

  if (!profile || !profile.pilot) return (
    <Box sx={{ minHeight: '100vh', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h5" color="error">Piloto no encontrado</Typography>
    </Box>
  );
  const { pilot, pilot_by_league, grand_prix, scoring_criteria } = profile;
  const teamColor = teamColors[pilot?.team] || { primary: '#666', secondary: '#444' };

  // Diccionario para mostrar nombres legibles de los criterios
  const readableCriteria = {
    practice_point_finish: 'Puntos por posición',
    practice_team_battle: 'Batalla de equipo',
    practice_red_flag: 'Bandera roja',
    qualifying_pass_q1: 'Pasa a Q1',
    qualifying_pass_q2: 'Pasa a Q2',
    qualifying_position_finish: 'Posición final',
    qualifying_team_battle: 'Batalla de equipo',
    qualifying_red_flag: 'Bandera roja',
    race_points: 'Puntos por posición',
    race_position: 'Posición en carrera',
    start_position: 'Posición de salida',
    finish_position: 'Posición final',
    fastest_lap: 'Vuelta rápida',
    driver_of_the_day: 'Piloto del día',
    safety_car: 'Safety Car',
    race_team_battle: 'Batalla de equipo',
    race_red_flag: 'Bandera roja',
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', color: '#fff', p: 0 }}>
      <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 3, borderRadius: 4, background: 'linear-gradient(135deg, #1a1a1a 0%, #232323 100%)', boxShadow: 6, border: `2px solid ${teamColor.primary}`, position: 'relative' }}>
        <IconButton onClick={() => navigate(-1)} sx={{ position: 'absolute', top: 12, right: 12, color: '#fff', background: 'rgba(0,0,0,0.3)' }}>
          <CloseIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar src={pilot?.image_url ? `/images/${pilot.image_url}` : ''} sx={{ width: 64, height: 64, border: `3px solid ${teamColor.primary}`, mr: 2 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: teamColor.primary }}>{pilot.driver_name}</Typography>
            <Typography variant="body2" sx={{ color: '#b0b0b0', fontWeight: 500 }}>{pilot.team}</Typography>
            {/* Modo debajo del nombre */}
            <Typography variant="body2" sx={{ color: '#FFD600', fontWeight: 700, mb: 1 }}>Modo: {pilot_by_league?.mode?.toUpperCase()}</Typography>
            <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 700 }}>{(pilot.value || 0).toLocaleString()} €</Typography>
          </Box>
        </Box>
        {/* Barra de Grandes Premios con flechas debajo del nombre */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <IconButton onClick={() => scrollByCountries(-1)} size="small" sx={{ color: '#fff', background: '#232323', mr: 1 }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Box ref={paisesRef} sx={{
            display: 'flex',
            overflowX: 'auto',
            gap: 1,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            flex: 1,
          }}>
            {(grand_prix || []).map((gp, idx) => (
              <Box
                key={gp.id}
                onClick={() => setSelectedGP(idx)}
                sx={{
                  minWidth: 70,
                  px: 1,
                  py: 0.5,
                  borderRadius: 2,
                  background: selectedGP === idx ? teamColor.primary : '#232323',
                  color: selectedGP === idx ? '#fff' : '#b0b0b0',
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontWeight: 700,
                  border: selectedGP === idx ? `2px solid ${teamColor.secondary}` : '2px solid transparent',
                  fontSize: '0.95rem',
                  boxShadow: selectedGP === idx ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* Bandera encima del país */}
                {gp.flag && (
                  <img src={`/images/flags/${gp.flag}`} alt={gp.country} style={{ width: 32, height: 20, marginBottom: 4, borderRadius: 3, border: '1px solid #888' }} />
                )}
                <span>{gp.country}</span>
              </Box>
            ))}
          </Box>
          <IconButton onClick={() => scrollByCountries(1)} size="small" sx={{ color: '#fff', background: '#232323', ml: 1 }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        </Box>
        {/* País destacado debajo */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#FFD600', fontWeight: 700 }}>
            {(grand_prix && grand_prix[selectedGP]) ? grand_prix[selectedGP].country : ''}
          </Typography>
        </Box>
        {/* Puntos del piloto para el GP seleccionado */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: teamColor.primary, fontWeight: 700, mb: 1 }}>
            Puntos en este GP
          </Typography>
          <Typography variant="h4" sx={{ color: '#FFD600', fontWeight: 900 }}>
            {pilot_by_league?.points && pilot_by_league.points[selectedGP] !== undefined ? pilot_by_league.points[selectedGP] : 0}
          </Typography>
        </Box>
        {/* Tabla de criterios de puntuación por modo */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ color: teamColor.primary, fontWeight: 700, mb: 1 }}>
            Criterios de Puntuación ({pilot.mode?.toUpperCase()})
          </Typography>
          <table style={{ width: '100%', background: '#181818', borderRadius: 8, color: '#fff', marginTop: 8 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Criterio</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {scoring_criteria && Object.entries(scoring_criteria).map(([key, value]) => (
                <tr key={key}>
                  <td style={{ padding: 8 }}>{readableCriteria[key] || key}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>
                    {Array.isArray(value) && value !== null
                      ? (value[selectedGP] !== undefined && value[selectedGP] !== null ? value[selectedGP] : 0)
                      : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
} 