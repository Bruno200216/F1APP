import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { LeagueProvider } from './context/LeagueContext';
import BottomNavBar from './components/BottomNavBar';
import LeaguesPage from './pages/LeaguesPage';
import ClasificationPage from './pages/ClasificationPage';
import TeamPilotsPage from './pages/TeamPilotsPage';
import MarketPage from './pages/MarketPage';
import ActivityPage from './pages/ActivityPage';
import JoinLeaguePage from './pages/JoinLeaguePage';
import AuctionPilotProfilePage from './pages/AuctionPilotProfilePage';
import AuctionPilotBidPage from './pages/AuctionPilotBidPage';
import AuctionEngineerBidPage from './pages/AuctionEngineerBidPage';
import AuctionTeamBidPage from './pages/AuctionTeamBidPage';
import EngineerProfilePage from './pages/EngineerProfilePage';
import TeamProfilePage from './pages/TeamProfilePage';
import ProfilePage from './pages/ProfilePage';
import AdminScoresPage from './pages/AdminScoresPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LeagueProvider>
        <Router>
          <div style={{ paddingBottom: 80 }}>
            <Routes>
              <Route path="/" element={<LeaguesPage />} />
              <Route path="/leagues" element={<LeaguesPage />} />
              <Route path="/clasification" element={<ClasificationPage />} />
              <Route path="/team-pilots" element={<TeamPilotsPage />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/market/auction/:id" element={<AuctionPilotProfilePage />} />
              <Route path="/market/auction/:id/bid" element={<AuctionPilotBidPage />} />
              <Route path="/puja/:id" element={<AuctionPilotBidPage />} />
              <Route path="/puja/engineer/:type/:id" element={<AuctionEngineerBidPage />} />
              <Route path="/puja/team/:id" element={<AuctionTeamBidPage />} />
              <Route path="/engineer/:type/:id" element={<EngineerProfilePage />} />
              <Route path="/team/:id" element={<TeamProfilePage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/join-league" element={<JoinLeaguePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/admin-scores" element={<AdminScoresPage />} />
            </Routes>
            <BottomNavBar />
          </div>
        </Router>
      </LeagueProvider>
    </ThemeProvider>
  );
}

export default App; 