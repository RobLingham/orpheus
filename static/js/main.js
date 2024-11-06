// Initialize global state and Speech Recognition
let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
}

window.pitchPracticeState = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    selectedPitchType: '',
    isRecording: false,
    timeRemaining: 0,
    timer: null
};

// Global utility functions
function showScreen(screenName) {
    // Clear all active states when changing screens
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
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
    
    if (!micIcon) return;  // Guard clause
    
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
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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
        return false;
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
        return data.success;
    } catch (error) {
        console.error('Error saving transcript:', error);
        return false;
    }
}

function resetSession() {
    // Stop recording if active
    if (window.pitchPracticeState.isRecording) {
        stopRecording();
    }
    
    // Clear timer if active
    if (window.pitchPracticeState.timer) {
        clearInterval(window.pitchPracticeState.timer);
    }
    
    // Reset state
    window.pitchPracticeState = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        selectedPitchType: '',
        isRecording: false,
        timeRemaining: 0,
        timer: null
    };
    
    // Clear UI
    document.getElementById('transcript').textContent = '';
    document.getElementById('feedbackContainer').classList.add('hidden');
    document.getElementById('timeDisplay').textContent = '0:00';
    
    // Reset all buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    showScreen('stage');
}

function startRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser');
        return;
    }

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join(' ');
        
        document.getElementById('transcript').textContent = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            alert('No speech was detected. Please try again.');
        } else {
            alert('An error occurred with speech recognition. Please try again.');
        }
        stopRecording();
    };

    recognition.onend = () => {
        if (window.pitchPracticeState.isRecording) {
            recognition.start();
        }
    };

    try {
        recognition.start();
        window.pitchPracticeState.isRecording = true;
        updateRecordingUI();
        startTimer();
    } catch (error) {
        console.error('Error starting recognition:', error);
        alert('Failed to start speech recognition. Please try again.');
        window.pitchPracticeState.isRecording = false;
        updateRecordingUI();
    }
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
    }
    window.pitchPracticeState.isRecording = false;
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
    const feedbackContainer = document.getElementById('feedbackContainer');
    const feedbackList = document.getElementById('feedbackList');
    
    feedbackBtn.disabled = true;
    feedbackBtn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Generating feedback...';
    feather.replace();

    try {
        // Ensure transcript is saved before generating feedback
        const savedSuccessfully = await saveTranscript();
        if (!savedSuccessfully) {
            throw new Error('Failed to save transcript');
        }

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
            let feedbackPoints;
            try {
                feedbackPoints = typeof data.feedback === 'string' ? 
                    JSON.parse(data.feedback) : data.feedback;
            } catch (e) {
                feedbackPoints = {
                    feedback: [data.feedback]
                };
            }

            const feedbackArray = Array.isArray(feedbackPoints) ? 
                feedbackPoints : 
                Object.values(feedbackPoints).flat();

            feedbackList.innerHTML = feedbackArray
                .map(feedback => `<li>${feedback}</li>`)
                .join('');
            feedbackContainer.classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Failed to generate feedback');
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('An error occurred while generating feedback. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.innerHTML = 'Generate Feedback';
        feather.replace();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;  // Guard clause
    
    // Set initial theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';
    
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

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
    document.getElementById('startBtn')?.addEventListener('click', () => {
        showScreen('recording');
    });

    // Reset Buttons
    document.getElementById('resetBtn')?.addEventListener('click', resetSession);
    document.getElementById('resetSessionBtn')?.addEventListener('click', resetSession);

    // Record Button
    document.getElementById('recordBtn')?.addEventListener('click', () => {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Feedback Button
    document.getElementById('feedbackBtn')?.addEventListener('click', generateFeedback);
});
