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

// Initialize theme and event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme and icons
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
    
    // Initialize feather icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Add event listeners
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
            showScreen('time');
        });
    });

    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedTime = button.dataset.value;
            showScreen('pitchType');
        });
    });

    document.querySelectorAll('.pitch-type-btn').forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedPitchType = button.dataset.value;
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
});

// Screen management functions
function handleStart() {
    const state = window.pitchPracticeState;
    state.currentStep = 'recording';
    showScreen('recording');
}

function handleReset() {
    resetSession();
}

function resetSession() {
    const state = window.pitchPracticeState;
    state.currentStep = 'stage';
    state.selectedStage = '';
    state.selectedTime = '';
    state.selectedPitchType = '';
    state.isRecording = false;
    state.timeRemaining = 0;
    showScreen('stage');
}

function showScreen(screenName) {
    // Reset all button highlights first
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Hide all screens
    const screens = ['stageSelection', 'timeSelection', 'pitchTypeSelection', 'readyScreen', 'recordingScreen'];
    screens.forEach(screen => {
        document.getElementById(screen).classList.add('hidden');
    });
    
    // Show selected screen
    const screenElement = document.getElementById(screenName + 'Selection') || document.getElementById(screenName + 'Screen');
    if (screenElement) {
        screenElement.classList.remove('hidden');
    }

    // Update state
    window.pitchPracticeState.currentStep = screenName;
    
    // Initialize feather icons after screen change
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Timer and display functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    const incrementDisplay = document.getElementById('incrementDisplay');
    
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
    
    if (incrementDisplay && state.selectedPitchType === 'qa') {
        incrementDisplay.textContent = formatTime(state.incrementTimeRemaining);
    }
}

// Navigation functions
function goBack() {
    const currentStep = window.pitchPracticeState.currentStep;
    switch (currentStep) {
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
            if (window.pitchPracticeState.isRecording) {
                stopRecording();
            }
            showScreen('ready');
            break;
    }
}

// Recording functions
function startRecording() {
    const state = window.pitchPracticeState;
    state.isRecording = true;
    updateRecordingUI();
    startTimer();
    initializeSpeechRecognition();
}

function stopRecording() {
    const state = window.pitchPracticeState;
    state.isRecording = false;
    updateRecordingUI();
    stopTimer();
    
    if (recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.querySelector('.recording-status');
    const feedbackBtn = document.getElementById('feedbackBtn');
    
    if (!recordBtn || !statusText) return;

    const micIcon = recordBtn.querySelector('i');
    if (micIcon) {
        micIcon.setAttribute('data-feather', window.pitchPracticeState.isRecording ? 'mic-off' : 'mic');
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    if (window.pitchPracticeState.isRecording) {
        statusText.textContent = 'Click to stop recording';
        recordBtn.classList.add('recording');
        if (feedbackBtn) feedbackBtn.style.display = 'none';
    } else {
        statusText.textContent = 'Click to start recording';
        recordBtn.classList.remove('recording');
        if (feedbackBtn) {
            feedbackBtn.style.display = 'block';
            feedbackBtn.textContent = window.pitchPracticeState.selectedPitchType === 'qa' ? 
                'Generate Question / Objection' : 'Generate Feedback';
        }
    }
}

// Timer functions
function startTimer() {
    const state = window.pitchPracticeState;
    if (state.timer) clearInterval(state.timer);
    if (state.incrementTimer) clearInterval(state.incrementTimer);

    updateTimerDisplay();
    
    if (state.selectedPitchType === 'qa') {
        state.incrementTimeRemaining = 30;
        startIncrementTimer();
    }

    state.timer = setInterval(() => {
        if (state.timeRemaining > 0) {
            state.timeRemaining--;
            updateTimerDisplay();
        } else {
            stopRecording();
            const feedbackBtn = document.getElementById('feedbackBtn');
            const continuePitchBtn = document.getElementById('continuePitchBtn');
            if (feedbackBtn && continuePitchBtn) {
                feedbackBtn.textContent = 'Generate Feedback';
                feedbackBtn.style.display = 'block';
                continuePitchBtn.style.display = 'none';
            }
        }
    }, 1000);
}

function stopTimer() {
    const state = window.pitchPracticeState;
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
    if (state.incrementTimer) {
        clearInterval(state.incrementTimer);
        state.incrementTimer = null;
    }
}

function startIncrementTimer() {
    const state = window.pitchPracticeState;
    const incrementDisplay = document.getElementById('incrementDisplay');
    
    if (incrementDisplay) {
        incrementDisplay.textContent = formatTime(state.incrementTimeRemaining);
    }

    state.incrementTimer = setInterval(() => {
        if (state.incrementTimeRemaining > 0) {
            state.incrementTimeRemaining--;
            if (incrementDisplay) {
                incrementDisplay.textContent = formatTime(state.incrementTimeRemaining);
            }
        } else {
            stopRecording();
            generateQuestion();
        }
    }, 1000);
}

// Speech recognition functions
function initializeSpeechRecognition() {
    if (!recognition) {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join(' ');
                
                const transcriptElement = document.getElementById('transcript');
                if (transcriptElement) {
                    transcriptElement.textContent = transcript;
                }
            };

            try {
                recognition.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                stopRecording();
            }
        } else {
            alert('Speech recognition is not supported in your browser');
            return;
        }
    }
}

