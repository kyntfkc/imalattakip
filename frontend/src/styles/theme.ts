// Pastel Minimalist Theme
export const colors = {
  // Pastel Ana Renkler
  primary: {
    main: '#6366f1',      // Soft Indigo
    light: '#a5b4fc',     // Light Indigo
    lighter: '#e0e7ff',   // Lighter Indigo
    dark: '#4f46e5'       // Dark Indigo
  },
  secondary: {
    main: '#8b5cf6',      // Soft Purple
    light: '#c4b5fd',     // Light Purple
    lighter: '#ede9fe',   // Lighter Purple
    dark: '#7c3aed'       // Dark Purple
  },
  success: {
    main: '#10b981',      // Soft Green
    light: '#6ee7b7',     // Light Green
    lighter: '#d1fae5',   // Lighter Green
    dark: '#059669'       // Dark Green
  },
  warning: {
    main: '#f59e0b',      // Soft Orange
    light: '#fcd34d',     // Light Orange
    lighter: '#fef3c7',   // Lighter Orange
    dark: '#d97706'       // Dark Orange
  },
  error: {
    main: '#ef4444',      // Soft Red
    light: '#fca5a5',     // Light Red
    lighter: '#fee2e2',   // Lighter Red
    dark: '#dc2626'       // Dark Red
  },
  info: {
    main: '#3b82f6',      // Soft Blue
    light: '#93c5fd',     // Light Blue
    lighter: '#dbeafe',   // Lighter Blue
    dark: '#2563eb'       // Dark Blue
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  },
  background: {
    main: '#ffffff',
    alt: '#f9fafb',
    card: '#ffffff',
    hover: '#f3f4f6'
  }
};

// Birim Renkleri (Pastel)
export const unitColors = {
  'ana-kasa': {
    primary: '#6366f1',
    secondary: '#818cf8',
    light: '#e0e7ff',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)'
  },
  'yarimamul': {
    primary: '#10b981',
    secondary: '#34d399',
    light: '#d1fae5',
    gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
  },
  'lazer-kesim': {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    light: '#fef3c7',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
  },
  'tezgah': {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    light: '#ede9fe',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
  },
  'cila': {
    primary: '#ec4899',
    secondary: '#f472b6',
    light: '#fce7f3',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)'
  },
  'dokum': {
    primary: '#14b8a6',
    secondary: '#2dd4bf',
    light: '#ccfbf1',
    gradient: 'linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%)'
  },
  'tedarik': {
    primary: '#f97316',
    secondary: '#fb923c',
    light: '#fed7aa',
    gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)'
  },
  'dis-kasa': {
    primary: '#06b6d4',
    secondary: '#22d3ee',
    light: '#cffafe',
    gradient: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)'
  },
  'satis': {
    primary: '#22c55e',
    secondary: '#4ade80',
    light: '#dcfce7',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)'
  }
};

// Ortak Stiller
export const commonStyles = {
  borderRadius: '16px',
  borderRadiusSmall: '12px',
  borderRadiusLarge: '20px',
  cardShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  cardShadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  cardShadowActive: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  }
};

// Fire Renkleri
export const getFireColor = (fire: number) => {
  if (fire === 0) return colors.success.main;
  if (fire < 1) return colors.warning.main;
  return colors.error.main;
};

// Fire Background Rengi
export const getFireBackground = (fire: number) => {
  if (fire === 0) return colors.success.lighter;
  if (fire < 1) return colors.warning.lighter;
  return colors.error.lighter;
};

