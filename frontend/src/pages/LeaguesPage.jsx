import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Paper from '@mui/material/Paper';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useLeague } from '../context/LeagueContext';
import { useNavigate } from 'react-router-dom';

export default function LeaguesPage() {
  // Context
  const { leagues, setLeagues, selectedLeague, setSelectedLeague } = useLeague();

  // Login/Register states
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // League modal states
  const [openLeagueModal, setOpenLeagueModal] = useState(false);
  const [openCreateLeague, setOpenCreateLeague] = useState(false);
  const [openJoinLeague, setOpenJoinLeague] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [leagueError, setLeagueError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Edit/Delete league states
  const [editLeague, setEditLeague] = useState(null);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteLeague, setDeleteLeague] = useState(null);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Share league states
  const [shareSnackbar, setShareSnackbar] = useState(false);

  // Fetch leagues on mount or after create/join
  const fetchLeagues = async (selectLast = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/my-leagues', {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      setLeagues(data.leagues || []);
      if (selectLast && data.leagues && data.leagues.length > 0) {
        setSelectedLeague(data.leagues[data.leagues.length - 1]);
      } else if (!selectedLeague && data.leagues && data.leagues.length > 0) {
        setSelectedLeague(data.leagues[0]);
      } else if (selectedLeague && data.leagues && !data.leagues.find(l => l.id === selectedLeague.id)) {
        setSelectedLeague(data.leagues[0] || null);
      }
      // Si no hay ligas, limpiar la selección
      if (!data.leagues || data.leagues.length === 0) {
        setSelectedLeague(null);
        localStorage.removeItem('selectedLeague');
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchLeagues();
    // eslint-disable-next-line
  }, []);

  // Login handler
  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('player_id', data.user.id);
      setOpenLogin(false);
      setLoginEmail('');
      setLoginPassword('');
      fetchLeagues();
    } catch (err) {
      setLoginError('Invalid email or password');
    }
  };

  // Register handler
  const handleRegister = async () => {
    setRegisterError('');
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword })
      });
      if (!res.ok) throw new Error('Registration failed');
      setOpenRegister(false);
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterName('');
      setOpenLogin(true);
    } catch (err) {
      setRegisterError('Registration failed');
    }
  };

  const handleCreateLeague = async () => {
    setLeagueError('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');
    if (!token) {
      setLeagueError('You must be logged in');
      return;
    }
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ name: leagueName })
      });
      if (!res.ok) throw new Error('Error creating league');
      setSuccessMsg('League created successfully!');
      setLeagueName('');
      setOpenCreateLeague(false);
      setOpenLeagueModal(false);
      fetchLeagues(true); // Recargar y seleccionar la nueva
    } catch (err) {
      setLeagueError('Error creating league');
    }
  };

  // Join League handler
  const handleJoinLeague = async () => {
    setJoinError('');
    setSuccessMsg('');
    const token = localStorage.getItem('token');
    if (!token) {
      setJoinError('You must be logged in');
      return;
    }
    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ code: joinCode })
      });
      if (!res.ok) throw new Error('Error joining league');
      setSuccessMsg('Joined league successfully!');
      setJoinCode('');
      setOpenJoinLeague(false);
      setOpenLeagueModal(false);
      fetchLeagues(true); // Recargar y seleccionar la nueva
    } catch (err) {
      setJoinError('Error joining league');
    }
  };

  // Edit League handler
  const handleEditLeague = (league) => {
    setEditLeague(league);
    setEditName(league.name);
    setEditError('');
    setOpenEditModal(true);
  };
  const handleEditLeagueSave = async () => {
    setEditError('');
    const token = localStorage.getItem('token');
    if (!token || !editLeague) return;
    try {
      const res = await fetch(`/api/leagues/${editLeague.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ name: editName })
      });
      if (!res.ok) throw new Error('Error updating league');
      setOpenEditModal(false);
      fetchLeagues();
    } catch (err) {
      setEditError('Error updating league');
    }
  };

  // Delete League handler
  const handleDeleteLeague = (league) => {
    setDeleteLeague(league);
    setDeleteError('');
    setOpenDeleteModal(true);
  };
  const handleDeleteLeagueConfirm = async () => {
    const token = localStorage.getItem('token');
    if (!token || !deleteLeague) return;
    try {
      const res = await fetch(`/api/leagues/${deleteLeague.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
      });
      if (!res.ok) throw new Error('Error deleting league');
      setOpenDeleteModal(false);
      fetchLeagues();
    } catch (err) {
      setDeleteError('Error deleting league');
    }
  };

  // Share League handler
  const handleShareLeague = async (league) => {
    try {
      await navigator.clipboard.writeText(league.code);
      setShareSnackbar(true);
    } catch (err) {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = league.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSnackbar(true);
    }
  };

  // Añadir función para limpiar ligas al cerrar sesión o cambiar de usuario
  const handleLogout = () => {
    localStorage.removeItem('token');
    setLeagues([]);
    setSelectedLeague(null);
  };

  const navigate = useNavigate();

  // Render leagues list
  const renderLeagues = () => (
    <Box sx={{ mt: 2 }}>
      {leagues.length === 0 && <Typography>No leagues found.</Typography>}
      {leagues.map((league) => (
        <Paper
          key={league.id}
          elevation={selectedLeague && selectedLeague.id === league.id ? 6 : 1}
          sx={{
            p: 2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            background: selectedLeague && selectedLeague.id === league.id ? '#e3f2fd' : '#fff',
            border: selectedLeague && selectedLeague.id === league.id ? '2px solid #1976d2' : '1px solid #ccc',
            cursor: 'pointer',
            fontWeight: selectedLeague && selectedLeague.id === league.id ? 'bold' : 'normal',
          }}
          onClick={() => setSelectedLeague(league)}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">{league.name}</Typography>
          </Box>
          <IconButton 
            onClick={e => { e.stopPropagation(); handleShareLeague(league); }} 
            color="info"
            size="small"
            sx={{ mr: 1 }}
          >
            <ShareIcon />
          </IconButton>
          <IconButton onClick={e => { e.stopPropagation(); handleEditLeague(league); }} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton onClick={e => { e.stopPropagation(); handleDeleteLeague(league); }} color="error">
            <DeleteIcon />
          </IconButton>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h5" gutterBottom>Leagues Page</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={() => setOpenLogin(true)}>
          Sign In
        </Button>
        {localStorage.getItem('token') && (
          <Button variant="outlined" color="secondary" onClick={handleLogout}>
            Logout
          </Button>
        )}
        <Button
          variant="contained"
          color="success"
          startIcon={<AddCircleOutlineIcon sx={{ fontSize: 32 }} />}
          sx={{ fontSize: 20, padding: '12px 32px' }}
          onClick={() => setOpenLeagueModal(true)}
        >
          Create or Join League
        </Button>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" color="secondary" onClick={() => navigate('/admin-scores')}>
          Administrar Puntuaciones
        </Button>
      </Box>

      {/* Lista de ligas */}
      {renderLeagues()}

      {/* Share Snackbar */}
      <Snackbar
        open={shareSnackbar}
        autoHideDuration={3000}
        onClose={() => setShareSnackbar(false)}
      >
        <Alert onClose={() => setShareSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          Invitation link copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Modal de opciones para liga */}
      <Dialog open={openLeagueModal} onClose={() => setOpenLeagueModal(false)}>
        <DialogTitle>Select an option</DialogTitle>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', p: 2 }}>
          <Button onClick={() => { setOpenCreateLeague(true); setOpenLeagueModal(false); }} variant="contained" color="primary" fullWidth sx={{ mb: 1 }}>
            Create League
          </Button>
          <Button onClick={() => { setOpenJoinLeague(true); setOpenLeagueModal(false); }} variant="outlined" color="primary" fullWidth>
            Join League
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para crear liga */}
      <Dialog open={openCreateLeague} onClose={() => setOpenCreateLeague(false)}>
  <DialogTitle>Create League</DialogTitle>
  <DialogContent>
    <TextField
      autoFocus
      margin="dense"
      label="League Name"
      type="text"
      fullWidth
      value={leagueName}
      onChange={e => setLeagueName(e.target.value)}
    />
    {leagueError && <Typography color="error">{leagueError}</Typography>}
    {successMsg && <Typography color="success.main">{successMsg}</Typography>}
  </DialogContent>
  <DialogActions>
    <Button onClick={handleCreateLeague} variant="contained" color="primary">Create</Button>
    <Button onClick={() => setOpenCreateLeague(false)} color="secondary">Cancel</Button>
  </DialogActions>
</Dialog>

      {/* Modal para unirse a liga */}
      <Dialog open={openJoinLeague} onClose={() => setOpenJoinLeague(false)}>
        <DialogTitle>Join League</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="League Code or Name"
            type="text"
            fullWidth
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
          />
          {joinError && <Typography color="error">{joinError}</Typography>}
          {successMsg && <Typography color="success.main">{successMsg}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleJoinLeague} variant="contained" color="primary">Join</Button>
          <Button onClick={() => setOpenJoinLeague(false)} color="secondary">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Edit League Modal */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)}>
        <DialogTitle>Edit League</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="League Name"
            type="text"
            fullWidth
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
          {editError && <Typography color="error">{editError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditLeagueSave} variant="contained" color="primary">Save</Button>
          <Button onClick={() => setOpenEditModal(false)} color="secondary">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Delete League Modal */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <DialogTitle>Delete League</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the league "{deleteLeague?.name}"?</Typography>
          {deleteError && <Typography color="error">{deleteError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteLeagueConfirm} variant="contained" color="error">Delete</Button>
          <Button onClick={() => setOpenDeleteModal(false)} color="secondary">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Login Modal */}
      <Dialog open={openLogin} onClose={() => setOpenLogin(false)}>
        <DialogTitle>Sign In</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={loginEmail}
            onChange={e => setLoginEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
          />
          {loginError && <Typography color="error">{loginError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <Button onClick={handleLogin} variant="contained" color="primary" fullWidth>Sign In</Button>
          <Button onClick={() => { setOpenLogin(false); setOpenRegister(true); }} color="secondary" fullWidth>
            Register
          </Button>
        </DialogActions>
      </Dialog>

      {/* Register Modal */}
      <Dialog open={openRegister} onClose={() => setOpenRegister(false)}>
        <DialogTitle>Register</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            type="text"
            fullWidth
            value={registerName}
            onChange={e => setRegisterName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={registerEmail}
            onChange={e => setRegisterEmail(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={registerPassword}
            onChange={e => setRegisterPassword(e.target.value)}
          />
          {registerError && <Typography color="error">{registerError}</Typography>}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <Button onClick={handleRegister} variant="contained" color="primary" fullWidth>Register</Button>
          <Button onClick={() => { setOpenRegister(false); setOpenLogin(true); }} color="secondary" fullWidth>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 