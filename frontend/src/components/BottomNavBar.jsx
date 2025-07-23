import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

// Lucide React icons
import { 
  Trophy, 
  BarChart3, 
  Users, 
  ShoppingCart, 
  Bell 
} from 'lucide-react';

const navItems = [
  {
    id: 'leagues',
    label: 'Leagues',
    icon: Trophy,
    path: '/leagues'
  },
  {
    id: 'classification',
    label: 'Classification', 
    icon: BarChart3,
    path: '/clasification'
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    path: '/team-pilots'
  },
  {
    id: 'market',
    label: 'Market',
    icon: ShoppingCart,
    path: '/market'
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Bell,
    path: '/activity'
  }
];

export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around px-2 py-3 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 h-auto py-2 px-3 min-w-0 flex-1 max-w-20 transition-all duration-normal",
                active 
                  ? "text-accent-main bg-accent-main bg-opacity-12" 
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated hover:bg-opacity-50"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-colors duration-normal",
                  active ? "text-accent-main" : "text-current"
                )} 
              />
              <span className={cn(
                "text-xs font-medium leading-tight truncate transition-colors duration-normal",
                active ? "text-accent-main" : "text-current"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
} 