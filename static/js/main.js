// Initialize global state
window.pitchPracticeState = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    selectedPitchType: '',
    isRecording: false,
    timeRemaining: 0,
    incrementTimeRemaining: 0,
    timer: null,
    incrementTimer: null,
    recognition: null
};

// Theme initialization
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = theme;
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'dark';
    }
}

// Initialize Speech Recognition
function initializeSpeechRecognition() {
    if (!window.pitchPracticeState.recognition) {
        if ('webkitSpeechRecognition' in window) {
            window.pitchPracticeState.recognition = new webkitSpeechRecognition();
            window.pitchPracticeState.recognition.continuous = true;
            window.pitchPracticeState.recognition.interimResults = true;
            
            window.pitchPracticeState.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join(' ');
                
                const transcriptElement = document.getElementById('transcript');
                if (transcriptElement) {
                    transcriptElement.textContent = transcript;
                }
            };
        } else {
            alert('Speech recognition is not supported in your browser');
            return false;
        }
    }
    return true;
}

// Utility functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateIcons() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Timer functions
function startTimer() {
    const state = window.pitchPracticeState;
    if (state.timer) clearInterval(state.timer);
    
    state.timer = setInterval(() => {
        if (state.timeRemaining > 0) {
            state.timeRemaining--;
            updateTimerDisplay();
        } else {
            stopRecording();
            generateFeedback();
        }
    }, 1000);
}

function startIncrementTimer() {
    const state = window.pitchPracticeState;
    if (state.incrementTimer) clearInterval(state.incrementTimer);
    
    state.incrementTimeRemaining = 30;
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
        }
        if (state.incrementTimeRemaining === 0) {
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
    if (state.incrementTimer) {
        clearInterval(state.incrementTimer);
        state.incrementTimer = null;
    }
}

// Recording functions
function startRecording() {
    if (!initializeSpeechRecognition()) return;
    
    window.pitchPracticeState.isRecording = true;
    window.pitchPracticeState.recognition.start();
    updateRecordingUI();
    startTimer();
    
    if (window.pitchPracticeState.selectedPitchType === 'qa') {
        startIncrementTimer();
    }
}

function stopRecording() {
    window.pitchPracticeState.isRecording = false;
    if (window.pitchPracticeState.recognition) {
        try {
            window.pitchPracticeState.recognition.stop();
        } catch (error) {
            console.error('Error stopping recognition:', error);
        }
    }
    stopTimer();
    updateRecordingUI();
}

// UI update functions
function updateRecordingUI() {
    const state = window.pitchPracticeState;
    const recordBtn = document.getElementById('recordBtn');
    const resetRecordingBtn = document.getElementById('resetRecordingBtn');
    const statusText = document.querySelector('.recording-status');
    
    if (recordBtn && statusText) {
        if (state.isRecording) {
            statusText.textContent = 'Click to stop recording';
            recordBtn.classList.add('recording');
            if (resetRecordingBtn) resetRecordingBtn.style.display = 'none';
        } else {
            statusText.textContent = 'Click to start recording';
            recordBtn.classList.remove('recording');
            const transcript = document.getElementById('transcript');
            if (resetRecordingBtn && transcript && transcript.textContent.trim()) {
                resetRecordingBtn.style.display = 'block';
            }
        }
    }
    updateIcons();
}

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
}

// Navigation functions
function showScreen(screenName) {
    const screens = ['stage', 'time', 'pitchType', 'ready', 'recording'];
    screens.forEach(screen => {
        const element = document.getElementById(screen + 'Selection') || 
                       document.getElementById(screen + 'Screen');
        if (element) {
            element.classList.toggle('hidden', screen !== screenName);
        }
    });
    
    window.pitchPracticeState.currentStep = screenName;
    
    if (screenName === 'recording') {
        const qaElements = document.querySelectorAll('.qa-mode-only');
        qaElements.forEach(element => {
            element.classList.toggle('show', window.pitchPracticeState.selectedPitchType === 'qa');
        });
    }
    
    updateIcons();
}

function goBack() {
    const state = window.pitchPracticeState;
    switch (state.currentStep) {
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
            if (state.isRecording) {
                stopRecording();
            }
            showScreen('ready');
            break;
    }
}

// Reset functions
function resetSession() {
    const state = window.pitchPracticeState;
    if (state.isRecording) {
        stopRecording();
    }
    
    window.pitchPracticeState = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        selectedPitchType: '',
        isRecording: false,
        timeRemaining: 0,
        incrementTimeRemaining: 0,
        timer: null,
        incrementTimer: null,
        recognition: null
    };
    
    // Reset UI elements
    const transcript = document.getElementById('transcript');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const timeDisplay = document.getElementById('timeDisplay');
    const resetRecordingBtn = document.getElementById('resetRecordingBtn');
    const questionsList = document.getElementById('questionsList');

    if (transcript) transcript.textContent = '';
    if (feedbackContainer) feedbackContainer.classList.add('hidden');
    if (timeDisplay) timeDisplay.textContent = '0:00';
    if (resetRecordingBtn) resetRecordingBtn.style.display = 'none';
    if (questionsList) questionsList.innerHTML = '';

    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    showScreen('stage');
}

