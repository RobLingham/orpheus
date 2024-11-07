// Initialize global state and Speech Recognition
let recognition = null;

// Initialize state object
window.pitchPracticeState = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    selectedPitchType: '',
    isRecording: false,
    timeRemaining: 0,
    incrementTimeRemaining: 0,
    recognition: null,
    timer: null,
    incrementTimer: null
};

// Initialize theme
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'dark';
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', function() {
            if (window.pitchPracticeState.isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedStage = button.dataset.value;
            button.classList.add('active');
            showScreen('time');
        });
    });

    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedTime = button.dataset.value;
            button.classList.add('active');
            showScreen('pitchType');
        });
    });

    document.querySelectorAll('.pitch-type-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedPitchType = button.dataset.value;
            button.classList.add('active');
            showScreen('ready');
        });
    });

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', handleStart);
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }

    const backBtns = document.querySelectorAll('.back-btn');
    backBtns.forEach(btn => {
        btn.addEventListener('click', goBack);
    });

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            if (window.pitchPracticeState.selectedPitchType === 'qa' && 
                window.pitchPracticeState.timeRemaining > 0) {
                generateQuestion();
            } else {
                generateFeedback();
            }
        });
    }

    const continuePitchBtn = document.getElementById('continuePitchBtn');
    if (continuePitchBtn) {
        continuePitchBtn.addEventListener('click', continuePitch);
    }

    // Initialize Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
});

// Functions related to pitch practice goes here...

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function showScreen(screenName) {
    // ...rest of the showScreen function
}

function updateTimerDisplay() {
    // ...rest of the updateTimerDisplay function
}

// [Rest of the original code goes here without changes...]

// Keep all existing functions from the original code
// ...