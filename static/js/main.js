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

// Re-initialize icons when needed
function updateIcons() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

// Format time function
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Show screen function
function showScreen(screenName) {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const screens = ['stage', 'time', 'pitchType', 'ready', 'recording'];
    screens.forEach(screen => {
        const element = document.getElementById(screen + 'Selection') || 
                       document.getElementById(screen + 'Screen');
        if (element) {
            element.classList.toggle('hidden', screen !== screenName);
        }
    });
    
    const cardHeader = document.querySelector('.card-header');
    if (cardHeader) {
        cardHeader.style.display = screenName === 'stage' ? 'block' : 'none';
    }

    if (screenName === 'recording') {
        const feedbackBtn = document.getElementById('feedbackBtn');
        const endSessionBtn = document.getElementById('endSessionBtn');
        if (feedbackBtn) feedbackBtn.style.display = 'block';
        if (endSessionBtn) endSessionBtn.style.display = 'none';
    }

    window.pitchPracticeState.currentStep = screenName;
    updateIcons();
}

// Function to add feedback to side panel
function addFeedbackToPanel(feedback) {
    const title = `${feedback.stage} | ${feedback.pitchType} | ${feedback.duration} mins`;
    const date = new Date(feedback.timestamp);
    const feedbackItem = document.createElement('div');
    feedbackItem.className = 'feedback-item';
    feedbackItem.textContent = title;
    
    // Determine which group to add to
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let targetList;
    if (date.toDateString() === today.toDateString()) {
        targetList = document.getElementById('todayFeedback');
    } else if (date.toDateString() === yesterday.toDateString()) {
        targetList = document.getElementById('yesterdayFeedback');
    } else if (date > new Date(today.setDate(today.getDate() - 7))) {
        targetList = document.getElementById('previousFeedback');
    }
    
    if (targetList) {
        targetList.prepend(feedbackItem);
    }
}

// Initialize Speech Recognition
function initializeSpeechRecognition() {
    if (!recognition) {
        if ('webkitSpeechRecognition' in window) {
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
        } else {
            alert('Speech recognition is not supported in your browser');
            return;
        }
    }

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
}

// Update recording UI
function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const resetRecordingBtn = document.getElementById('resetRecordingBtn');
    const statusText = document.querySelector('.recording-status');
    if (!recordBtn || !statusText) return;

    if (window.pitchPracticeState.isRecording) {
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
    updateIcons();
}

// Timer functions
function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
}

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
            generateFeedback();
        }
    }, 1000);
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
    window.pitchPracticeState.isRecording = true;
    updateRecordingUI();
    startTimer();
    initializeSpeechRecognition();
}

function stopRecording() {
    window.pitchPracticeState.isRecording = false;
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

// Save transcript function
async function saveTranscript() {
    const state = window.pitchPracticeState;
    const transcriptElement = document.getElementById('transcript');
    const transcript = transcriptElement?.textContent || '';
    
    if (!transcript.trim()) {
        console.log('No transcript to save');
        return true;
    }

    const feedbackData = {
        stage: state.selectedStage,
        pitchType: state.selectedPitchType,
        duration: parseInt(state.selectedTime),
        transcript: transcript,
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('/api/save-transcript', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success) {
            addFeedbackToPanel(feedbackData);
        }
        return data.success;
    } catch (error) {
        console.error('Error saving transcript:', error);
        return true;
    }
}

// Generate feedback function
async function generateFeedback() {
    stopRecording();
    
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
    updateIcons();

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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
            if (feedbackBtn && endSessionBtn) {
                feedbackBtn.style.display = 'none';
                if (window.pitchPracticeState.selectedPitchType === 'straight') {
                    endSessionBtn.style.display = 'block';
                }
            }
        } else {
            throw new Error(data.error || 'Failed to generate feedback');
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

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Check for saved theme preference or default to 'light'
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = currentTheme;
        themeToggle.checked = currentTheme === 'dark';
        
        // Add event listener for theme toggle
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });
    }

    // Side panel functionality
    document.getElementById('sidePanelIcon').addEventListener('click', function() {
        const sidePanel = document.getElementById('sidePanel');
        const container = document.querySelector('.container');
        sidePanel.classList.add('open');
        container.classList.add('shift-right');
    });

    document.getElementById('minimizeSidePanel').addEventListener('click', function() {
        const sidePanel = document.getElementById('sidePanel');
        const container = document.querySelector('.container');
        sidePanel.classList.remove('open');
        container.classList.remove('shift-right');
    });

    // Search functionality
    document.getElementById('searchFeedback').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.feedback-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'block' : 'none';
        });
    });

    // Add event listeners for buttons
    document.getElementById('recordBtn').addEventListener('click', function() {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

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
        startBtn.addEventListener('click', () => {
            showScreen('recording');
            window.pitchPracticeState.timeRemaining = parseInt(window.pitchPracticeState.selectedTime) * 60;
            updateTimerDisplay();
        });
    }

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', () => {
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
        });
    });

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', generateFeedback);
    }

    document.getElementById('resetRecordingBtn').addEventListener('click', function() {
        const transcript = document.getElementById('transcript');
        if (transcript) transcript.textContent = '';
        this.style.display = 'none';
        updateIcons();
    });

    document.getElementById('saveAndContinueBtn').addEventListener('click', async () => {
        const btn = document.getElementById('saveAndContinueBtn');
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Saving...';
        updateIcons();
        
        await saveTranscript();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        setTimeout(() => {
            const state = window.pitchPracticeState;
            if (state.isRecording) {
                stopRecording();
            }
            
            if (state.timer) clearInterval(state.timer);
            if (state.incrementTimer) clearInterval(state.incrementTimer);
            
            window.pitchPracticeState = {
                currentStep: 'stage',
                selectedStage: '',
                selectedTime: '',
                selectedPitchType: '',
                isRecording: false,
                timeRemaining: 0,
                incrementTimeRemaining: 0,
                timer: null,
                incrementTimer: null
            };
            
            document.querySelectorAll('.btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            showScreen('stage');
        }, 1000);
    });
});
