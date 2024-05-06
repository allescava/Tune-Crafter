import React, { useState, useEffect } from "react";
import ReactGA from 'react-ga4';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';
import 'bootstrap/dist/css/bootstrap.css';

import { GestureRecognizer, FilesetResolver, DrawingUtils } from '../../node_modules/@mediapipe/tasks-vision';
import WaveSurfer from "wavesurfer.js";
import { GestureModel } from "../models/GestureModel";
import { AudioManager } from "../AudioManager";
import VolumeProgressBar from "./VolumeProgressBar";

export interface Coordinates {
    x: number;
    y: number;
}

interface GestureComponentProps {
    video: HTMLVideoElement | null,
    waveform: WaveSurfer | null,
    soundManager: AudioManager,
    addRecording: (sound: string) => void
}

const GestureComponent = (props: GestureComponentProps) => {
    // Define a sensitivity value to control effect change speed
    var video = props.video;
    var waveform = props.waveform;
    var soundManager = props.soundManager;
    var addRecording = props.addRecording;
    var gestureRecognizer: GestureRecognizer | null = null;

    var canvasElement: any | null = null;
    var canvasCtx: any | null = null;
    var results: any = undefined;
    const videoHeight = "100vh";
    const videoWidth = "auto";
    var volumeTimer: any = null;

    const model: GestureModel = new GestureModel(soundManager);

    const [volume, setVolume] = useState<number>(50);
    const [isVolumeVisible, setIsVolumeVisible] = useState<boolean>(false);
    // var lastVideoTime: any = -1;

    // Excecuted every time the video or the waveForm change
    useEffect(() => {
        if (video && waveform && gestureRecognizer == null) {
            createGestureRecognizer().then(() => {
                video?.addEventListener("loadeddata", predictWebcam);
                requestAnimationFrame(() => {
                    predictWebcam();
                });
            });
            setAudioObjects();
        }
    }, [video, waveform]);

    /**
     * Function to create the gestureRecognizer and initialization of the regions (used to create loops in the music flow)
     */
    const createGestureRecognizer = async () => {
        let recognizer = await loadModelWithRetry();
        if (recognizer) {
            gestureRecognizer = recognizer;
        }

        if (!gestureRecognizer) {
            console.error("Model loading failed after all retry attempts.");
            // Handle the failure case here
        }

        if (!model.haveRegions()) {
            const regions = waveform?.addPlugin(RegionsPlugin.create({}));
            regions?.on('region-created', (region: any) => {
                if (region.loop) {
                    region.playLoop();
                }
            });
            regions?.on('region-out', (region: any) => {
                if (region.loop) {
                    region.play();
                }
            });
            regions?.on('region-removed', (_: any) => {
                waveform?.play();
            });
            model.setRegions(regions);
        }
    }

    async function loadModelWithRetry() {
        let maxRetries = 3; // Maximum number of retry attempts
        let currentRetry = 0;
        let recognizer;

        while (currentRetry < maxRetries) {
            try {
                const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm");
                recognizer = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task"
                    },
                    numHands: 2,
                    runningMode: "VIDEO"
                });
                break; // If loading is successful, exit the loop
            } catch (error) {
                console.error("An error occurred on attempt #" + (currentRetry + 1) + ":", error);

                // Calculate and log the percentage of completion
                const percentage = ((currentRetry + 1) / maxRetries) * 100;
                console.log("Loading progress: " + percentage.toFixed(2) + "%");

                currentRetry++;

                if (currentRetry < maxRetries) {
                    // You can add a delay before the next retry if needed
                    // await new Promise(resolve => setTimeout(resolve, retryDelayMilliseconds));
                } else {
                    console.error("Maximum retry attempts reached. Model loading failed.");
                    break; // Exit the loop if max retries are reached
                }
            }
        }

        return recognizer; // Return the loaded recognizer or null if all retries failed
    }


    /**
     * Function to predict gestures from the webcam feed
     */
    const predictWebcam = () => {
        // Start detecting the stream
        if (gestureRecognizer) {
            setupCanvas();
            if (video && video.videoHeight > 0 && video.videoWidth > 0) {
                try {
                    results = gestureRecognizer.recognizeForVideo(video, Date.now());
                } catch (error) {
                    console.error(error);
                }
            }
            drawHands();
            performAction();
            requestAnimationFrame(() => {
                predictWebcam();
            });
            // window.requestAnimationFrame(predictWebcam.bind(this));
        }
    };

    /**
     * Function to load in advance all the sounds used in the application in the AudioManager
     */
    const setAudioObjects = () => {
        soundManager.loadAllSounds();
    }

    const setupCanvas = () => {
        if (canvasCtx == undefined) {
            canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
            canvasCtx = canvasElement.getContext("2d");
            canvasElement.style.height = videoHeight;
            canvasElement.style.width = videoWidth;
        }

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    }

    /**
     * Function to render the user's hands skeleton
     */
    const drawHands = () => {
        const drawingUtils = new DrawingUtils(canvasCtx);
        if (results && results.landmarks) {
            for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(
                    landmarks,
                    GestureRecognizer.HAND_CONNECTIONS,
                    {
                        color: "#FFFFFF",
                        lineWidth: 5
                    }
                );
                drawingUtils.drawLandmarks(landmarks, {
                    color: "#B01EB0",
                    lineWidth: 2
                });
            }
        }
        canvasCtx.restore();
    }

    /**
     * Function from which all the handles are called
     */
    const performAction = () => {
        if (results && results.gestures.length == 0) {
            let current_gesture = document.getElementById('current_gesture') as HTMLOutputElement;
            current_gesture.innerText = "🙌";
        }

        if (results && results.gestures.length > 0) {
            for (let i = 0; i < results.gestures.length; i++) {
                const categoryName = results.gestures[i][0].categoryName;
                const handedness = results.handednesses[i][0].displayName;

                detectAction(categoryName, handedness, results.landmarks[i]);
                handleDrums(handedness, results.landmarks[i]);
                handlePlayPause();
                handleEffects(handedness, results.landmarks[i]);
                handleRegions();
                handleVolume(results.landmarks[i]);
            }
        }
    }

    /**
     * Function to detect the specific action returned by the model
     */
    const detectAction = (categoryName: string, handedness: string, landmarks: any) => {
        let current_gesture = document.getElementById('current_gesture') as HTMLOutputElement;
        model.updateFSMStates(categoryName, handedness, landmarks, current_gesture, model.wsRegions);
        setGestureMesssage();
    }

    /**
     * Function setting the "guide" messages shown to the users
     */
    const setGestureMesssage = () => {
        let current_gesture = document.getElementById('current_gesture') as HTMLOutputElement;
        let cutText = model.getCutText();
        if (cutText) {
            current_gesture.innerText = cutText;
        }
    }

    /**
     * Function to handle "drums" effects. Mapped to each finger (through the relative landmark)
     */
    const handleDrums = (handedness: string, landmarks: any) => {
        //DRUMS detect and managing
        if (handedness == "Left") {
            let sound = model.getDrumSound(landmarks);
            if (sound) {
                ReactGA.event({
                    category: 'User Interaction',
                    action: 'gesture',
                    label: sound,
                });
                soundManager.playSound(sound);
                addRecording(sound);
                let current_gesture = document.getElementById('current_gesture') as HTMLOutputElement;
                current_gesture.innerText = "🥁 ✅";
            }
        }
    }

    /**
     * Function to handle play/pause based on detected gestures (Closed_Fist)
     */
    const handlePlayPause = () => {
        if (waveform && model.runPlayPause()) {
            waveform.playPause();
        }
    }

    /**
     * Function to handle audio effects based on detected gestures (Thumb_Up)
     */
    const handleEffects = (handedness: string, landmarks: any) => {
        let speedText = model.getSpeedText(landmarks, handedness);
        if (speedText) {
            let current_gesture = document.getElementById('current_gesture') as HTMLOutputElement;
            current_gesture.innerText = speedText;
            waveform?.setPlaybackRate(soundManager.getSpeedValue());
        }
    }

    /**
     * Function to handle waveform regions based on detected gestures (creation and deletion)
     */
    const handleRegions = () => {
        if (waveform) {
            model.handleLoopRegions(waveform.getCurrentTime());
        }
    }

    /**
     * Function to handle volume control based on the gesture detected
     */
    const handleVolume = (landmarks: any) => {
        if (model.isVolumeStarted()) {
            let currentVolume: number = 1 - landmarks[8].x;
            setVolume(Math.min(100, parseFloat((currentVolume * 100).toFixed(0))));
            setIsVolumeVisible(true);
            waveform?.setVolume(currentVolume);

            //To let finish the Timeout only when the the user changes gesture
            if (volumeTimer != null) {
                clearTimeout(volumeTimer);
            }
            volumeTimer = setTimeout(() => {
                setIsVolumeVisible(false);
                volumeTimer = null;
            }, 3000);
        }
    }

    return (
        <>
            <div style={{ marginTop: "20px" }}>
                <p id='current_gesture' className="currGesture">🙌</p>
                <p className="tooltipGesture">Current gesture</p>
            </div>
            <div className="volumeProgressBar" style={{ display: isVolumeVisible ? "block" : "none" }}>
                <VolumeProgressBar volume={volume}></VolumeProgressBar>
            </div>
            <div>
                <canvas className="output_canvas" id="output_canvas" width="1280" height="720" />
            </div>
        </>
    );
};

export default GestureComponent;