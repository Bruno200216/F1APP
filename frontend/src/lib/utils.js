import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTime(timeString) {
  if (!timeString) return '';
  return new Date(timeString).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getTeamColor(teamName) {
  const teamColors = {
    'Red Bull Racing': { primary: '#3671C6', secondary: '#1E41C3' },
    'Mercedes': { primary: '#6CD3BF', secondary: '#00D2BE' },
    'McLaren': { primary: '#FF8700', secondary: '#FF5800' },
    'Ferrari': { primary: '#DC0000', secondary: '#B80000' },
    'Aston Martin': { primary: '#358C75', secondary: '#006F62' },
    'Alpine': { primary: '#0090FF', secondary: '#0051FF' },
    'Stake F1 Team Kick Sauber': { primary: '#52E252', secondary: '#37BEDD' },
    'Haas': { primary: '#FFFFFF', secondary: '#E8E8E8' },
    'Williams': { primary: '#37BEDD', secondary: '#005AFF' },
    'Visa Cash App RB': { primary: '#5E8FAA', secondary: '#1E41C3' }
  }
  
  return teamColors[teamName] || { primary: '#666666', secondary: '#444444' }
}