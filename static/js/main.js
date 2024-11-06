document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // State management
    let state = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        isRecording: false,
        timeRemaining: 0,
        recognition: null,
        timer: null
    };

    // DOM Elements
    const screens = {
        stage: document.getElementById('stageSelection'),
        time: document.getElementById('timeSelection'),
        ready: document.getElementById('readyScreen'),
        recording: document.getElementById('recordingScreen')
    };

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme based on system preference
    if (prefersDark) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-theme', themeToggle.checked ? 'dark' : 'light');
    });

    // Stage Selection
    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.stage-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            button.classList.add('active');
            
            state.selectedStage = button.dataset.value;
            showScreen('time');
        });
    });

    // Time Selection
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            state.selectedTime = parseInt(button.dataset.value);
            state.timeRemaining = state.selectedTime * 60;
            showScreen('ready');
        });
    });

    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', handleBack);
    });

    // Start Button
    document.getElementById('startBtn').addEventListener('click', () => {
        showScreen('recording');
        startRecording();
    });

    // Reset Buttons
    document.getElementById('resetBtn').addEventListener('click', resetSession);
    document.getElementById('resetSessionBtn').addEventListener('click', resetSession);

    // Record Button
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);

    // Feedback Button
    document.getElementById('feedbackBtn').addEventListener('click', generateFeedback);

    function showTimeOptions() {
        const timeButtons = document.querySelectorAll('.time-btn');
        timeButtons.forEach(button => {
            const timeValue = button.dataset.value;
            if (state.selectedStage === 'elevator') {
                // For elevator pitch, only show 1 and 5 minutes
                button.classList.toggle('hidden', !['1', '5'].includes(timeValue));
            } else {
                // For other pitches, hide 1 minute option
                button.classList.toggle('hidden', timeValue === '1');
            }
        });
    }

    function showScreen(screenName) {
        state.currentStep = screenName;
        Object.entries(screens).forEach(([name, element]) => {
            element.classList.toggle('hidden', name !== screenName);
        });

        // Update time options when showing time screen
        if (screenName === 'time') {
            showTimeOptions();
        }
    }

    function handleBack() {
        switch (state.currentStep) {
            case 'time':
                showScreen('stage');
                break;
            case 'ready':
                showScreen('time');
                break;
            case 'recording':
                showScreen('ready');
                if (state.isRecording) {
                    stopRecording();
                }
                break;
        }
    }

    function startRecording() {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser');
            return;
        }

        state.recognition = new webkitSpeechRecognition();
        state.recognition.continuous = true;
        state.recognition.interimResults = true;

        state.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join(' ');
            
            document.getElementById('transcript').textContent = transcript;
        };

        state.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            stopRecording();
        };

        state.recognition.onend = () => {
            if (state.isRecording) {
                state.recognition.start();
            }
        };

        state.recognition.start();
        state.isRecording = true;
        updateRecordingUI();
        startTimer();
    }

    function stopRecording() {
        if (state.recognition) {
            state.recognition.stop();
        }
        state.isRecording = false;
        updateRecordingUI();
        stopTimer();
    }

    function toggleRecording() {
        if (state.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function updateRecordingUI() {
        const recordBtn = document.getElementById('recordBtn');
        const statusText = document.querySelector('.recording-status');
        
        if (state.isRecording) {
            recordBtn.innerHTML = feather.icons['mic-off'].toSvg();
            statusText.textContent = 'Click to stop recording';
            recordBtn.classList.add('recording');
        } else {
            recordBtn.innerHTML = feather.icons.mic.toSvg();
            statusText.textContent = 'Click to start recording';
            recordBtn.classList.remove('recording');
        }
        feather.replace();
    }

    function startTimer() {
        if (state.timer) clearInterval(state.timer);
        updateTimerDisplay();
        state.timer = setInterval(() => {
            if (state.timeRemaining > 0) {
                state.timeRemaining--;
                updateTimerDisplay();
            } else {
                stopRecording();
            }
        }, 1000);
    }

    function stopTimer() {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        document.getElementById('timeDisplay').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    function generateFeedback() {
        // Stop recording first
        if (state.isRecording) {
            stopRecording();
        }
        
        const transcript = document.getElementById('transcript').textContent;
        if (!transcript) {
            alert('Please record your pitch first!');
            return;
        }

        const mockFeedback = [
            "Great introduction! You clearly stated the problem your startup is solving.",
            "Consider providing more specific details about your target market.",
            "Your explanation of the revenue model was clear and concise.",
            "Try to speak a bit slower when discussing technical aspects.",
            "Good job highlighting your team's expertise and experience."
        ];

        const feedbackContainer = document.getElementById('feedbackContainer');
        const feedbackList = document.getElementById('feedbackList');
        feedbackList.innerHTML = mockFeedback
            .map(feedback => `<li>${feedback}</li>`)
            .join('');
        feedbackContainer.classList.remove('hidden');
    }

    function resetSession() {
        state = {
            currentStep: 'stage',
            selectedStage: '',
            selectedTime: '',
            isRecording: false,
            timeRemaining: 0,
            recognition: null,
            timer: null
        };
        if (state.isRecording) {
            stopRecording();
        }
        document.getElementById('transcript').textContent = '';
        document.getElementById('feedbackContainer').classList.add('hidden');
        showScreen('stage');
    }
});
