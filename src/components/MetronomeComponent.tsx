import React, { useEffect, useState } from "react";
import { MetronomeManager } from "../MetronomeManager";
import { AudioManager } from "../AudioManager";

interface MetronomeComponentProps {
    metronomeManager: MetronomeManager;
    audioManager: AudioManager;
}

const MetronomeComponent: React.FC<MetronomeComponentProps> = ({ metronomeManager, audioManager }) => {
    const [, setTick] = useState(0);
    const [progressByChannel, setProgressByChannel] = useState<{ [id: number]: number }>({});
    const [pianoToneIndex, setPianoToneIndex] = useState(audioManager.getPianoToneIndex());

    // Re-render whenever the metronome's internal state changes (channels, selection, recording, ...)
    useEffect(() => {
        const listener = () => setTick((n) => n + 1);
        metronomeManager.addListener(listener);
        return () => metronomeManager.removeListener(listener);
    }, [metronomeManager]);

    const recordingChannelId = metronomeManager.getRecordingChannelId();
    const selectedChannelId = metronomeManager.getSelectedChannelId();
    const channels = metronomeManager.getChannels();
    const pianoToneOptions = audioManager.getPianoToneOptions();

    // Poll every frame to animate the recording timer / each playing channel's loop progress
    useEffect(() => {
        let rafId: number;
        const update = () => {
            const next: { [id: number]: number } = {};
            channels.forEach((channel) => {
                if (channel.phase === "playing") {
                    next[channel.id] = metronomeManager.getChannelProgress(channel.id);
                } else if (channel.phase === "recording") {
                    next[channel.id] = metronomeManager.getRecordingElapsedSeconds();
                }
            });
            setProgressByChannel(next);
            rafId = requestAnimationFrame(update);
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [channels, metronomeManager]);

    // Enter starts/stops recording on whichever channel is currently selected
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" || event.repeat) {
                return;
            }
            const target = event.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
                return;
            }
            const currentSelectedId = metronomeManager.getSelectedChannelId();
            if (currentSelectedId !== null) {
                event.preventDefault();
                metronomeManager.toggleRecording(currentSelectedId);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [metronomeManager]);

    const getChannelStatusText = (phase: string, channelId: number) => {
        switch (phase) {
            case "empty":
                return "Empty";
            case "recording":
                return "🔴 Recording... " + (progressByChannel[channelId] ?? 0).toFixed(1) + "s (Enter to stop)";
            case "playing":
                return "🔁 Looping";
            default:
                return "";
        }
    };

    return (
        <div className="metronomeComponent text-center" style={{ color: "white" }}>
            <div style={{ marginBottom: "12px" }}>
                <label htmlFor="pianoTone">Piano range: </label>
                <select
                    id="pianoTone"
                    value={pianoToneIndex}
                    onChange={(event) => {
                        const nextIndex = parseInt(event.target.value, 10);
                        setPianoToneIndex(nextIndex);
                        audioManager.setPianoToneIndex(nextIndex);
                    }}
                    style={{ marginLeft: "6px" }}
                >
                    {pianoToneOptions.map((tone, index) => (
                        <option key={tone.label} value={index}>{tone.label}</option>
                    ))}
                </select>
            </div>
            <p style={{ fontSize: "12px", marginBottom: "5px" }}>Select a channel, press Enter to start recording, Enter again to stop and loop it</p>
            <div style={{ marginTop: "10px" }}>
                {channels.map((channel, index) => (
                    <div
                        key={channel.id}
                        className="d-flex align-items-center justify-content-center m-1"
                        style={{
                            gap: "8px",
                            cursor: "pointer",
                            padding: "4px",
                            borderRadius: "4px",
                            background: selectedChannelId === channel.id ? "#ffffff22" : "transparent",
                        }}
                        onClick={() => metronomeManager.selectChannel(channel.id)}
                    >
                        <span style={{ minWidth: "90px" }}>{selectedChannelId === channel.id ? "▶ " : ""}Channel {index + 1}</span>
                        <span style={{ fontSize: "12px", minWidth: "200px" }}>{getChannelStatusText(channel.phase, channel.id)}</span>
                        {channel.phase === "playing" && (
                            <div style={{ width: "80px", height: "6px", background: "#ffffff33", borderRadius: "3px", overflow: "hidden" }}>
                                <div style={{ width: ((progressByChannel[channel.id] ?? 0) * 100) + "%", height: "100%", background: "#7ce07c" }} />
                            </div>
                        )}
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={(event) => { event.stopPropagation(); metronomeManager.toggleRecording(channel.id); }}
                            disabled={recordingChannelId !== null && recordingChannelId !== channel.id}
                        >
                            {recordingChannelId === channel.id ? "⏹️ Stop" : "🎙️ Record"}
                        </button>
                        <button
                            className="btn btn-outline-light btn-sm"
                            onClick={(event) => { event.stopPropagation(); metronomeManager.clearChannel(channel.id); }}
                            disabled={channel.phase === "empty" || channel.phase === "recording"}
                        >
                            🗑️ Clear
                        </button>
                        <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={(event) => { event.stopPropagation(); metronomeManager.removeChannel(channel.id); }}
                            disabled={channel.phase !== "empty" || channels.length <= 1}
                            title="Only unused (empty) channels can be deleted"
                        >
                            ❌ Delete
                        </button>
                    </div>
                ))}
            </div>
            <button className="btn btn-outline-light m-1" onClick={() => metronomeManager.addChannel()}>
                ➕ Add Channel
            </button>
        </div>
    );
};

export default MetronomeComponent;


