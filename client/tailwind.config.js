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
          bg: '#EDEEEA',
          border: '#DADDD9',
        },
        // Text
        ink: {
          900: '#1C1F1E',
          700: '#3A3D3C',
          500: '#5B615E',
          300: '#93998F',
        },
        // Brand accent — deep, finance-grade emerald (replaces lime/chartreuse)
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
      },
    },
  },
  plugins: [],
};
