import currentMode from "./CurrentMode";

const NORMAL_SONGS = [{ path: "audio.mp3", name: "Original Track" }, { path: "audio_techno.mp3", name: "Techno Track" }, { path: "audio_original.mp3", name: "Chill Track" }];
const LAURA_SONGS = [{ path: "hiddenSounds/laura.mp3", name: "Måneskin - Ella baila sola (cover de Peso Pluma) LIVE" }];
const EMILIO_SONGS = [{ path: "hiddenSounds/emilio.mp3", name: "Emilio's Track" }];
const NINA_SONGS = [{ path: "hiddenSounds/nina.mp3", name: "Love on the Brain (Rihanna Cover) by Nina <a target='_blank' href='https://www.instagram.com/ninamazza_/'>@ninamazza_</a>", shortName: "Love on the Brain (Rihanna Cover) by Nina" }];
const CHRISTMAS_SONGS = [{ path: "hiddenSounds/christmas.mp3", name: "Christmas Track" }];
const PIANO_SONGS = [{ path: "hiddenSounds/piano.wav", name: "Piano Track" }];
const PIANO_KEY_FILES = [
  "A_2", "A_2s", "B_2", "C_1", "C_1s", "D_1", "D_1s", "E_1", "F_1", "F_1s", "G_1", "G_1s", "A_1", "A_1s", "B_1",
  "C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B", "c1", "c1s", "d1", "d1s", "e1", "f1", "f1s", "g1", "g1s", "a1", "a1s", "b1",
  "c2", "c2s", "d2", "d2s", "e2", "f2", "f2s", "g2", "g2s", "a2", "a2s", "b2", "c3", "c3s", "d3", "d3s", "e3", "f3", "f3s", "g3", "g3s", "a3", "a3s", "b3",
  "c4", "c4s", "d4", "d4s", "e4", "f4", "f4s", "g4", "g4s", "a4", "a4s", "b4", "c5",
];
const PIANO_TONES = [
  { label: "Low", start: "c1" },
  { label: "Middle", start: "c2" },
  { label: "High", start: "c3" },
];
const PIANO_KEY_OFFSETS = {
  natural: [0, 2, 4, 5, 7, 9, 11, 12],
  sharp: [1, 3, 6, 8, 10, 13, 15, 18, 20, 22],
};

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private normalAudioBufferMap: Map<string, AudioBuffer>;  //With each sound
  private christmasAudioBufferMap: Map<string, AudioBuffer>;  //With each sound
  private pianoAudioBufferMap: Map<string, AudioBuffer>;  //With each sound
  private tickBuffer: AudioBuffer | null = null;
  private currentSong: number = 0;
  private waveform: WaveSurfer | null = null;
  private speedValue: number = 1;
  private pianoToneIndex: number = 1;
  private listeners: any = [];
  private songs: any = NORMAL_SONGS;

  addListener(listener: any) {
    this.listeners.push(listener);
  }

  removeListener(listener: any) {
    this.listeners = this.listeners.filter((l: any) => l !== listener);
  }

  fireListeners() {
    this.listeners.forEach((listener: any) => listener());
  }


  constructor(waveform: WaveSurfer | null) {
    this.normalAudioBufferMap = new Map();
    this.christmasAudioBufferMap = new Map();
    this.pianoAudioBufferMap = new Map();

    this.waveform = waveform;

    waveform?.on('finish', () => {
      this.nextSong();
      this.newTrack();
    });
  }

  // Initialize the AudioContext
  private initializeAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('AudioContext initialization error:', error);
    }
  }

  //Function to load all the audio files at the bootstrap of the application
  loadAllSounds() {
    this.loadSound('index', 'assets/sounds/kick.wav', "normal");
    this.loadSound('middle', 'assets/sounds/snare.wav', "normal");
    this.loadSound('ring', 'assets/sounds/hat.wav', "normal");
    this.loadSound('pinky', 'assets/sounds/clap.wav', "normal");

    this.loadSound('index', 'assets/sounds/christmas-little-bells.mp3', "christmas");
    this.loadSound('middle', 'assets/sounds/christmas-bell.mp3', "christmas");
    this.loadSound('ring', 'assets/sounds/christmas-ding.mp3', "christmas");
    this.loadSound('pinky', 'assets/sounds/merry-christmas.mp3', "christmas");

    PIANO_KEY_FILES.forEach((file) => {
      this.loadSound(file, `assets/sounds/sound_keyboard/${file}.mp3`, "piano");
    });

    this.loadTickSound();
  }

  // Loads the metronome click, kept separate from the mode-specific buffer maps
  private async loadTickSound(): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext) {
      const response = await fetch('assets/sounds/metronome-tick.wav');
      const audioData = await response.arrayBuffer();
      this.tickBuffer = await this.audioContext.decodeAudioData(audioData);
    }
  }

  // Plays the metronome tick at a precise AudioContext time, with `volume` used to accent the first beat of each bar
  public playTickAt(when: number, volume: number = 1): void {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext && this.tickBuffer) {
      const source = this.audioContext.createBufferSource();
      source.buffer = this.tickBuffer;
      const gain = this.audioContext.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start(when);
    }
  }

  // Load audio file and store it in the buffer
  async loadSound(name: string, url: string, mode: string): Promise<void> {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext) {
      this.createAudioContext(this.audioContext, name, url, mode);
    }

  }

  public async createAudioContext(audioContext: AudioContext, name: string, url: string, mode: string) {
    const response = await fetch(url);
    const audioData = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioData);

    switch (mode) {
      case "normal":
        this.normalAudioBufferMap.set(name, audioBuffer);
        break;
      case "christmas":
        this.christmasAudioBufferMap.set(name, audioBuffer);
        break;
      case "piano":
        this.pianoAudioBufferMap.set(name, audioBuffer);
        break;
      default:
        break;
    }
  }

  // Play a loaded sound
  public playSound(name: string): void {
    this.playSoundAt(name, undefined);
  }

  getPianoToneOptions() {
    return PIANO_TONES;
  }

  getPianoToneIndex(): number {
    return this.pianoToneIndex;
  }

  setPianoToneIndex(index: number): void {
    this.pianoToneIndex = Math.max(0, Math.min(PIANO_TONES.length - 1, index));
    this.fireListeners();
  }

  getPianoKeyboardSoundMap(): { [key: string]: string } {
    const startIndex = PIANO_KEY_FILES.indexOf(PIANO_TONES[this.pianoToneIndex].start);
    const soundMap: { [key: string]: string } = {};
    const naturalKeys = ["s", "d", "f", "g", "h", "j", "k", "l"];
    const sharpKeys = ["w", "e", "r", "t", "y", "u", "i", "o", "p", "["];
    PIANO_KEY_OFFSETS.natural.forEach((offset, index) => {
      const file = PIANO_KEY_FILES[startIndex + offset];
      if (file) soundMap[naturalKeys[index]] = `chord-${file}`;
    });
    PIANO_KEY_OFFSETS.sharp.forEach((offset, index) => {
      const file = PIANO_KEY_FILES[startIndex + offset];
      if (file) soundMap[sharpKeys[index]] = `chord-${file}`;
    });
    return soundMap;
  }

  // Play a loaded sound precisely at a given AudioContext time (used by the metronome looper). If `when` is omitted, plays immediately.
  public playSoundAt(name: string, when: number | undefined): void {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext) {
      const buffer = this.getBufferForCurrentMode(name);
      if (buffer) {
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(when);
      }
    }
  }

  private getBufferForCurrentMode(name: string): AudioBuffer | undefined {
    // Piano chords are always played from the piano buffer map regardless of the current mode
    if (name.startsWith("chord-")) {
      return this.pianoAudioBufferMap.get(name.slice("chord-".length));
    }
    switch (currentMode.mode) {
      case "normal":
        return this.normalAudioBufferMap.get(name);
      case "christmas":
        return this.christmasAudioBufferMap.get(name);
      case "piano":
        return this.pianoAudioBufferMap.get(name);
      default:
        return undefined;
    }
  }

  // Returns the shared AudioContext, creating it if needed (used by the metronome to schedule ticks/sounds in sync)
  public getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }
    return this.audioContext!;
  }

  //Function to change track over the waveForm
  public newTrack = () => {
    this.waveform?.load("assets/sounds/" + this.getCurrentSong());
    this.waveform?.on('ready', () => {
      this.waveform?.play();
    });
    let current_voice = document.getElementById('current_voice') as HTMLOutputElement;
    current_voice.innerText = "🎙️ New Track ✅";
    let currentSongName = document.getElementById('currentSongName') as HTMLOutputElement;
    currentSongName.innerHTML = "🟣 Now Playing: " + this.songs[this.currentSong].name;
    this.fireListeners();
  }

  /**
   * Function to set the next song
   */
  nextSong() {
    this.currentSong = (this.currentSong + 1) % this.songs.length;
    this.fireListeners()
  }

  /**
   * Function to get the current song playing
   */
  getCurrentSong() {
    return this.songs[this.currentSong].path;
  }

  setLauraSong() {
    this.currentSong = 0;
    this.songs = LAURA_SONGS;
    this.fireListeners();
  }

  setEmilioSong() {
    this.currentSong = 0;
    this.songs = EMILIO_SONGS;
    this.fireListeners();
  }

  setNinaSong() {
    this.currentSong = 0;
    this.songs = NINA_SONGS;
    this.fireListeners();
  }

  setChristmasSong() {
    this.currentSong = 0;
    this.songs = CHRISTMAS_SONGS;
    this.fireListeners();
  }

  setPianoSong() {
    this.currentSong = 0;
    this.songs = PIANO_SONGS;
    this.fireListeners();
  }

  setNormalSongs() {
    this.currentSong = 0;
    this.songs = NORMAL_SONGS;
    this.fireListeners();
  }

  getCurrentSongName() {
    return this.songs[this.currentSong].name;
  }

  getCurrentSongIndex() {
    return this.currentSong;
  }

  setCurrentSongIndex(index: number) {
    if (index < 0 || index >= this.songs.length) {
      return;
    }
    this.currentSong = index;
    this.fireListeners();
  }

  getSongs() {
    return this.songs;
  }

  getSpeedValue(): number {
    return Math.min(2, Math.max(0.5, this.speedValue));
  }

  setSpeedValue(speedValue: number): void {
    this.speedValue = speedValue;
  }

}