// API interaction functions
async function saveTranscript() {
    const state = window.pitchPracticeState;
    const transcriptElement = document.getElementById('transcript');
    const transcript = transcriptElement?.textContent || '';
    
    if (!transcript.trim()) {
        console.log('No transcript to save');
        return true;
    }

    try {
        const response = await fetch('/api/save-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stage: state.selectedStage,
                duration: parseInt(state.selectedTime) * 60,
                transcript: transcript
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error saving transcript:', error);
        return true;
    }
}

async function generateFeedback() {
    const transcript = document.getElementById('transcript')?.textContent;
    if (!transcript) {
        alert('Please record your pitch first!');
        return;
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const feedbackList = document.getElementById('feedbackList');
    
    feedbackBtn.disabled = true;
    feedbackBtn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Generating feedback...';
    updateIcons();

    try {
        const response = await fetch('/api/generate-feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: transcript,
                stage: window.pitchPracticeState.selectedStage
            })
        });

        const data = await response.json();
        
        if (data.success && data.feedback) {
            feedbackList.innerHTML = `
                <div class="feedback-section">
                    <h4>Opening and Hook</h4>
                    <p>${data.feedback.feedback.opening_and_hook}</p>
                </div>
                <div class="feedback-section">
                    <h4>Value Proposition</h4>
                    <p>${data.feedback.feedback.value_proposition}</p>
                </div>
                <div class="feedback-section">
                    <h4>Market Understanding</h4>
                    <p>${data.feedback.feedback.market_understanding}</p>
                </div>
                <div class="feedback-section">
                    <h4>Delivery and Communication</h4>
                    <p>${data.feedback.feedback.delivery_and_communication}</p>
                </div>
                <div class="feedback-section">
                    <h4>Areas for Improvement</h4>
                    <ul>
                        ${data.feedback.feedback.areas_for_improvement.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
            feedbackContainer.classList.remove('hidden');
            
            const endSessionBtn = document.getElementById('endSessionBtn');
            const feedbackBtn = document.getElementById('feedbackBtn');
            if (feedbackBtn && endSessionBtn) {
                feedbackBtn.style.display = 'none';
                if (window.pitchPracticeState.selectedPitchType === 'straight') {
                    endSessionBtn.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('An error occurred while generating feedback. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.innerHTML = 'Generate Feedback';
        updateIcons();
    }
}

async function generateQuestion() {
    const transcript = document.getElementById('transcript')?.textContent;
    const questionsList = document.getElementById('questionsList');
    const generateQuestionBtn = document.getElementById('generateQuestionBtn');
    const skipQuestionBtn = document.getElementById('skipQuestionBtn');
    const continuePitchBtn = document.getElementById('continuePitchBtn');
    
    if (!transcript || !questionsList) return;
    
    generateQuestionBtn.disabled = true;
    skipQuestionBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transcript: transcript,
                stage: window.pitchPracticeState.selectedStage,
                previousQuestions: Array.from(questionsList.children).map(q => 
                    q.querySelector('p')?.textContent || ''
                )
            })
        });

        const data = await response.json();
        
        if (data.success && data.response) {
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.innerHTML = `
                <h4>${data.response.type === 'question' ? 'Question' : 'Objection'}</h4>
                <p>${data.response.content}</p>
                <div class="response" id="response-${Date.now()}"></div>
            `;
            questionsList.appendChild(questionElement);
            questionsList.scrollTop = questionsList.scrollHeight;
            
            if (continuePitchBtn) continuePitchBtn.style.display = 'block';
            generateQuestionBtn.style.display = 'none';
            skipQuestionBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error generating question:', error);
        alert('Failed to generate question. Please try again.');
    } finally {
        generateQuestionBtn.disabled = false;
        skipQuestionBtn.disabled = false;
    }
}

function continuePitch() {
    const state = window.pitchPracticeState;
    state.incrementTimeRemaining = 30;
    startRecording();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme and icons
    initializeTheme();
    feather.replace();
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });
    }

    // Stage selection
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            window.pitchPracticeState.selectedStage = this.dataset.value;
            this.classList.add('active');
            showScreen('time');
        });
    });

    // Time selection
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            window.pitchPracticeState.selectedTime = this.dataset.value;
            this.classList.add('active');
            showScreen('pitchType');
        });
    });

    // Pitch type selection
    document.querySelectorAll('.pitch-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            window.pitchPracticeState.selectedPitchType = this.dataset.value;
            this.classList.add('active');
            showScreen('ready');
        });
    });

    // Recording controls
    document.getElementById('recordBtn').addEventListener('click', function() {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Navigation
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', goBack);
    });

    // Session controls
    document.getElementById('startBtn')?.addEventListener('click', function() {
        showScreen('recording');
        window.pitchPracticeState.timeRemaining = parseInt(window.pitchPracticeState.selectedTime) * 60;
        updateTimerDisplay();
    });

    document.getElementById('resetRecordingBtn')?.addEventListener('click', function() {
        document.getElementById('transcript').textContent = '';
        this.style.display = 'none';
    });

    // Q&A mode controls
    document.getElementById('generateQuestionBtn')?.addEventListener('click', generateQuestion);
    document.getElementById('skipQuestionBtn')?.addEventListener('click', function() {
        document.getElementById('continuePitchBtn').style.display = 'block';
        document.getElementById('generateQuestionBtn').style.display = 'none';
        document.getElementById('skipQuestionBtn').style.display = 'none';
    });
    document.getElementById('continuePitchBtn')?.addEventListener('click', continuePitch);

    // Feedback and session management
    document.getElementById('feedbackBtn')?.addEventListener('click', generateFeedback);
    document.getElementById('resetBtn')?.addEventListener('click', resetSession);
    document.getElementById('saveAndContinueBtn')?.addEventListener('click', async function() {
        this.disabled = true;
        this.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Saving...';
        updateIcons();
        
        const success = await saveTranscript();
        if (success) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            
            setTimeout(() => {
                resetSession();
            }, 1000);
        }
        
        this.disabled = false;
        this.innerHTML = 'Save & Continue';
        updateIcons();
    });
});