import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Paper from '@mui/material/Paper';
import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

// Colores de equipos de F1
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

export function goToTeamProfile(navigate, team, leagueId) {
  if (!team || !team.id || !leagueId) return;
  navigate(`/team/${team.id}?league_id=${leagueId}`);
}

export default function TeamRaceCard({ 
  team, 
  showStats = false, 
  isOwned = false, 
  onClick, 
  leagueId, 
  onFichar, 
  players = [], 
  showBidActions = false, 
  onEditBid, 
  onDeleteBid, 
  bidActionsButton 
}) {
  const navigate = useNavigate();
  const teamColor = teamColors[team.name] || { primary: '#666666', secondary: '#444444' };

  // Función para obtener el nombre del propietario
  const getOwnerName = (owner_id) => {
    if (!owner_id || owner_id === 0) return 'FIA';
    const player = players.find(p => p.id === owner_id);
    return player ? player.name : 'Desconocido';
  };

  const handleClick = () => {
    if (onClick) {
      onClick(team);
    } else {
      // Navegar al perfil del equipo
      goToTeamProfile(navigate, team, leagueId);
    }
  };

  // Obtener el id del usuario actual
  const playerId = Number(localStorage.getItem('player_id'));

  // Calcular días restantes de la cláusula
  let clausulaDias = null;
  if (team.clausula) {
    const expira = new Date(team.clausula);
    const ahora = new Date();
    const diff = expira - ahora;
    if (diff > 0) {
      clausulaDias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <Paper
      elevation={3}
      sx={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        border: `2px solid ${teamColor.primary}`,
        borderRadius: 3,
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 25px rgba(${teamColor.primary}, 0.3)`,
          borderColor: teamColor.secondary,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
        }
      }}
      onClick={handleClick}
    >
      {/* Indicador de propiedad */}
      {isOwned && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#4CAF50',
            border: '2px solid #fff',
            zIndex: 1
          }}
        />
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={team.image_url ? `/images/${team.image_url}` : ''}
          alt={team.name}
          sx={{
            width: 60,
            height: 60,
            mr: 2,
            border: `3px solid ${teamColor.primary}`,
            boxShadow: `0 4px 12px rgba(${teamColor.primary}, 0.4)`
          }}
        />
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#fff',
                fontSize: '1.1rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                mr: 1
              }}
            >
              {team.name}
            </Typography>
            {/* Indicador de tipo de equipo */}
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: `2px solid ${teamColor.primary}`,
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: teamColor.primary,
                boxShadow: `0 2px 4px rgba(${teamColor.primary}, 0.3)`
              }}
            >
              🏎️
            </Box>
            {/* Candado de cláusula */}
            {clausulaDias && (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, background: '#23243a', borderRadius: 2, px: 1.2, py: 0.2 }}>
                <LockIcon sx={{ color: '#FF5252', fontSize: 18, mr: 0.5 }} />
                <Typography sx={{ color: '#FF5252', fontWeight: 700, fontSize: 13 }}>{clausulaDias} días</Typography>
              </Box>
            )}
          </Box>
          {/* Mostrar número de pujas si existe */}
          {typeof team.num_bids !== 'undefined' && (
            <Typography variant="body2" sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15, mb: 0.5 }}>
              {team.num_bids} puja{team.num_bids !== 1 ? 's' : ''}
            </Typography>
          )}
          <Typography
            variant="body2"
            sx={{
              color: '#b0b0b0',
              fontWeight: 500,
              fontSize: '0.8rem',
              fontStyle: 'italic'
            }}
          >
            Equipo Constructor
          </Typography>
          {/* Mostrar pilotos del equipo si existen */}
          {team.pilots && team.pilots.length > 0 && (
            <Typography
              variant="body2"
              sx={{
                color: '#b0b0b0',
                fontWeight: 400,
                fontSize: '0.75rem',
                mt: 0.5
              }}
            >
              Pilotos: {team.pilots.join(', ')}
            </Typography>
          )}
        </Box>
      </Box>

      {showStats && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
              Valor:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#4CAF50', fontSize: '0.9rem' }}>
              {(team.value ?? team.valor_global ?? team.valorGlobal ?? 0).toLocaleString()} €
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
              Posición esperada:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#FF9800', fontSize: '0.9rem' }}>
              {team.exp_pos_mean || 'N/A'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
              Pilotos:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2196F3', fontSize: '0.9rem' }}>
              {team.pilot_count || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: '#b0b0b0', fontSize: '0.8rem' }}>
              Propietario:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#2196F3', fontSize: '0.9rem' }}>
              {getOwnerName(team.owner_id)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Línea decorativa inferior */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, ${teamColor.primary}, ${teamColor.secondary})`,
          opacity: 0.7
        }}
      />
      
      {/* Botón Fichar o acciones de puja */}
      {typeof onFichar === 'function' && !showBidActions && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <button
            style={{
              background: team.owner_id === playerId ? '#888' : '#DC0000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 24px',
              fontWeight: 700,
              fontSize: 16,
              cursor: team.owner_id === playerId ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(220,0,0,0.15)',
              transition: 'background 0.2s',
              opacity: team.owner_id === playerId ? 0.6 : 1
            }}
            disabled={team.owner_id === playerId}
            onClick={e => {
              if (team.owner_id === playerId) return;
              e.stopPropagation();
              onFichar();
            }}
          >
            {team.owner_id === playerId ? 'No disponible' : 'Fichar'}
          </button>
        </Box>
      )}
      
      {/* Si ya tiene puja, mostrar botón ACCIONES si existe, si no los botones directos */}
      {showBidActions && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
          {bidActionsButton ? bidActionsButton : <>
            <button
              style={{
                background: '#1ed760',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(30,215,96,0.15)',
                transition: 'background 0.2s'
              }}
              onClick={e => {
                e.stopPropagation();
                if (typeof onEditBid === 'function') onEditBid();
              }}
            >
              Editar puja
            </button>
            <button
              style={{
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(244,67,54,0.15)',
                transition: 'background 0.2s'
              }}
              onClick={e => {
                e.stopPropagation();
                if (typeof onDeleteBid === 'function') onDeleteBid();
              }}
            >
              Eliminar puja
            </button>
          </>}
        </Box>
      )}
    </Paper>
  );
} 