import React, { useState, useEffect, useRef } from 'react';

const RecordingButton: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [chartItems, setChartItems] = useState<number[]>([]);
    const chartIndex = useRef(0); // Ref to keep track of the index for looping

    let interval: NodeJS.Timeout | null = null;
    const [currentTime, setCurrentTime] = useState<number | null>(null); // State to hold the current time

    useEffect(() => {
        if (isActive) {
            interval = setInterval(() => {
                console.log('Current time: ' + currentTime);
                setCurrentTime(prevTime => (prevTime === null ? 0 : prevTime + 100)); // Increment by 100 milliseconds
            }, 100); // Update every 100 milliseconds
        } else {
            clearInterval(interval!);
        }

        return () => clearInterval(interval!);
    }, [isActive]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setCurrentTime(null);
        setIsActive(false);
    };

    const addItemToChart = () => {
        setChartItems(prevItems => [...prevItems, currentTime !== null ? currentTime : 0]); // Add current time or 0 if null
    };

    const loopRecording = () => {
        setCurrentTime(null); // Reset the current time
        if (chartItems.length === 0) return;

        // setIsActive(true); // Start the timer
        chartIndex.current = 0; // Reset the index for looping
        console.log('Looping recording... ' + chartItems.length + ' items ' + chartItems.join(', ') + ' milliseconds');

        interval = setInterval(() => {
            if (chartIndex.current < chartItems.length) {
                // Check if the current time matches the recorded time
                setCurrentTime(prevTime => {
                    prevTime = prevTime === null ? 0 : prevTime + 100;
                    console.log('Current time: ' + prevTime + ' ms, Chart time: ' + chartItems[chartIndex.current] + ' ms');
                    if (prevTime !== null && prevTime >= chartItems[chartIndex.current]) {
                        console.log(currentTime); // Print the time on the console
                        chartIndex.current++; // Move to the next recorded time
                    }
                    return prevTime;
                }); // Increment by 100 milliseconds
            } else {
                // If all clicks are replayed, reset the timer and start looping again
                clearInterval(interval!);
                setCurrentTime(0);
                setIsActive(false);
                setTimeout(loopRecording, 1000); // Wait 1 second before starting the loop again
            }
        }, 100);
    };

    return (
        <div>
            <h1>Timer: {currentTime !== null ? currentTime + ' milliseconds' : '0 milliseconds'}</h1>
            <button onClick={toggleTimer}>{isActive ? 'Pause' : 'Start'}</button>
            <button onClick={resetTimer}>Reset</button>
            <button onClick={addItemToChart}>Add to Chart</button>
            <button onClick={loopRecording}>Loop</button>
            <div>
                <h2>Chart Items:</h2>
                <ul>
                    {chartItems.map((item, index) => (
                        <li key={index}>{item} milliseconds</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default RecordingButton;
