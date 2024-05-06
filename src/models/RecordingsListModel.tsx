import RecordingModel from "./RecordingModel";

class RecordingsListModel {
    recordingsList: RecordingModel[] = [];

    constructor() { }

    addRecording(recording: RecordingModel) {
        this.recordingsList.push(recording);
    }

    getRecordingList() {
        return this.recordingsList;
    }

    clearRecordingList() {
        this.recordingsList = [];
    }

    isEmpty() {
        return !(this.recordingsList.length > 1);
    }

    lenght() {
        return this.recordingsList.length;
    }

    recordingAt(index: number) {
        return this.recordingsList.at(index);
    }
}

export default RecordingsListModel;