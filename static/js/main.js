// Initialize global state
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

// Global utility functions
function showScreen(screenName) {
    window.pitchPracticeState.currentStep = screenName;
    const screens = {
        stage: document.getElementById('stageSelection'),
        time: document.getElementById('timeSelection'),
        pitchType: document.getElementById('pitchTypeSelection'),
        ready: document.getElementById('readyScreen'),
        recording: document.getElementById('recordingScreen')
    };
    Object.entries(screens).forEach(([name, element]) => {
        if (element) {
            element.classList.toggle('hidden', name !== screenName);
        }
    });
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.querySelector('.recording-status');
    const micIcon = recordBtn.querySelector('i');
    
    if (window.pitchPracticeState.isRecording) {
        micIcon.setAttribute('data-feather', 'mic-off');
        statusText.textContent = 'Click to stop recording';
        recordBtn.classList.add('recording');
    } else {
        micIcon.setAttribute('data-feather', 'mic');
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

async function saveTranscript() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript').textContent;
    
    if (!transcript) {
        return;
    }

    try {
        const response = await fetch('/api/save-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stage: state.selectedStage,
                duration: state.selectedTime * 60,
                transcript: transcript
            })
        });

        const data = await response.json();
        if (data.success) {
            console.log('Transcript saved successfully');
        } else {
            console.error('Failed to save transcript:', data.message);
        }
    } catch (error) {
        console.error('Error saving transcript:', error);
    }
}

// Recording functions
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
    saveTranscript();
}

async function generateFeedback() {
    stopRecording();
    
    const transcript = document.getElementById('transcript').textContent;
    if (!transcript) {
        alert('Please record your pitch first!');
        return;
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    feedbackBtn.disabled = true;
    feedbackBtn.textContent = 'Generating feedback...';

    try {
        const response = await fetch('/api/generate-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript,
                stage: window.pitchPracticeState.selectedStage
            })
        });

        const data = await response.json();
        
        if (data.success) {
            const feedbackContainer = document.getElementById('feedbackContainer');
            const feedbackList = document.getElementById('feedbackList');
            
            let feedbackPoints;
            try {
                feedbackPoints = typeof data.feedback === 'string' ? 
                    JSON.parse(data.feedback) : data.feedback;
            } catch (e) {
                feedbackPoints = {
                    feedback: [data.feedback]
                };
            }

            // Handle both array and object formats
            const feedbackArray = Array.isArray(feedbackPoints) ? 
                feedbackPoints : 
                Object.values(feedbackPoints).flat();

            feedbackList.innerHTML = feedbackArray
                .map(feedback => `<li>${feedback}</li>`)
                .join('');
            feedbackContainer.classList.remove('hidden');
        } else {
            alert('Failed to generate feedback. Please try again.');
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('An error occurred while generating feedback. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.textContent = 'Generate Feedback';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    
    // Set initial state
    themeToggle.checked = document.body.getAttribute('data-theme') === 'dark';
    
    themeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-theme', themeToggle.checked ? 'dark' : 'light');
        localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
    });
    
    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
        themeToggle.checked = savedTheme === 'dark';
    }

    // Stage Selection
    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.stage-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            window.pitchPracticeState.selectedStage = button.dataset.value;
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
            showScreen('pitchType');
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
        button.addEventListener('click', () => {
            switch (window.pitchPracticeState.currentStep) {
                case 'time':
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
        });
    });

    // Start Button
    document.getElementById('startBtn').addEventListener('click', () => {
        showScreen('recording');
    });

    // Reset Buttons
    document.getElementById('resetBtn').addEventListener('click', () => {
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
        showScreen('stage');
    });

    document.getElementById('resetSessionBtn').addEventListener('click', () => {
        stopRecording();
        document.getElementById('transcript').textContent = '';
        document.getElementById('feedbackContainer').classList.add('hidden');
        document.getElementById('timeDisplay').textContent = '0:00';
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
        showScreen('stage');
    });

    // Record Button
    document.getElementById('recordBtn').addEventListener('click', () => {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Feedback Button
    document.getElementById('feedbackBtn').addEventListener('click', generateFeedback);
});
