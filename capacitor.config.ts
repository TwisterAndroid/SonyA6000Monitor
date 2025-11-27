import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sonya6000.monitor', // ID univoco della tua app
  appName: 'Sony A6000 Monitor',
  webDir: 'dist', // Cartella dove Vite costruisce il sito
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Configurazione permessi plugin nativi (se necessari in futuro)
  }
};

export default config;