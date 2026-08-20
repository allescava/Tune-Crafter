import { AudioManager } from "./AudioManager";
import RecordingModel from "./models/RecordingModel";

export type ChannelPhase = "empty" | "recording" | "playing";

export interface Channel {
    id: number;
    recordings: RecordingModel[];
    phase: ChannelPhase;
    loopDurationSeconds: number;
}

interface ChannelLoopState {
    anchor: number; // AudioContext time of the loop's first iteration, used to compute progress
    nextIterationTime: number;
    timerId: number | null;
}

const SCHEDULE_AHEAD_TIME = 0.1; // seconds of lookahead scheduled on each pass
const LOOKAHEAD_MS = 25; // how often each channel's scheduler wakes up

/**
 * Free-running, per-channel looper: there is no shared metronome/bar clock anymore. Each channel
 * is manually started/stopped by the user (Enter key or Record button), and whatever duration
 * elapsed between start and stop becomes that channel's own loop length. Every "playing" channel
 * loops independently and all of them can overlap and play in parallel.
 */
export class MetronomeManager {
    private audioManager: AudioManager;
    private channels: Channel[] = [];
    private nextChannelId: number = 1;
    private selectedChannelId: number | null = null;
    private recordingChannelId: number | null = null;
    private recordingStartTime: number = 0;
    private loopStates: Map<number, ChannelLoopState> = new Map();
    private listeners: Array<() => void> = [];

    constructor(audioManager: AudioManager) {
        this.audioManager = audioManager;
        const firstChannel = this.createChannel();
        this.channels.push(firstChannel);
        this.selectedChannelId = firstChannel.id;
    }

    addListener(listener: () => void) {
        this.listeners.push(listener);
    }

    removeListener(listener: () => void) {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    private fireListeners() {
        this.listeners.forEach((listener) => listener());
    }

    private createChannel(): Channel {
        return { id: this.nextChannelId++, recordings: [], phase: "empty", loopDurationSeconds: 0 };
    }

    // Adds a new, empty channel that the user can later select and record into
    addChannel(): void {
        const channel = this.createChannel();
        this.channels.push(channel);
        if (this.selectedChannelId === null) {
            this.selectedChannelId = channel.id;
        }
        this.fireListeners();
    }

    getChannels(): Channel[] {
        return this.channels;
    }

    selectChannel(channelId: number): void {
        this.selectedChannelId = channelId;
        this.fireListeners();
    }

    getSelectedChannelId(): number | null {
        return this.selectedChannelId;
    }

    getRecordingChannelId(): number | null {
        return this.recordingChannelId;
    }

    // Starts recording on this channel if nothing else is recording, or stops it if it's the one currently recording
    toggleRecording(channelId: number): void {
        this.selectedChannelId = channelId;
        if (this.recordingChannelId === channelId) {
            this.stopRecording();
        } else if (this.recordingChannelId === null) {
            this.startRecording(channelId);
        }
        this.fireListeners();
    }

    private startRecording(channelId: number): void {
        const channel = this.channels.find((c) => c.id === channelId);
        if (!channel) {
            return;
        }
        this.stopChannelLoop(channelId);
        channel.recordings = [];
        channel.phase = "recording";
        channel.loopDurationSeconds = 0;
        this.recordingChannelId = channelId;
        this.recordingStartTime = this.audioManager.getAudioContext().currentTime;
    }

    private stopRecording(): void {
        const channelId = this.recordingChannelId;
        if (channelId === null) {
            return;
        }
        const channel = this.channels.find((c) => c.id === channelId);
        this.recordingChannelId = null;
        if (!channel) {
            return;
        }
        const audioContext = this.audioManager.getAudioContext();
        const duration = audioContext.currentTime - this.recordingStartTime;
        channel.loopDurationSeconds = Math.max(duration, 0.05);
        channel.phase = "playing";
        this.startChannelLoop(channel);
    }

    // Called by the gesture/keyboard handlers whenever a left-hand sound is played; ignored unless a channel is recording
    registerHit(sound: string): void {
        if (this.recordingChannelId === null) {
            return;
        }
        const channel = this.channels.find((c) => c.id === this.recordingChannelId);
        if (!channel) {
            return;
        }
        const audioContext = this.audioManager.getAudioContext();
        const offset = audioContext.currentTime - this.recordingStartTime;
        channel.recordings.push(new RecordingModel(sound, offset));
        this.fireListeners();
    }

    // Clears a single channel and stops its loop, if any
    clearChannel(channelId: number): void {
        const channel = this.channels.find((c) => c.id === channelId);
        if (!channel) {
            return;
        }
        this.stopChannelLoop(channelId);
        channel.recordings = [];
        channel.phase = "empty";
        channel.loopDurationSeconds = 0;
        if (this.recordingChannelId === channelId) {
            this.recordingChannelId = null;
        }
        this.fireListeners();
    }

    // Removes a channel entirely (only while it's not the one currently recording); always keeps at least one channel around
    removeChannel(channelId: number): void {
        if (this.recordingChannelId === channelId || this.channels.length <= 1) {
            return;
        }
        this.stopChannelLoop(channelId);
        this.channels = this.channels.filter((c) => c.id !== channelId);
        if (this.selectedChannelId === channelId) {
            this.selectedChannelId = this.channels[0]?.id ?? null;
        }
        this.fireListeners();
    }

    // Fraction (0-1) of the channel's own loop elapsed, only meaningful while it's playing
    getChannelProgress(channelId: number): number {
        const channel = this.channels.find((c) => c.id === channelId);
        const loopState = this.loopStates.get(channelId);
        if (!channel || !loopState || channel.phase !== "playing" || channel.loopDurationSeconds <= 0) {
            return 0;
        }
        const audioContext = this.audioManager.getAudioContext();
        const elapsed = audioContext.currentTime - loopState.anchor;
        if (elapsed < 0) {
            return 0;
        }
        return (elapsed % channel.loopDurationSeconds) / channel.loopDurationSeconds;
    }

    getRecordingElapsedSeconds(): number {
        if (this.recordingChannelId === null) {
            return 0;
        }
        const audioContext = this.audioManager.getAudioContext();
        return Math.max(0, audioContext.currentTime - this.recordingStartTime);
    }

    // Starts this channel's own independent lookahead scheduler, looping every loopDurationSeconds
    private startChannelLoop(channel: Channel): void {
        const audioContext = this.audioManager.getAudioContext();
        const loopState: ChannelLoopState = {
            anchor: audioContext.currentTime + 0.05,
            nextIterationTime: audioContext.currentTime + 0.05,
            timerId: null,
        };
        this.loopStates.set(channel.id, loopState);

        const scheduler = () => {
            const ctx = this.audioManager.getAudioContext();
            while (loopState.nextIterationTime < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
                this.scheduleChannelIteration(channel, loopState.nextIterationTime);
                loopState.nextIterationTime += channel.loopDurationSeconds;
            }
            loopState.timerId = window.setTimeout(scheduler, LOOKAHEAD_MS);
        };
        scheduler();
    }

    private scheduleChannelIteration(channel: Channel, iterationStartTime: number): void {
        channel.recordings.forEach((recording) => {
            this.audioManager.playSoundAt(recording.sound, iterationStartTime + recording.time);
        });
    }

    private stopChannelLoop(channelId: number): void {
        const loopState = this.loopStates.get(channelId);
        if (loopState && loopState.timerId !== null) {
            window.clearTimeout(loopState.timerId);
        }
        this.loopStates.delete(channelId);
    }
}