// AI feedback functions
async function generateFeedback() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript')?.textContent;
    if (!transcript) {
        alert('Please record your pitch first!');
        return;
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const feedbackList = document.getElementById('feedbackList');
    
    if (!feedbackBtn || !feedbackContainer || !feedbackList) return;

    feedbackBtn.disabled = true;
    feedbackBtn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Generating feedback...';
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    try {
        const response = await fetch('/api/generate-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript.trim(),
                stage: state.selectedStage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && Array.isArray(data.feedback)) {
            feedbackList.innerHTML = '';
            data.feedback
                .filter(item => item && item.trim())
                .forEach(feedback => {
                    const section = document.createElement('div');
                    section.className = 'feedback-section';
                    
                    const titleMatch = feedback.match(/^\d+\.\s+([^:]+):/);
                    if (titleMatch) {
                        const [fullMatch, title] = titleMatch;
                        const content = feedback.replace(fullMatch, '').trim();
                        
                        section.innerHTML = `
                            <h4>${title}</h4>
                            <p>${content}</p>
                        `;
                    } else {
                        section.innerHTML = `<p>${feedback}</p>`;
                    }
                    feedbackList.appendChild(section);
                });
            feedbackContainer.classList.remove('hidden');

            const endSessionBtn = document.getElementById('endSessionBtn');
            if (feedbackBtn && endSessionBtn) {
                feedbackBtn.style.display = 'none';
                if (state.selectedPitchType === 'straight') {
                    endSessionBtn.style.display = 'block';
                }
            }
        } else {
            throw new Error(data.message || 'Failed to generate feedback');
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('An error occurred while generating feedback. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.innerHTML = state.selectedPitchType === 'qa' ? 
            'Generate Question / Objection' : 'Generate Feedback';
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

async function generateQuestion() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript')?.textContent;
    const questionsList = document.getElementById('questionsList');
    const continuePitchBtn = document.getElementById('continuePitchBtn');
    const feedbackBtn = document.getElementById('feedbackBtn');

    if (!transcript || !questionsList || !continuePitchBtn || !feedbackBtn) return;

    feedbackBtn.disabled = true;
    feedbackBtn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Analyzing...';
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    try {
        const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript.trim(),
                stage: state.selectedStage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.response) {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.innerHTML = `
                <h4>${data.response.type.charAt(0).toUpperCase() + data.response.type.slice(1)}</h4>
                <p>${data.response.content}</p>
                <div class="response" id="response-${Date.now()}"></div>
            `;
            questionsList.appendChild(questionElement);
            questionsList.scrollTop = questionsList.scrollHeight;
            
            continuePitchBtn.style.display = 'block';
            feedbackBtn.style.display = 'none';
            
            if (state.timeRemaining <= 0) {
                feedbackBtn.textContent = 'Generate Feedback';
                feedbackBtn.style.display = 'block';
                continuePitchBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error generating question:', error);
        alert('Failed to generate question/objection. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.innerHTML = state.timeRemaining <= 0 ? 'Generate Feedback' : 'Generate Question / Objection';
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

function continuePitch() {
    const state = window.pitchPracticeState;
    state.incrementTimeRemaining = 30;
    startRecording();
}
