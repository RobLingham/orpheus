let recognition = null;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
}

const PITCH_STAGES = [
    { value: "elevator", label: "Elevator Pitch" },
    { value: "angel", label: "Angel Investment" },
    { value: "pre-seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series-a", label: "Series A" },
    { value: "series-b", label: "Series B" },
    { value: "series-c", label: "Series C" },
    { value: "series-d", label: "Series D" }
];

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
    currentTranscriptSegment: ''
};

function generateBreadcrumb() {
    const state = window.pitchPracticeState;
    const stages = {
        stage: state.selectedStage ? PITCH_STAGES.find(s => s.value === state.selectedStage)?.label : '',
        time: state.selectedTime ? `${state.selectedTime} minutes` : '',
        pitchType: state.selectedPitchType === 'straight' ? 'Straight Pitch' : 'Field Questions & Objections'
    };
    
    let breadcrumb = '';
    let path = '';
    
    Object.entries(stages).forEach(([step, value], index, arr) => {
        if (value) {
            path += (path ? ' > ' : '') + value;
            breadcrumb += `<span class="breadcrumb-item" data-step="${step}">${value}</span>`;
            if (index < arr.length - 1 && arr[index + 1][1]) {
                breadcrumb += '<span class="breadcrumb-separator">></span>';
            }
        }
    });
    
    return breadcrumb;
}

function showScreen(screenName) {
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

    const welcomeHeader = document.querySelector('.card-header');
    if (welcomeHeader) {
        welcomeHeader.innerHTML = screenName === 'stage' 
            ? `<h2>Master Your Pitch, Enchant Every Audience.</h2>
               <p class="subtitle">Practice your pitch, tackle tough objections, answer commonly asked questions, analyze your performance, and level up your pitch deck - all in one place.</p>`
            : `<div class="breadcrumb-nav">
                ${generateBreadcrumb()}
               </div>`;
    }

    if (screenName === 'ready' && window.pitchPracticeState.selectedPitchType === 'qa') {
        const readyContent = document.querySelector('.ready-content p');
        if (readyContent) {
            readyContent.textContent = "During this session you'll field questions and face objections. You'll be able to speak for 90 second increments (or until you hit the microphone button), receive questions/objections, respond to them, or continue on in your pitch.";
        }
    }

    const qaElements = document.querySelectorAll('.qa-mode-only');
    qaElements.forEach(element => {
        element.classList.toggle('show', window.pitchPracticeState.selectedPitchType === 'qa');
    });
}

function updateRecordingUI() {
    const recordBtn = document.getElementById('recordBtn');
    const statusText = document.querySelector('.recording-status');
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
    } else {
        statusText.textContent = 'Click to start recording';
        recordBtn.classList.remove('recording');
    }
}

function startTimer() {
    const state = window.pitchPracticeState;
    if (state.timer) clearInterval(state.timer);
    if (state.incrementTimer) clearInterval(state.incrementTimer);

    updateTimerDisplay();
    
    if (state.selectedPitchType === 'qa') {
        state.incrementTimeRemaining = 90;
        startIncrementTimer();
    }

    state.timer = setInterval(() => {
        if (state.timeRemaining > 0) {
            state.timeRemaining--;
            updateTimerDisplay();
        } else {
            stopRecording();
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

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const state = window.pitchPracticeState;
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(state.timeRemaining);
    }
}

async function generateQuestion() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript')?.textContent;
    const questionsList = document.getElementById('questionsList');
    const continuePitchBtn = document.getElementById('continuePitchBtn');

    if (!transcript || !questionsList || !continuePitchBtn) return;

    try {
        const response = await fetch('/api/generate-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transcript: transcript,
                stage: state.selectedStage
            })
        });

        const data = await response.json();
        if (data.success && data.response) {
            const question = data.response;
            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.innerHTML = `
                <h4>${question.type === 'question' ? 'Question' : 'Objection'}</h4>
                <p>${question.content}</p>
                <div class="response" id="response-${Date.now()}"></div>
            `;
            questionsList.appendChild(questionElement);
            questionsList.scrollTop = questionsList.scrollHeight;
            
            continuePitchBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error generating question:', error);
    }
}

function continuePitch() {
    const state = window.pitchPracticeState;
    state.incrementTimeRemaining = 90;
    startRecording();
}

async function saveTranscript() {
    const state = window.pitchPracticeState;
    const transcript = document.getElementById('transcript')?.textContent;
    
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
        incrementTimer: null,
        currentTranscriptSegment: ''
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
        
        const transcriptElement = document.getElementById('transcript');
        if (transcriptElement) {
            transcriptElement.textContent = transcript;
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            const statusText = document.querySelector('.recording-status');
            if (statusText) {
                statusText.textContent = 'No speech detected. Click to try again.';
            }
        }
        stopRecording();
    };

    recognition.onend = () => {
        if (window.pitchPracticeState.isRecording) {
            try {
                recognition.start();
            } catch (error) {
                console.error('Error restarting recognition:', error);
                stopRecording();
            }
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
        
        if (data.success && Array.isArray(data.feedback)) {
            feedbackList.innerHTML = data.feedback
                .filter(item => item && item.trim())
                .map(feedback => {
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
                    return section.outerHTML;
                })
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
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    document.querySelector('.card-header').addEventListener('click', (e) => {
        const item = e.target.closest('.breadcrumb-item');
        if (item) {
            const step = item.dataset.step;
            showScreen(step);
        }
    });

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', currentTheme);
        themeToggle.checked = currentTheme === 'dark';
        
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }

    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.stage-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            window.pitchPracticeState.selectedStage = button.dataset.value;
            showScreen('time');
        });
    });

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

    const continuePitchBtn = document.getElementById('continuePitchBtn');
    if (continuePitchBtn) {
        continuePitchBtn.addEventListener('click', continuePitch);
    }

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

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            showScreen('recording');
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    const resetSessionBtn = document.getElementById('resetSessionBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetSession);
    if (resetSessionBtn) resetSessionBtn.addEventListener('click', resetSession);

    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (window.pitchPracticeState.isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    const endSessionBtn = document.getElementById('endSessionBtn');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', () => {
            stopRecording();
            generateFeedback();
        });
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', generateFeedback);
    }
});