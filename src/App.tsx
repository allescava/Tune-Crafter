import React, { useEffect, useRef, Ref } from "react";
// import { hasGetUserMedia } from './utils/helpers';
import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import { WaveSurfer } from 'wavesurfer-react/dist/utils/createWavesurfer';
// Gesture recognition (incl. left-hand drum triggers) and voice recognition are disabled for now,
// while the looper/metronome feature is being worked on. Re-enable these imports to bring them back.
// import GestureComponent from "./components/GestureComponent";
// Track/waveform player disabled for now, we don't need it while working on the looper
// import AudioWaveComponent from "./components/AudioWaveComponent";
// import SpeechComponent from "./components/SpeechComponent";
// import SideBar from "./components/SideBar";
import { AudioManager } from "./AudioManager";
import { MetronomeManager } from "./MetronomeManager";
import MetronomeComponent from "./components/MetronomeComponent";
import KeyboardLegend from "./components/KeyboardLegend";

function App() {
  // let audioUrl = "assets/sounds/audio.mp3" // unused while the track/waveform player is disabled
  const waveformRef: Ref<WaveSurfer> | null = useRef<WaveSurfer | null>(null);
  // const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  // Check if the browser supports the WebSpeech API

  // Kept as stable refs so a re-render (e.g. React StrictMode's double-invoke, or the video state
  // update) never recreates them, which would silently wipe any recorded channels/loaded sounds.
  const soundManagerRef = useRef<AudioManager | null>(null);
  if (!soundManagerRef.current) {
    soundManagerRef.current = new AudioManager(waveformRef.current);
  }
  const soundManager = soundManagerRef.current;

  const metronomeManagerRef = useRef<MetronomeManager | null>(null);
  if (!metronomeManagerRef.current) {
    metronomeManagerRef.current = new MetronomeManager(soundManager);
  }
  const metronomeManager = metronomeManagerRef.current;

  // Sounds used to be loaded by GestureComponent on mount; load them here now that it's disabled
  useEffect(() => {
    soundManager.loadAllSounds();
  }, [soundManager]);

  // Keyboard shortcuts for drums and the selected piano range
  useEffect(() => {
    const drumKeyToSound: { [key: string]: string } = {
      n: "index",
      b: "middle",
      v: "ring",
      c: "pinky",
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }
      const key = event.key.toLowerCase();
      const sound = drumKeyToSound[key] ?? soundManager.getPianoKeyboardSoundMap()[key];
      if (!sound) {
        return;
      }
      soundManager.playSound(sound);
      metronomeManager.registerHit(sound);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [soundManager, metronomeManager]);

  // Webcam/gesture-recognition bootstrap disabled for now
  // useEffect(() => {
  //   if (hasGetUserMedia()) {
  //     enableCam();
  //   } else {
  //     console.log("getUserMedia() is not supported by your browser");
  //   }
  // }, [video]);

  // function enableCam() {
  //   // Activate the webcam stream.
  //   navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  //     setVideo(document.getElementById("webcam") as HTMLVideoElement);
  //     if (video != null) {
  //       video.srcObject = stream;
  //     }
  //   }).catch((error) => {
  //     console.error("Error accessing webcam:", error);
  //   });
  // }

  // function isSafari() {
  //   const userAgent = navigator.userAgent;
  //   return /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|Edg/i.test(userAgent);
  // }

  /*Recording features */


  return (
    <>
      <section className="main-cont">
        {/* <HeartRateComponent /> */}
        <div className="row">
          {/* <div className="col-auto">
            <SideBar />
          </div> */}
          <div className="col" style={{ position: "relative" }}>
            {/* Track/waveform player disabled for now
            <div className="waveForm">
              <AudioWaveComponent ref={waveformRef} audioUrl={audioUrl} soundManager={soundManager} />
            </div> */}
            <div className="row">
              {/* Gesture recognition (incl. left-hand drum triggers) disabled for now
              <div className="col">
                {video && (
                  <GestureComponent video={video} waveform={waveformRef.current} soundManager={soundManager} metronomeManager={metronomeManager}></GestureComponent>
                )}
              </div> */}
              {/* <div className="col" style={{ position: "relative" }}>
                <p id="currentSongName" style={{ fontSize: "14px", textAlign: "center", marginTop: "40px", color: "white" }}>
                  {isSafari() ?
                    "This browser doesn't support all features. Try Google Chrome instead" : "🟣 Now Playing: Original Track"
                  }
                </p>
              </div> */}
              {/* Voice recognition disabled for now
              <div className="col">
                <SpeechComponent waveform={waveformRef.current} soundManager={soundManager}></SpeechComponent>
              </div> */}
            </div>
            <div className="row text-center position-relative">
              <div className="col text-center">
                <MetronomeComponent metronomeManager={metronomeManager} audioManager={soundManager} />
              </div>
            </div>
            <KeyboardLegend />
          </div>
        </div>
        {/* <video id="webcam" autoPlay playsInline style={{ display: "none" }}></video> */}
      </section>
    </>
  )
}

export default App