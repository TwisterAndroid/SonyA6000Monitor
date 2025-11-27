# 🎥 Sony A6000 Pro Monitor & Recorder

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) ![Tech](https://img.shields.io/badge/tech-React%20%7C%20Vite%20%7C%20Capacitor-orange)

Un'applicazione professionale che trasforma il tuo smartphone Android (o PC) in un **Field Monitor** avanzato per Sony A6000, risolvendo la storica mancanza di input microfono e monitoring audio di questa fotocamera.

**Progettata per Content Creator, Vlogger e Filmmaker.**

## 🚀 Il Problema
La Sony A6000 è una fotocamera fantastica, ma ha due difetti fatali per i video:
1.  ❌ Nessun ingresso Jack per microfono.
2.  ❌ Nessun livello audio (Audio Meter) a schermo.
3.  ❌ Nessuno schermo orientabile (Flip screen).

## ✅ La Soluzione
Questa App utilizza una **scheda di acquisizione HDMI USB** (costo ~15€) per prelevare il segnale video pulito dalla camera e unirlo all'audio di un microfono esterno (USB/Wireless) collegato al telefono.

## ✨ Features "Killer"

### 🎙️ Audio Monitoring Avanzato
*   **VU Meters Stereo** in tempo reale.
*   **Oscilloscopio (Waveform)** per analizzare le frequenze.
*   **Supporto Nativo** per microfoni wireless (Hollyland Lark, Synco, Rode, DJI).
*   **Rilevamento Clipping** visivo.

### 🎬 Production Tools
*   **LUTs Preview**: Simula color grading (Cinematic, B&W, Teal & Orange) su segnale S-Log2.
*   **Ghost Mode (Onion Skin)**: Sovrapponi un frame precedente per garantire la continuità tra le riprese.
*   **Social Safe Zones**: Guide 9:16 (TikTok), 4:5 (IG) e 1:1.
*   **Chroma Key Preview**: Rimuove il verde in tempo reale per testare il green screen.
*   **Digital Slate**: Flash visivo + Beep audio per sincronizzare le tracce in post.

### 🤖 Smart Teleprompter
*   **AI Smart Track**: Il testo scorre *solo* quando pronunci le parole (Riconoscimento Vocale).
*   **Voice Act**: Il testo scorre quando c'è rumore (Volume Trigger).
*   **Mirroring**: Supporto per specchi teleprompter fisici.

### ⚡ Smart Workflow
*   **Magic Snap**: Batti le mani due volte (👏 👏) per avviare/fermare la registrazione a distanza.
*   **Shot List**: Gestione scene e take. I file vengono rinominati automaticamente (es. `Intro_Take1.mp4`).
*   **Hybrid Recording**: Registra Video+Audio se c'è segnale HDMI, oppure solo Audio (WAV) se usata come registratore esterno.

---

## 🛠️ Requisiti Hardware

Per far funzionare il sistema hai bisogno di:

1.  **Sony A6000** (o qualsiasi camera con uscita HDMI).
2.  **Cavo Micro-HDMI to HDMI**.
3.  **Scheda di Acquisizione Video HDMI to USB** (Video Capture Card).
    *   *Economica (15€):* Cerca "HDMI Video Capture" su Amazon.
    *   *Pro:* Elgato Cam Link.
4.  **Adattatore OTG** (USB-A to USB-C) per collegare la scheda al telefono Android.
5.  **Microfono (Opzionale ma consigliato):** Hollyland Lark M1/M2, Synco, o microfono USB.

### Configurazione Camera
*   Menu -> Setup -> **HDMI Resolution**: `1080p`
*   Menu -> Setup -> **HDMI Info. Display**: `Off` (Fondamentale per avere l'immagine pulita).

---

## 📲 Installazione

### Metodo 1: Android Nativo (APK)
L'app è configurata con **GitHub Actions**. 
1.  Forka o carica questo codice su GitHub.
2.  Vai nella tab **Actions**.
3.  Seleziona il workflow "Build Android APK".
4.  Scarica il file `.apk` generato e installalo sul telefono.

### Metodo 2: PWA (Web App)
1.  Avvia il server locale o deploya su Vercel/Netlify.
2.  Apri il link con Chrome su Android.
3.  Clicca "Aggiungi a schermata Home".

---

## 💻 Sviluppo Locale

1.  **Clona la repo:**
    ```bash
    git clone https://github.com/tuo-user/sony-a6000-monitor.git
    cd sony-a6000-monitor
    ```

2.  **Installa dipendenze:**
    ```bash
    npm install
    ```

3.  **Avvia server di sviluppo:**
    ```bash
    npm run dev
    ```

4.  **Build per Android (Locale):**
    Richiede Android Studio installato.
    ```bash
    npm run build
    npx cap sync
    npx cap open android
    ```

---

## 📜 Licenza
MIT License. Libero di usare, modificare e distribuire.

---
*Built with ❤️ for Creators.*
