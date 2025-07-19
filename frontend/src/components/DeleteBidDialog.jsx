import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function DeleteBidDialog({ open, onClose, onConfirm, pilot }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
        Eliminar Oferta
      </DialogTitle>
      <DialogContent sx={{ background: '#0a0a0a', p: 3, textAlign: 'center' }}>
        {pilot && (
          <>
            <Typography sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
              Vas a eliminar la puja por <span style={{ color: '#FFD600' }}>{pilot.driver_name}</span> por <span style={{ color: '#FFD600' }}>{pilot.value?.toLocaleString('es-ES')}€</span>.<br />¿Estás seguro?
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{ fontWeight: 700, minWidth: 120 }}>Cancelar</Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ fontWeight: 700, minWidth: 120 }}>Eliminar</Button>
      </DialogActions>
    </Dialog>
  );
} 