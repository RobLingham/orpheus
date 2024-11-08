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

// Theme initialization
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = theme;
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.checked = theme === 'dark';
    }
}

// Re-initialize icons when needed
function updateIcons() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

    if (screenName === 'ready') {
        const readyContent = document.querySelector('.ready-content p');
        if (readyContent) {
            const defaultText = "Take a moment, collect your thoughts, and let me know when you're ready.";
            const qaText = "During this session you'll field questions and face objections. You'll be able to speak for 30 second increments (or until you hit the microphone button), receive questions/objections, respond to them, or continue on in your pitch.";
            
            readyContent.textContent = window.pitchPracticeState.selectedPitchType === 'qa' ? qaText : defaultText;
        }
    }

    const qaElements = document.querySelectorAll('.qa-mode-only');
    qaElements.forEach(element => {
        element.classList.toggle('show', window.pitchPracticeState.selectedPitchType === 'qa');
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

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
    if (state.currentStep === 'recording' && !state.isRecording) {
        timeDisplay.textContent = formatTime(state.selectedTime * 60);
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

    if (state.incrementTimer) clearInterval(state.incrementTimer);

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

function handleStart() {
    showScreen('recording');
    window.pitchPracticeState.timeRemaining = parseInt(window.pitchPracticeState.selectedTime) * 60;
    updateTimerDisplay();
}

function handleReset() {
    document.getElementById('resetModal').classList.remove('hidden');
    
    const confirmResetBtn = document.getElementById('confirmResetBtn');
    const cancelResetBtn = document.getElementById('cancelResetBtn');
    
    if (confirmResetBtn) {
        confirmResetBtn.onclick = () => {
            document.getElementById('resetModal').classList.add('hidden');
            resetSession();
        };
    }
    
    if (cancelResetBtn) {
        cancelResetBtn.onclick = () => {
            document.getElementById('resetModal').classList.add('hidden');
        };
    }
}

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
        incrementTimeRemaining: 0,
        timer: null,
        incrementTimer: null
    };
    
    const transcript = document.getElementById('transcript');
    const feedbackContainer = document.getElementById('feedbackContainer');
    const timeDisplay = document.getElementById('timeDisplay');
    const incrementDisplay = document.getElementById('incrementDisplay');
    const questionsList = document.getElementById('questionsList');
    const resetRecordingBtn = document.getElementById('resetRecordingBtn');

    if (transcript) transcript.textContent = '';
    if (feedbackContainer) feedbackContainer.classList.add('hidden');
    if (timeDisplay) timeDisplay.textContent = '0:00';
    if (incrementDisplay) incrementDisplay.textContent = '0:00';
    if (questionsList) questionsList.innerHTML = '';
    if (resetRecordingBtn) resetRecordingBtn.style.display = 'none';
    
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    showScreen('stage');
    updateIcons();
}

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

async function generateQuestion() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript')?.textContent;
    const questionsList = document.getElementById('questionsList');
    const continuePitchBtn = document.getElementById('continuePitchBtn');
    const generateQuestionBtn = document.getElementById('generateQuestionBtn');
    const skipQuestionBtn = document.getElementById('skipQuestionBtn');

    if (!transcript || !questionsList || !continuePitchBtn) return;

    // Disable buttons while generating
    if (generateQuestionBtn) generateQuestionBtn.disabled = true;
    if (skipQuestionBtn) skipQuestionBtn.disabled = true;

    try {
        const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript,
                stage: state.selectedStage,
                previousQuestions: Array.from(questionsList.children).map(q => 
                    q.querySelector('p')?.textContent || ''
                )
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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

            // Show continue button and enable controls
            continuePitchBtn.style.display = 'block';
            if (generateQuestionBtn) generateQuestionBtn.style.display = 'none';
            if (skipQuestionBtn) skipQuestionBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error generating question:', error);
        alert('Failed to generate question. Please try again.');
    } finally {
        // Re-enable buttons
        if (generateQuestionBtn) {
            generateQuestionBtn.disabled = false;
            generateQuestionBtn.style.display = 'block';
        }
        if (skipQuestionBtn) {
            skipQuestionBtn.disabled = false;
            skipQuestionBtn.style.display = 'block';
        }
    }
    updateIcons();
}

function continuePitch() {
    const state = window.pitchPracticeState;
    state.incrementTimeRemaining = 30;
    startRecording();
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme and Feather icons
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

    // Stage selection buttons
    document.querySelectorAll('.stage-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            window.pitchPracticeState.selectedStage = value;
            this.classList.add('active');
            showScreen('time');
        });
    });

    // Time selection buttons
    document.querySelectorAll('.time-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            window.pitchPracticeState.selectedTime = value;
            this.classList.add('active');
            showScreen('pitchType');
        });
    });

    // Pitch type selection buttons
    document.querySelectorAll('.pitch-type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            window.pitchPracticeState.selectedPitchType = value;
            this.classList.add('active');
            showScreen('ready');
        });
    });

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', goBack);
    });

    // Start button
    document.getElementById('startBtn')?.addEventListener('click', handleStart);

    // Record button
    document.getElementById('recordBtn')?.addEventListener('click', function() {
        if (window.pitchPracticeState.isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    });

    // Reset recording button
    document.getElementById('resetRecordingBtn')?.addEventListener('click', function() {
        const transcript = document.getElementById('transcript');
        if (transcript) transcript.textContent = '';
        this.style.display = 'none';
        updateIcons();
    });

    // Generate feedback button
    document.getElementById('feedbackBtn')?.addEventListener('click', generateFeedback);

    // Q&A mode buttons
    document.getElementById('generateQuestionBtn')?.addEventListener('click', generateQuestion);
    document.getElementById('skipQuestionBtn')?.addEventListener('click', () => {
        document.getElementById('continuePitchBtn').style.display = 'block';
        document.getElementById('generateQuestionBtn').style.display = 'none';
        document.getElementById('skipQuestionBtn').style.display = 'none';
    });
    document.getElementById('continuePitchBtn')?.addEventListener('click', continuePitch);

    // Reset session buttons
    document.getElementById('resetBtn')?.addEventListener('click', handleReset);
    document.getElementById('saveAndContinueBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('saveAndContinueBtn');
        btn.disabled = true;
        btn.innerHTML = '<i data-feather="loader" class="animate-spin"></i> Saving...';
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
        
        btn.disabled = false;
        btn.innerHTML = 'Save & Continue';
        updateIcons();
    });
});