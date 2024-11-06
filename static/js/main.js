// Global utility functions
function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.querySelector('.recording-status');
    
    if (window.pitchPracticeState.isRecording) {
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
    const state = window.pitchPracticeState;
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
    const state = window.pitchPracticeState;
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
}

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const minutes = Math.floor(state.timeRemaining / 60);
    const seconds = state.timeRemaining % 60;
    document.getElementById('timeDisplay').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimeOptions() {
    const timeButtons = document.querySelectorAll('.time-btn');
    const isElevator = window.pitchPracticeState.selectedStage === 'elevator';
    
    timeButtons.forEach(btn => {
        const value = parseInt(btn.dataset.value);
        if (isElevator) {
            btn.style.display = (value === 1 || value === 5) ? '' : 'none';
        } else {
            btn.style.display = value === 1 ? 'none' : '';
        }
    });
}

// Initialize global state
window.pitchPracticeState = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    selectedPitchType: '', // Added new state property
    isRecording: false,
    timeRemaining: 0,
    recognition: null,
    timer: null
};

// Global recording functions
function startRecording() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition is not supported in your browser');
        return;
    }

    const state = window.pitchPracticeState;
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
    const state = window.pitchPracticeState;
    if (state.recognition) {
        state.recognition.stop();
    }
    state.isRecording = false;
    updateRecordingUI();
    stopTimer();
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // DOM Elements
    const screens = {
        stage: document.getElementById('stageSelection'),
        time: document.getElementById('timeSelection'),
        pitchType: document.getElementById('pitchTypeSelection'), // Added new screen
        ready: document.getElementById('readyScreen'),
        recording: document.getElementById('recordingScreen')
    };

    const welcomeHeader = document.querySelector('.card-header');

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
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
            document.querySelectorAll('.stage-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            window.pitchPracticeState.selectedStage = button.dataset.value;
            welcomeHeader.style.display = 'none';
            showScreen('time');
            updateTimeOptions();
        });
    });

    // Time Selection
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            window.pitchPracticeState.selectedTime = parseInt(button.dataset.value);
            window.pitchPracticeState.timeRemaining = window.pitchPracticeState.selectedTime * 60;
            showScreen('pitchType'); // Modified to show pitch type selection
        });
    });

    // Pitch Type Selection
    document.querySelectorAll('.pitch-type-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.pitch-type-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            window.pitchPracticeState.selectedPitchType = button.dataset.value;
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
    });

    // Reset Buttons
    document.getElementById('resetBtn').addEventListener('click', resetSession);
    document.getElementById('resetSessionBtn').addEventListener('click', resetSession);

    // Record Button
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);

    // Feedback Button
    document.getElementById('feedbackBtn').addEventListener('click', generateFeedback);

    function showScreen(screenName) {
        window.pitchPracticeState.currentStep = screenName;
        Object.entries(screens).forEach(([name, element]) => {
            element.classList.toggle('hidden', name !== screenName);
        });
        
        welcomeHeader.style.display = screenName === 'stage' ? 'block' : 'none';
    }

    function handleBack() {
        document.querySelectorAll('.stage-btn, .time-btn, .pitch-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        switch (window.pitchPracticeState.currentStep) {
            case 'time':
                welcomeHeader.style.display = 'block';
                showScreen('stage');
                break;
            case 'pitchType':
                showScreen('time');
                break;
            case 'ready':
                showScreen('pitchType');
                break;
            case 'recording':
                showScreen('ready');
                stopRecording();
                break;
        }
    }

    function toggleRecording() {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function generateFeedback() {
        stopRecording();
        
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
        window.pitchPracticeState = {
            currentStep: 'stage',
            selectedStage: '',
            selectedTime: '',
            selectedPitchType: '',
            isRecording: false,
            timeRemaining: 0,
            recognition: null,
            timer: null
        };
        stopRecording();
        document.getElementById('transcript').textContent = '';
        document.getElementById('feedbackContainer').classList.add('hidden');
        welcomeHeader.style.display = 'block';
        showScreen('stage');
    }
});
