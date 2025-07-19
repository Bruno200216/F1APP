import * as React from 'react';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import GroupIcon from '@mui/icons-material/Group';
import StoreIcon from '@mui/icons-material/Store';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNavigate } from 'react-router-dom';

export default function BottomNavBar() {
  const [value, setValue] = React.useState(0);
  const navigate = useNavigate();

  const handleChange = (event, newValue) => {
    setValue(newValue);
    switch (newValue) {
      case 0: navigate('/leagues'); break;
      case 1: navigate('/clasification'); break;
      case 2: navigate('/team-pilots'); break;
      case 3: navigate('/market'); break;
      case 4: navigate('/activity'); break;
      default: break;
    }
  };

  return (
    <BottomNavigation
      value={value}
      onChange={handleChange}
      showLabels
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}
    >
      <BottomNavigationAction label="Leagues" icon={<SportsEsportsIcon />} />
      <BottomNavigationAction label="Clasification" icon={<LeaderboardIcon />} />
      <BottomNavigationAction label="Drivers/Team" icon={<GroupIcon />} />
      <BottomNavigationAction label="Market" icon={<StoreIcon />} />
      <BottomNavigationAction label="Activity" icon={<NotificationsIcon />} />
    </BottomNavigation>
  );
} 