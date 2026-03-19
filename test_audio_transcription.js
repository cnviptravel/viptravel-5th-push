// Test script for audio transcription endpoint
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple test HTML file to test the audio recording
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Transcription Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 20px;
        }
        .button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #45a049;
        }
        .button.recording {
            background: #f44336;
        }
        .button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        .status {
            margin: 20px 0;
            padding: 15px;
            border-radius: 5px;
            background: #f0f0f0;
        }
        .status.recording {
            background: #ffebee;
            color: #c62828;
        }
        .status.processing {
            background: #fff3e0;
            color: #ef6c00;
        }
        .status.success {
            background: #e8f5e9;
            color: #2e7d32;
        }
        .subtitle {
            margin: 20px 0;
            padding: 15px;
            background: #333;
            color: white;
            border-radius: 5px;
            font-size: 18px;
            text-align: center;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 10px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Audio Transcription Test</h1>
        <p>This tests the real-time audio transcription and translation feature.</p>
        
        <div>
            <button id="startBtn" class="button">Start Recording</button>
            <button id="stopBtn" class="button" disabled>Stop Recording</button>
            <button id="testBtn" class="button">Test API Endpoint</button>
        </div>
        
        <div id="status" class="status">
            Ready to record audio...
        </div>
        
        <div class="subtitle" id="subtitle">
            Subtitles will appear here...
        </div>
        
        <div id="results"></div>
    </div>

    <script>
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;
        const backendUrl = 'https://viptravel-backend.erdneebatulzii23.workers.dev';
        
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        const testBtn = document.getElementById('testBtn');
        const statusDiv = document.getElementById('status');
        const subtitleDiv = document.getElementById('subtitle');
        const resultsDiv = document.getElementById('results');
        
        async function startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunks.push(event.data);
                    }
                };
                
                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    await processAudio(audioBlob);
                    
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start(3000); // Send chunks every 3 seconds
                isRecording = true;
                
                startBtn.disabled = true;
                stopBtn.disabled = false;
                statusDiv.textContent = 'Recording... Speak now!';
                statusDiv.className = 'status recording';
                subtitleDiv.textContent = 'Listening...';
                
            } catch (error) {
                console.error('Error accessing microphone:', error);
                statusDiv.textContent = 'Error accessing microphone: ' + error.message;
                statusDiv.className = 'status error';
            }
        }
        
        function stopRecording() {
            if (mediaRecorder && isRecording) {
                mediaRecorder.stop();
                isRecording = false;
                
                startBtn.disabled = false;
                stopBtn.disabled = true;
                statusDiv.textContent = 'Processing audio...';
                statusDiv.className = 'status processing';
            }
        }
        
        async function processAudio(audioBlob) {
            try {
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');
                formData.append('targetLang', 'en');
                formData.append('channel', 'test-channel');
                formData.append('userId', 'test-user');
                
                subtitleDiv.innerHTML = '<div class="loading"></div> Processing...';
                
                const response = await fetch(backendUrl + '/transcribe', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('API request failed: ' + response.status);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    statusDiv.textContent = 'Transcription successful!';
                    statusDiv.className = 'status success';
                    
                    subtitleDiv.textContent = result.translated || result.transcribed;
                    
                    // Display results
                    resultsDiv.innerHTML = \`
                        <h3>Results:</h3>
                        <p><strong>Original:</strong> \${result.transcribed}</p>
                        <p><strong>Translated:</strong> \${result.translated}</p>
                        <p><strong>Language:</strong> \${result.language}</p>
                    \`;
                } else {
                    throw new Error(result.error || 'Transcription failed');
                }
                
            } catch (error) {
                console.error('Error processing audio:', error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status error';
                subtitleDiv.textContent = 'Error occurred';
            }
        }
        
        async function testApiEndpoint() {
            try {
                statusDiv.textContent = 'Testing API endpoint...';
                statusDiv.className = 'status processing';
                
                const response = await fetch(backendUrl + '/transcribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                });
                
                const text = await response.text();
                
                if (response.status === 400) {
                    statusDiv.textContent = 'API endpoint is working (correctly rejected invalid request)';
                    statusDiv.className = 'status success';
                    resultsDiv.innerHTML = \`<p>Response: \${text}</p>\`;
                } else {
                    statusDiv.textContent = \`API responded with status: \${response.status}\`;
                    statusDiv.className = 'status success';
                    resultsDiv.innerHTML = \`<p>Response: \${text}</p>\`;
                }
                
            } catch (error) {
                console.error('Error testing API:', error);
                statusDiv.textContent = 'Error testing API: ' + error.message;
                statusDiv.className = 'status error';
            }
        }
        
        startBtn.addEventListener('click', startRecording);
        stopBtn.addEventListener('click', stopRecording);
        testBtn.addEventListener('click', testApiEndpoint);
        
        // Check if browser supports MediaRecorder
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            statusDiv.textContent = 'Your browser does not support audio recording. Please use Chrome, Firefox, or Edge.';
            statusDiv.className = 'status error';
            startBtn.disabled = true;
        }
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'test_audio.html'), htmlContent);
console.log('Test HTML file created: test_audio.html');
console.log('Open this file in a browser to test the audio transcription feature.');
console.log('Backend URL: https://viptravel-backend.erdneebatulzii23.workers.dev');