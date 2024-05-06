import React, { useState, useRef, useEffect } from "react";
import RecordingsListModel from "../models/RecordingsListModel";
import RecordingModel from "../models/RecordingModel";



const RecordingButton = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [time, setTime] = useState(0);
    let timeInterval: any = useRef(null);

    const [recordsList, setRecordingList] = useState(new RecordingsListModel());
    const [indexPlayingSound, setIndexPlayingSound] = useState(0);

    const toggleRecording = () => {
        if (!isRecording) {
            reset();
            timeInterval.current = setInterval(() => { setTime(prev => prev + 1); }, 10);
        } else {
            clearInterval(timeInterval.current);
            recordsList.addRecording(new RecordingModel('end', time));
            setRecordingList(recordsList);
            console.log(recordsList);
        }
        setIsRecording(!isRecording);
    };

    const reset = () => {
        setTime(0);
        clearInterval(timeInterval.current);
        recordsList.clearRecordingList();
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60000)
            .toString()
            .padStart(2, "0");
        const seconds = Math.floor((time / 100) % 60)
            .toString()
            .padStart(2, "0");
        const milliseconds = (time % 100).toString().padStart(2, "0");

        return { minutes, seconds, milliseconds };
    };


    const addRecord = () => {
        if (isRecording) {
            recordsList.addRecording(new RecordingModel("clap", time))
            setRecordingList(recordsList);
            console.log(recordsList);
        }
    }

    useEffect(() => { }, [time]);

    const loop = () => {
        setIsLooping(true);
        setTime(0);
        clearInterval(timeInterval.current);
        console.log(recordsList);
        let index = 0;
        timeInterval.current = setInterval(() => {
            setTime(prev => prev + 1);
            let timeToCheck = recordsList.recordingAt(index)?.time;
            console.log("Index Playing sound: " + index);
            console.log("Times: " + time + " and " + timeToCheck);
            let p = document.getElementById("sounds");
            if (timeToCheck && time >= timeToCheck) {
                if (recordsList.recordingAt(index)?.sound == 'end') {
                    setIndexPlayingSound(0);
                    setTime(0);
                    if (p) {
                        p.innerHTML = "";
                    }
                } else {
                    let { minutes, seconds, milliseconds } = formatTime(time);
                    if (p) {
                        p.innerHTML += "<br>" + { minutes } + ":" + { seconds } + ":" + { milliseconds } + ": " + recordsList.recordingAt(indexPlayingSound)?.sound;
                    }
                    index++;
                }
            }
        }, 10);
    }

    const stopLoop = () => {
        setIsLooping(false);
        setTime(0);
        clearInterval(timeInterval.current);
    }

    const { minutes, seconds, milliseconds } = formatTime(time);

    return (
        <div className="recordingButton">
            <div className="col">
                <button className={"btn " + (isRecording ? "btn-danger" : "btn-primary")} onClick={toggleRecording}>
                    {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
                <button className={"btn " + (isRecording ? "btn-info" : "btn-secondary")} onClick={addRecord}>Add Sound</button>
            </div>
            <div className="col">
                {!isRecording && !recordsList.isEmpty() ? <button className="btn btn-success" onClick={loop}>Loop</button> : ""}
                {isLooping ? <button className="btn btn-danger" onClick={stopLoop}>Stop Loop</button> : ""}
            </div>
            <p className="text-white">
                {minutes}:
                {seconds}:
                {milliseconds}
            </p>
            <p id="sounds"></p>
        </div>
    );
};

export default RecordingButton;
