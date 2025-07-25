import React, { useState } from 'react';
import {
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function EngineerActionsMenu({ engineer, onSell, onAcceptOffer, onRejectOffer }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [openSellModal, setOpenSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [loadingSell, setLoadingSell] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleActionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleAddToMarket = () => {
    setOpenSellModal(true);
    setSellPrice(engineer?.value || '');
    handleCloseMenu();
  };

  const handleCloseSellModal = () => {
    setOpenSellModal(false);
    setSellPrice('');
  };

  const handleConfirmSell = async () => {
    if (!engineer || !sellPrice || isNaN(Number(sellPrice)) || Number(sellPrice) <= 0) {
      setSnackbar({ open: true, message: 'Introduce un precio válido', severity: 'error' });
      return;
    }
    setLoadingSell(true);
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const endpoint = engineer.type === 'track_engineer' 
        ? '/api/trackengineerbyleague/sell'
        : '/api/chiefengineerbyleague/sell';
      
      const payload = engineer.type === 'track_engineer'
        ? { track_engineer_by_league_id: engineer.id, venta: Number(sellPrice) }
        : { chief_engineer_by_league_id: engineer.id, venta: Number(sellPrice) };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Ingeniero puesto a la venta', severity: 'success' });
        handleCloseSellModal();
        if (onSell) onSell();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al poner a la venta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    } finally {
      setLoadingSell(false);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const endpoint = engineer.type === 'track_engineer' 
        ? '/api/trackengineerbyleague/accept-league-offer'
        : '/api/chiefengineerbyleague/accept-league-offer';
      
      const payload = engineer.type === 'track_engineer'
        ? { track_engineer_by_league_id: engineer.id }
        : { chief_engineer_by_league_id: engineer.id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Oferta de la FIA aceptada', severity: 'success' });
        if (onAcceptOffer) onAcceptOffer();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al aceptar la oferta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const handleRejectOffer = async () => {
    try {
      const token = localStorage.getItem('token');
      const cleanToken = token ? token.trim() : '';
      const authHeader = cleanToken ? `Bearer ${cleanToken}` : '';
      
      const endpoint = engineer.type === 'track_engineer' 
        ? '/api/trackengineerbyleague/reject-league-offer'
        : '/api/chiefengineerbyleague/reject-league-offer';
      
      const payload = engineer.type === 'track_engineer'
        ? { track_engineer_by_league_id: engineer.id }
        : { chief_engineer_by_league_id: engineer.id };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSnackbar({ open: true, message: 'Oferta de la FIA rechazada', severity: 'success' });
        if (onRejectOffer) onRejectOffer();
      } else {
        setSnackbar({ open: true, message: data.error || 'Error al rechazar la oferta', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Error de conexión', severity: 'error' });
    }
  };

  const hasFIAOffer = engineer.league_offer_value && engineer.league_offer_expires_at && 
    new Date(engineer.league_offer_expires_at) > new Date();

  // Utilidad para evitar rutas duplicadas
  const getEngineerImageUrl = (image_url) => {
    if (!image_url) return '';
    return image_url.startsWith('ingenierosdepista/')
      ? `/images/${image_url}`
      : `/images/ingenierosdepista/${image_url}`;
  };

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={handleActionsClick}
        sx={{ fontWeight: 700 }}
      >
        Acciones
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            background: '#1a1a1a',
            color: '#fff',
            '& .MuiMenuItem-root': {
              color: '#fff',
              '&:hover': {
                background: '#333'
              }
            }
          }
        }}
      >
        <MenuItem onClick={handleAddToMarket}>
         Añadir al mercado
        </MenuItem>
        {hasFIAOffer && (
          <>
            <MenuItem onClick={handleAcceptOffer}>
              Aceptar oferta FIA ({engineer.league_offer_value?.toLocaleString()}€)
            </MenuItem>
            <MenuItem onClick={handleRejectOffer}>
              Rechazar oferta FIA
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Modal de venta */}
      <Dialog open={openSellModal} onClose={handleCloseSellModal} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
          Fijar el precio de venta
        </DialogTitle>
        <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
          {engineer && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
              <img
                src={getEngineerImageUrl(engineer.image_url)}
                alt={engineer.name}
                style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16 }}
              />
              <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>VALOR DE MERCADO</Typography>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1 }}>{Number(engineer.value).toLocaleString('es-ES')}</Typography>
              <Typography sx={{ color: '#b0b0b0', fontWeight: 700, fontSize: 15, mb: 2 }}>
                {engineer.type === 'track_engineer' ? 'Ingeniero de Pista' : 'Ingeniero Jefe'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', background: '#23243a', borderRadius: 2, px: 2, py: 1, mb: 2, width: '100%' }}>
                <Typography sx={{ color: '#b0b0b0', fontWeight: 700, mr: 1 }}>€</Typography>
                <TextField
                  variant="standard"
                  value={sellPrice}
                  onChange={e => setSellPrice(e.target.value)}
                  InputProps={{ disableUnderline: true, style: { color: '#fff', fontWeight: 700, fontSize: 18, background: 'transparent' } }}
                  sx={{ flex: 1, input: { textAlign: 'right' } }}
                  placeholder={Number(engineer.value).toLocaleString('es-ES')}
                  type="number"
                  inputProps={{ min: 1 }}
                  disabled={loadingSell}
                />
              </Box>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  background: '#1ed760',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 20,
                  borderRadius: 2,
                  mt: 2,
                  mb: 2,
                  maxWidth: 320,
                  boxShadow: '0 2px 8px rgba(30,215,96,0.15)',
                  '&:hover': { background: '#17b34a' }
                }}
                onClick={handleConfirmSell}
                disabled={loadingSell}
              >
                Añadir al mercado
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
} 