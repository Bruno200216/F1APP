import React, { useState, useEffect } from 'react';
import { useLeague } from '../context/LeagueContext';
import { useNavigate } from 'react-router-dom';

// UI Components from design.json style
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

// Icons
import { Plus, Edit3, Trash2, Share2, LogOut, Settings } from 'lucide-react';

export default function LeaguesPage() {
  // Context
  const { leagues, setLeagues, selectedLeague, setSelectedLeague } = useLeague();
  
  // Admin check state
  const [isAdmin, setIsAdmin] = useState(false);

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

  // Check if current user is admin
  const checkAdminStatus = async () => {
    const token = localStorage.getItem('token');
    const player_id = localStorage.getItem('player_id');
    if (!token || !player_id) return;
    
    try {
      const response = await fetch(`/api/players/${player_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.player?.is_admin || false);
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    }
  };

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
    checkAdminStatus();
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
      checkAdminStatus();
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
      setTimeout(() => setShareSnackbar(false), 3000);
    } catch (err) {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = league.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShareSnackbar(true);
      setTimeout(() => setShareSnackbar(false), 3000);
    }
  };

  // Añadir función para limpiar ligas al cerrar sesión o cambiar de usuario
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('player_id');
    setLeagues([]);
    setSelectedLeague(null);
    setIsAdmin(false);
  };

  const navigate = useNavigate();

  // Render leagues list
  const renderLeagues = () => (
    <div className="mt-6 space-y-4">
      {leagues.length === 0 && (
        <div className="text-center py-8">
          <p className="text-text-secondary text-body">No leagues found.</p>
        </div>
      )}
      {leagues.map((league) => (
        <Card
          key={league.id}
          className={`cursor-pointer transition-all duration-200 ${
            selectedLeague && selectedLeague.id === league.id
              ? 'border-accent-main shadow-glow-accent bg-surface-elevated'
              : 'border-border hover:border-accent-hover'
          }`}
          onClick={() => {
            setSelectedLeague(league);
            localStorage.setItem('selectedLeague', JSON.stringify(league));
            navigate('/clasification');
          }}
        >
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex-1">
              <CardTitle className={`text-h3 ${
                selectedLeague && selectedLeague.id === league.id
                  ? 'text-accent-main font-bold'
                  : 'text-text-primary font-semibold'
              }`}>
                {league.name}
              </CardTitle>
              <p className="text-text-secondary text-small mt-1">
                Code: {league.code}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareLeague(league);
                }}
                className="p-2"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditLeague(league);
                }}
                className="p-2"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLeague(league);
                }}
                className="p-2 text-state-error hover:text-state-error"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-h1 font-bold text-text-primary mb-2">Leagues</h1>
          <p className="text-text-secondary text-body">Manage your fantasy leagues</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Button 
            onClick={() => setOpenLogin(true)}
            className="flex items-center gap-2"
          >
            Sign In
          </Button>
          
          {localStorage.getItem('token') && (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
          
          <Button
            onClick={() => setOpenLeagueModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create or Join League
          </Button>
          
          {isAdmin && (
            <Button
              variant="ghost"
              onClick={() => navigate('/admin-scores')}
              className="flex items-center gap-2 ml-auto"
            >
              <Settings className="h-4 w-4" />
              Admin Scores
            </Button>
          )}
        </div>

        {/* Leagues List */}
        {renderLeagues()}

        {/* Share Success Message */}
        {shareSnackbar && (
          <div className="fixed top-4 right-4 bg-state-success text-white px-4 py-2 rounded-md shadow-lg z-50">
            Invitation link copied to clipboard!
          </div>
        )}

        {/* League Options Modal */}
        <Dialog open={openLeagueModal} onOpenChange={setOpenLeagueModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Select an option</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-6">
              <Button
                onClick={() => {
                  setOpenCreateLeague(true);
                  setOpenLeagueModal(false);
                }}
                className="w-full"
              >
                Create League
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpenJoinLeague(true);
                  setOpenLeagueModal(false);
                }}
                className="w-full"
              >
                Join League
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create League Modal */}
        <Dialog open={openCreateLeague} onOpenChange={setOpenCreateLeague}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Create League</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  League Name
                </label>
                <Input
                  type="text"
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="Enter league name"
                  className="w-full"
                />
              </div>
              {leagueError && (
                <p className="text-state-error text-small">{leagueError}</p>
              )}
              {successMsg && (
                <p className="text-state-success text-small">{successMsg}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleCreateLeague} className="flex-1">
                  Create
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setOpenCreateLeague(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join League Modal */}
        <Dialog open={openJoinLeague} onOpenChange={setOpenJoinLeague}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Join League</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  League Code or Name
                </label>
                <Input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter league code"
                  className="w-full"
                />
              </div>
              {joinError && (
                <p className="text-state-error text-small">{joinError}</p>
              )}
              {successMsg && (
                <p className="text-state-success text-small">{successMsg}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleJoinLeague} className="flex-1">
                  Join
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setOpenJoinLeague(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit League Modal */}
        <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Edit League</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  League Name
                </label>
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter league name"
                  className="w-full"
                />
              </div>
              {editError && (
                <p className="text-state-error text-small">{editError}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button onClick={handleEditLeagueSave} className="flex-1">
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setOpenEditModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete League Modal */}
        <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Delete League</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <p className="text-text-primary text-body">
                Are you sure you want to delete the league "{deleteLeague?.name}"?
              </p>
              {deleteError && (
                <p className="text-state-error text-small">{deleteError}</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleDeleteLeagueConfirm}
                  className="flex-1 bg-state-error hover:bg-state-error/80"
                >
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setOpenDeleteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Login Modal */}
        <Dialog open={openLogin} onOpenChange={setOpenLogin}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Sign In</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full"
                />
              </div>
              {loginError && (
                <p className="text-state-error text-small">{loginError}</p>
              )}
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={handleLogin} className="w-full">
                  Sign In
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpenLogin(false);
                    setOpenRegister(true);
                  }}
                  className="w-full"
                >
                  Register
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Register Modal */}
        <Dialog open={openRegister} onOpenChange={setOpenRegister}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-text-primary text-h3 font-bold">Register</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  Name
                </label>
                <Input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-text-primary text-small font-medium mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full"
                />
              </div>
              {registerError && (
                <p className="text-state-error text-small">{registerError}</p>
              )}
              <div className="flex flex-col gap-3 pt-4">
                <Button onClick={handleRegister} className="w-full">
                  Register
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpenRegister(false);
                    setOpenLogin(true);
                  }}
                  className="w-full"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 