import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export default function EditBidDialog({ open, onClose, onSubmit, pilot, editBidValue, setEditBidValue, playerMoney }) {
  if (!pilot) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
        Editar Puja por {pilot.driver_name}
      </DialogTitle>
      <DialogContent sx={{ background: '#0a0a0a', p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img
            src={pilot.image_url ? `/images/${pilot.image_url}` : ''}
            alt={pilot.driver_name}
            style={{ width: 90, height: 90, borderRadius: '50%', marginBottom: 16 }}
          />
          <Typography sx={{ color: '#FFD600', fontWeight: 700, fontSize: 15 }}>VALOR DE MERCADO</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 15, mb: 1 }}>{Number(pilot.value).toLocaleString('es-ES')}</Typography>
          <Typography sx={{ color: '#b0b0b0', fontWeight: 700, fontSize: 15, mb: 2 }}>Precio actual: {pilot.venta?.toLocaleString('es-ES') ?? '-'}</Typography>
          <TextField
            label="Importe"
            type="number"
            fullWidth
            value={editBidValue}
            onChange={e => setEditBidValue(e.target.value)}
            sx={{ mb: 2, input: { color: '#fff' } }}
            InputProps={{ style: { color: '#fff', background: '#222' } }}
          />
          <Button
            variant="contained"
            color="success"
            fullWidth
            sx={{ fontWeight: 700, fontSize: 18 }}
            onClick={onSubmit}
            disabled={Number(editBidValue) > playerMoney || Number(editBidValue) <= 0}
          >
            Editar Puja
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
} 