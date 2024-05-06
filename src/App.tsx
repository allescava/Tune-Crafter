import React, { useRef, useEffect, useState, Ref } from "react";
import { hasGetUserMedia } from './utils/helpers';
import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import { WaveSurfer } from 'wavesurfer-react/dist/utils/createWavesurfer';
import GestureComponent from "./components/GestureComponent";
import AudioWaveComponent from "./components/AudioWaveComponent";
import SpeechComponent from "./components/SpeechComponent";
import SideBar from "./components/SideBar";
import { AudioManager } from "./AudioManager";
import RecordingButton from "./components/RecordingButton";
import RecordingsListModel from "./models/RecordingsListModel";
import RecordingModel from "./models/RecordingModel";

function App() {
  let audioUrl = "assets/sounds/audio.mp3"
  const waveformRef: Ref<WaveSurfer> | null = useRef<WaveSurfer | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  // Check if the browser supports the WebSpeech API

  const soundManager: AudioManager = new AudioManager(waveformRef.current);

  useEffect(() => {
    if (hasGetUserMedia()) {
      enableCam();
    } else {
      console.log("getUserMedia() is not supported by your browser");
    }
  }, [video]);

  function enableCam() {
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      setVideo(document.getElementById("webcam") as HTMLVideoElement);
      if (video != null) {
        video.srcObject = stream;
      }
    }).catch((error) => {
      console.error("Error accessing webcam:", error);
    });
  }

  function isSafari() {
    const userAgent = navigator.userAgent;
    return /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|Edg/i.test(userAgent);
  }

  /*Recording features */

  let recordingsList = new RecordingsListModel();
  const [newSound, setNewSound] = useState<string>("");

  const resetRecording = () => {
    recordingsList.clearRecordingList();
  };

  const addNewRecording = (sound: string) => {
    // recordingsList.addRecording(new RecordingModel(sound));
    setNewSound(sound);
  }


  return (
    <>
      <section className="main-cont">
        {/* <HeartRateComponent /> */}
        <div className="row">
          <div className="col-auto">
            <SideBar />
          </div>
          <div className="col" style={{ position: "relative" }}>
            <div className="waveForm">
              <AudioWaveComponent ref={waveformRef} audioUrl={audioUrl} soundManager={soundManager} />
            </div>
            <div className="row">
              <div className="col">
                {video && (
                  <GestureComponent video={video} waveform={waveformRef.current} soundManager={soundManager} addRecording={addNewRecording}></GestureComponent>
                )}
              </div>
              <div className="col" style={{ position: "relative" }}>
                <p id="currentSongName" style={{ fontSize: "14px", textAlign: "center", marginTop: "40px", color: "white" }}>
                  {isSafari() ?
                    "This browser doesn't support all features. Try Google Chrome instead" : "🟣 Now Playing: Original Track"
                  }
                </p>
              </div>
              <div className="col">
                <SpeechComponent waveform={waveformRef.current} soundManager={soundManager}></SpeechComponent>
              </div>
            </div>
            <div className="row text-center position-relative">
              <div className="col text-center">
                <RecordingButton />
              </div>
            </div>
          </div>
        </div>
        <video id="webcam" autoPlay playsInline style={{ display: "none" }}></video>
        <p style={{ position: "absolute", bottom: "0px", color: "#f5f5ff85", fontSize: "10px", left: "50%", transform: "translate(-50%, -50%)" }}>Copyright © 2023 by <a href="https://www.linkedin.com/in/alecava/" target="_blank">Alessandro Cavallotti</a>, <a href="https://www.linkedin.com/in/matteo-fornara-756994210/" target="_blank">Matteo Fornara</a>, and <a href="https://www.linkedin.com/in/shubhankars/" target="_blank">Shubankar</a>. All rights reserved.</p>
      </section>
    </>
  )
}

export default App