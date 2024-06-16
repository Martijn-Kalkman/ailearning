    import kNear from './kNear.js';

    // Data from the index.html
    let video = document.getElementById('video');
    let canvasCtx = canvasElement.getContext('2d');
    let scoreText = document.getElementById('score');
    let roundText = document.getElementById('round');
    let timerText = document.getElementById('timer');


    //  Setup
    let k = 3;
    let kNearClassifier = new kNear(k);

    let score = 0;
    let round = 1;
    let isRecording = false;
    let timer = null;
    let time = 10; 
    let currentTargetGesture = null;
    let recordedData = [];

    // All the signs for the game
    const signs = ['duim omhoog', 'duim omlaag', 'hand', 'oke', 'middlefinger', 'peace', 'vuist'];


    // Laden van de sings uit de signs.json
    async function loadSign() {
        try {
            const response = await fetch('signs.json');
            const data = await response.json();

            data.forEach(item => {
                if (item.landmarks.length === 63) {
                    kNearClassifier.learn(item.landmarks, item.name);
                    console.log(`sign: ${item.name} geladen`);
                } else {
                    console.error(`geen goede lengte voor: ${item.name}. verwacht er 63 maar geeft ${item.landmarks.length}`);
                }
            });

        } catch (error) {
            console.error(error);
        }
    }

    async function main() {
        // await setupCamera(); 
        await loadSign();

        // video.play();
        startVideoProcessing();
    }

    async function startVideoProcessing() {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        const camera = new Camera(video, {
            onFrame: async () => {
                await hands.send({ image: video });
            },
            width: 640,
            height: 480
        });

        camera.start();
    }

    function onResults(results) {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
                drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });

                let flatLandmarks = landmarks.flatMap(lm => [lm.x, lm.y, lm.z]);

                let name = kNearClassifier.classify(flatLandmarks);
                predictedGesture.textContent = `Predicted Gesture: ${name}`;

                if (name === currentTargetGesture) {
                    score += 10; // Increment score
                    clearInterval(timer); // Stop timer
                    nextRound(); // Start next round
                }

                if (isRecording) {
                    recordedData.push(flatLandmarks);
                }
            }
        }
    }

    function startGame() {
        score = 0;
        round = 1;
        nextRound();
    }

    function nextRound() {
        currentTargetGesture = signs[Math.floor(Math.random() * signs.length)];
        targetGesture.textContent = `Maak gebaar: ${currentTargetGesture}`;
        scoreText.textContent = `Score: ${score}`;
        
        let timeLeft = time - Math.floor((round - 1) / 10); // Decrease time every 10 rounds
        timeLeft = Math.max(timeLeft, 3); // Ensure at least 3 seconds

        roundText.textContent = `Ronde: ${round}`;
        timerText.textContent = `Tijd: ${timeLeft}s`;

        timer = setInterval(() => {
            timeLeft--;
            timerText.textContent = `Tijd over: ${timeLeft}s`;

            if (timeLeft <= 0) {
                clearInterval(timer);
                alert(`Tijd is op!, scorde: ${score}`);
                startGame();
            }
        }, 1000);

        round++;
    }

    // Event listeners for game control and gesture recording
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('startGame').addEventListener('click', startGame);
        
        document.getElementById('startRecord').addEventListener('click', () => {
            isRecording = true;
            recordedData = [];
        });

        document.getElementById('stopRecord').addEventListener('click', () => {
            isRecording = false;
            const gestureName = prompt('Enter gesture name:');
            if (gestureName && recordedData.length > 0) {
                let averageLandmarks = Array(recordedData[0].length).fill(0);
        
                recordedData.forEach(landmarks => {
                    landmarks.forEach((value, index) => {
                        averageLandmarks[index] += value;
                    });
                });
        
                averageLandmarks = averageLandmarks.map(value => value / recordedData.length);
                kNearClassifier.learn(averageLandmarks, gestureName);
        
                let gestureItem = document.createElement('div');
                gestureItem.textContent = `Gesture: ${gestureName}, Coordinates: ${averageLandmarks}`;
                document.getElementById('signs').appendChild(gestureItem);
            }
        });
        
    });

    main();
