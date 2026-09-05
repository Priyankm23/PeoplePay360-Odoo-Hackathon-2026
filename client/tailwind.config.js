/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base / backgrounds
        paper: '#F4F5F3',
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#DADDD9',
          soft: '#E5E7E4',
        },
        sidebar: {
          // Dark forest-green sidebar scheme
          bg: '#1A2E24',
          border: '#253D30',
          hover: '#243728',
          active: '#2D4A38',
          text: '#B8D4C2',
          textMuted: '#7AA08A',
          textStrong: '#E8F4EE',
        },
        // Text
        ink: {
          900: '#1C1F1E',
          700: '#3A3D3C',
          500: '#5B615E',
          300: '#93998F',
        },
        // Brand accent — deep, finance-grade emerald
        chartreuse: {
          50: '#F1F7F3',
          100: '#E0EFE6',
          200: '#C2DFCC',
          300: '#94C6A5',
          400: '#5FA77B',
          500: '#3B8A5C',
          600: '#2A6F48',
          700: '#235A3C',
          800: '#1D4830',
          900: '#173A27',
        },
        // Complementary accent — warm amber/gold (finance/currency feel)
        gold: {
          50: '#FDF8EE',
          100: '#FAF0D2',
          200: '#F4DFA0',
          300: '#ECC85E',
          400: '#E0A820',
          500: '#C98A10',
          600: '#A86E0B',
          700: '#865508',
          800: '#643F07',
          900: '#422905',
        },
        // Status
        status: {
          success: '#3E7D5C',
          successSoft: '#E8F2EC',
          warning: '#B8862B',
          warningSoft: '#F5EDDC',
          danger: '#B4432F',
          dangerSoft: '#F4E6E1',
          info: '#5C7A99',
          infoSoft: '#E8EDF2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SF Mono"', 'Menlo', 'monospace'],
        numeric: ['"IBM Plex Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'sm-md': '6px',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(28, 31, 30, 0.04)',
        pop: '0 4px 12px -2px rgba(28, 31, 30, 0.08), 0 1px 3px 0 rgba(28, 31, 30, 0.04)',
        drawer: '-8px 0 24px -4px rgba(28, 31, 30, 0.1)',
        'gold-glow': '0 0 0 3px rgba(201, 138, 16, 0.15)',
        'green-glow': '0 0 0 3px rgba(59, 138, 92, 0.15)',
      },
      backgroundImage: {
        'sidebar-gradient': 'linear-gradient(180deg, #1A2E24 0%, #152618 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #C98A10 0%, #E0A820 50%, #C98A10 100%)',
        'green-shimmer': 'linear-gradient(135deg, #2A6F48 0%, #3B8A5C 50%, #2A6F48 100%)',
        'stat-gold': 'linear-gradient(135deg, #FDF8EE 0%, #FAF0D2 100%)',
        'stat-green': 'linear-gradient(135deg, #F1F7F3 0%, #E0EFE6 100%)',
      },
    },
  },
  plugins: [],
};
