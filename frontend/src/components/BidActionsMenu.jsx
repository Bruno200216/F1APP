import React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

export default function BidActionsMenu({ anchorEl, open, onClose, onEdit, onDelete }) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{ style: { zIndex: 3000 } }}
    >
      <MenuItem onClick={onEdit}>Editar Puja</MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: 'red' }}>Eliminar Puja</MenuItem>
    </Menu>
  );
} 