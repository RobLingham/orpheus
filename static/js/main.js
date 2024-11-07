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
        const continuePitchBtn = document.getElementById('continuePitchBtn');
        if (feedbackBtn && continuePitchBtn) {
            feedbackBtn.style.display = 'block';
            feedbackBtn.textContent = window.pitchPracticeState.selectedPitchType === 'qa' ? 'Generate Question / Objection' : 'Generate Feedback';
            continuePitchBtn.style.display = 'none';
        }
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
    stopRecording();
    resetSession();
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

    if (transcript) transcript.textContent = '';
    if (feedbackContainer) feedbackContainer.classList.add('hidden');
    if (timeDisplay) timeDisplay.textContent = '0:00';
    if (incrementDisplay) incrementDisplay.textContent = '0:00';
    if (questionsList) questionsList.innerHTML = '';
    
    document.querySelectorAll('.btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    showScreen('stage');
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
                transcript: transcript.trim()
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error saving transcript:', error);
        return false;
    }
}

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
    const questionsList = document.getElementById('questionsList');
    
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
                qa_history: questionsList?.innerHTML || '',
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
                            <ul>
                                <li>${content}</li>
                            </ul>
                        `;
                    } else {
                        section.innerHTML = `<ul><li>${feedback}</li></ul>`;
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

document.addEventListener('DOMContentLoaded', function() {
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
