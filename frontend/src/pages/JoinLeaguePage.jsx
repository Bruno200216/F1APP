import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

export default function JoinLeaguePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openLogin, setOpenLogin] = useState(false);
  const [openRegister, setOpenRegister] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    if (code) {
      fetchLeagueInfo();
    } else {
      setError('No invitation code provided');
      setLoading(false);
    }
  }, [code]);

  const fetchLeagueInfo = async () => {
    try {
      const res = await fetch(`/api/leagues/info/${code}`);
      if (!res.ok) throw new Error('League not found');
      const data = await res.json();
      setLeague(data.league);
    } catch (err) {
      setError('Invalid invitation link');
    } finally {
      setLoading(false);
    }
  };

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
      setOpenLogin(false);
      setLoginEmail('');
      setLoginPassword('');
      handleJoinLeague();
    } catch (err) {
      setLoginError('Invalid email or password');
    }
  };

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

  const handleJoinLeague = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setOpenLogin(true);
      return;
    }

    try {
      const res = await fetch('/api/leagues/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify({ code: code })
      });
      if (!res.ok) throw new Error('Error joining league');
      setJoinSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError('Error joining league');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: 2, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Go to Home
        </Button>
      </Box>
    );
  }

  if (joinSuccess) {
    return (
      <Box sx={{ padding: 2, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 2 }}>
          Successfully joined {league.name}!
        </Alert>
        <Typography>Redirecting to home page...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom align="center">
        Join League
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {league.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {league.description}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You've been invited to join this league. Please sign in or register to continue.
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="contained" color="primary" onClick={() => setOpenLogin(true)}>
          Sign In
        </Button>
        <Button variant="outlined" color="primary" onClick={() => setOpenRegister(true)}>
          Register
        </Button>
      </Box>

      {/* Login Modal */}
      <Dialog open={openLogin} onClose={() => setOpenLogin(false)}>
        <DialogTitle>Sign In to Join League</DialogTitle>
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
        <DialogTitle>Register to Join League</DialogTitle>
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