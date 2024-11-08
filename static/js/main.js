// Initialize global state and Speech Recognition
let recognition = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
    // Initialize state object
    window.pitchPracticeState = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        selectedPitchType: '',
        isRecording: false,
        timeRemaining: 0,
        incrementTimeRemaining: 30,
        recognition: null,
        timer: null,
        incrementTimer: null
    };

    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Check for saved theme preference
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.dataset.theme = currentTheme;
        themeToggle.checked = currentTheme === 'dark';
        
        themeToggle.addEventListener('change', function() {
            const newTheme = this.checked ? 'dark' : 'light';
            document.body.dataset.theme = newTheme;
            localStorage.setItem('theme', newTheme);
        });
    }

    // Stage selection buttons
    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', function() {
            window.pitchPracticeState.selectedStage = this.dataset.value;
            window.pitchPracticeState.currentStep = 'time';
            updateUI();
        });
    });

    // Time selection buttons
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', function() {
            window.pitchPracticeState.selectedTime = this.dataset.value;
            window.pitchPracticeState.currentStep = 'pitchType';
            window.pitchPracticeState.timeRemaining = parseInt(this.dataset.value) * 60;
            updateUI();
        });
    });

    // Pitch type selection buttons
    document.querySelectorAll('.pitch-type-btn').forEach(button => {
        button.addEventListener('click', function() {
            window.pitchPracticeState.selectedPitchType = this.dataset.value;
            window.pitchPracticeState.currentStep = 'ready';
            updateUI();
        });
    });

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', goBack);
    });

    // Start button
    document.getElementById('startBtn').addEventListener('click', handleStart);

    // Record button
    document.getElementById('recordBtn').addEventListener('click', function() {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Generate Feedback button
    document.getElementById('feedbackBtn').addEventListener('click', generateFeedback);

    // Save & Continue button
    document.getElementById('saveAndContinueBtn').addEventListener('click', async function() {
        try {
            const transcript = document.getElementById('transcript')?.textContent;
            if (!transcript) return;

            // Save transcript
            const response = await fetch('/api/save-transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript: transcript,
                    stage: window.pitchPracticeState.selectedStage,
                    duration: parseInt(window.pitchPracticeState.selectedTime) * 60 - window.pitchPracticeState.timeRemaining
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save transcript');
            }

            // Reset recording state but maintain session
            document.getElementById('transcript').textContent = '';
            document.getElementById('feedbackContainer').classList.add('hidden');
            
            if (window.pitchPracticeState.selectedPitchType === 'qa') {
                // Reset for next Q&A segment
                window.pitchPracticeState.incrementTimeRemaining = 30;
                document.getElementById('incrementDisplay').textContent = '0:30';
                document.getElementById('generateQuestionBtn').style.display = 'block';
            }

            // Show success message
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.classList.remove('hidden');
                if (typeof confetti !== 'undefined') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }
        } catch (error) {
            console.error('Error saving transcript:', error);
            alert('Failed to save transcript. Please try again.');
        }
    });

    // Success modal buttons
    document.getElementById('reviewAnalysisBtn').addEventListener('click', function() {
        document.getElementById('successModal').classList.add('hidden');
        // Add code here to show analysis view when implemented
    });

    document.getElementById('returnHomeBtn').addEventListener('click', function() {
        document.getElementById('successModal').classList.add('hidden');
        resetSession();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', function() {
        document.getElementById('resetModal').classList.remove('hidden');
    });

    // Reset modal buttons
    document.getElementById('cancelResetBtn').addEventListener('click', function() {
        document.getElementById('resetModal').classList.add('hidden');
    });

    document.getElementById('confirmResetBtn').addEventListener('click', function() {
        document.getElementById('resetModal').classList.add('hidden');
        resetSession();
    });
});

function updateUI() {
    // Hide all step containers
    document.querySelectorAll('.step-container').forEach(container => {
        container.classList.add('hidden');
    });

    // Show current step
    const currentContainer = document.getElementById(window.pitchPracticeState.currentStep + 'Selection') ||
                           document.getElementById(window.pitchPracticeState.currentStep + 'Screen');
    if (currentContainer) {
        currentContainer.classList.remove('hidden');
    }

    // Re-initialize Feather icons after UI update
    feather.replace();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function handleStart() {
    window.pitchPracticeState.timeRemaining = parseInt(window.pitchPracticeState.selectedTime) * 60;
    if (window.pitchPracticeState.selectedPitchType === 'qa') {
        window.pitchPracticeState.incrementTimeRemaining = 30;
    }
    showScreen('recording');
}

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

    window.pitchPracticeState.currentStep = screenName;
    updateIcons();
}

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

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
}

function goBack() {
    switch (window.pitchPracticeState.currentStep) {
        case 'time':
            showScreen('stage');
            window.pitchPracticeState.selectedStage = '';
            break;
        case 'pitchType':
            showScreen('time');
            window.pitchPracticeState.selectedTime = '';
            break;
        case 'ready':
            showScreen('pitchType');
            window.pitchPracticeState.selectedPitchType = '';
            break;
        case 'recording':
            if (window.pitchPracticeState.isRecording) {
                stopRecording();
            }
            showScreen('ready');
            break;
    }
}

function resetSession() {
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
        incrementTimeRemaining: 30,
        timer: null,
        incrementTimer: null
    };
    
    const transcript = document.getElementById('transcript');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const timeDisplay = document.getElementById('timeDisplay');
    const incrementDisplay = document.getElementById('incrementDisplay');
    const resetRecordingBtn = document.getElementById('resetRecordingBtn');

    if (transcript) transcript.textContent = '';
    if (feedbackContainer) feedbackContainer.classList.add('hidden');
    if (timeDisplay) timeDisplay.textContent = '0:00';
    if (incrementDisplay) incrementDisplay.textContent = '0:00';
    if (resetRecordingBtn) resetRecordingBtn.style.display = 'none';
    
    showScreen('stage');
}

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
                    <p>${data.feedback.opening_and_hook}</p>
                </div>
                <div class="feedback-section">
                    <h4>Value Proposition</h4>
                    <p>${data.feedback.value_proposition}</p>
                </div>
                <div class="feedback-section">
                    <h4>Market Understanding</h4>
                    <p>${data.feedback.market_understanding}</p>
                </div>
                <div class="feedback-section">
                    <h4>Delivery and Communication</h4>
                    <p>${data.feedback.delivery_and_communication}</p>
                </div>
                <div class="feedback-section">
                    <h4>Areas for Improvement</h4>
                    <ul>
                        ${data.feedback.areas_for_improvement.map(item => `<li>${item}</li>`).join('')}
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

function updateIcons() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}
