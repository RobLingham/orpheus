document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    initializeApp();
});

const PITCH_STAGES = [
    { value: "elevator", label: "Elevator Pitch" },
    { value: "angel", label: "Angel Investment" },
    { value: "pre-seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series-a", label: "Series A" },
    { value: "series-b", label: "Series B" },
    { value: "series-c", label: "Series C" },
    { value: "series-d", label: "Series D" },
];

const TIME_OPTIONS = [
    { value: "1", label: "1 minute" },
    { value: "5", label: "5 minutes" },
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
];

let state = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    isRecording: false,
    timeRemaining: 0,
    recognition: null,
    transcript: '',
};

function initializeApp() {
    setupThemeToggle();
    createPitchStageButtons();
    createTimeOptions();
    showStep('stage');
}

function setupThemeToggle() {
    const themeSwitch = document.getElementById('theme-switch');
    themeSwitch.addEventListener('change', () => {
        document.body.setAttribute('data-theme', 
            themeSwitch.checked ? 'dark' : 'light');
    });
}

function createPitchStageButtons() {
    const container = document.getElementById('pitch-stages');
    PITCH_STAGES.forEach(stage => {
        const button = document.createElement('button');
        button.textContent = stage.label;
        button.classList.add('rainbow-shimmer');
        button.onclick = () => handleStageSelect(stage.value);
        container.appendChild(button);
    });
}

function createTimeOptions() {
    const container = document.getElementById('time-options');
    TIME_OPTIONS.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option.label;
        button.classList.add('rainbow-shimmer');
        button.onclick = () => handleTimeSelect(option.value);
        container.appendChild(button);
    });
}

function showStep(step) {
    document.querySelectorAll('.step').forEach(el => el.classList.add('hidden'));
    document.getElementById(`${step}-selection`)?.classList.remove('hidden');
    document.getElementById(`${step}-screen`)?.classList.remove('hidden');
    state.currentStep = step;
}

function handleStageSelect(value) {
    state.selectedStage = value;
    showStep('time');
}

function handleTimeSelect(value) {
    state.selectedTime = value;
    state.timeRemaining = parseInt(value) * 60;
    showStep('ready');
    updateReadyMessage();
}

function updateReadyMessage() {
    const message = document.getElementById('ready-message');
    message.textContent = `Ok, I've set up the timer for ${state.selectedTime} ${
        parseInt(state.selectedTime) === 1 ? "minute" : "minutes"
    }. Take a moment, collect your thoughts, and let me know when you're ready.`;
}

function startSession() {
    showStep('recording');
    initializeSpeechRecognition();
    startTimer();
}

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        state.recognition = new webkitSpeechRecognition();
        state.recognition.continuous = true;
        state.recognition.interimResults = true;

        state.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            document.getElementById('transcript').textContent = transcript;
            state.transcript = transcript;
        };

        state.recognition.start();
        state.isRecording = true;
        updateRecordingButton();
    } else {
        alert('Speech recognition is not supported in your browser.');
    }
}

function updateRecordingButton() {
    const button = document.getElementById('record-button');
    const status = document.getElementById('recording-status');
    
    if (state.isRecording) {
        button.classList.add('recording');
        button.innerHTML = feather.icons['mic-off'].toSvg();
        status.textContent = 'Click to stop recording';
    } else {
        button.classList.remove('recording');
        button.innerHTML = feather.icons['mic'].toSvg();
        status.textContent = 'Click to start recording';
    }
}

function startTimer() {
    const timerDisplay = document.getElementById('time-remaining');
    const timer = setInterval(() => {
        if (state.timeRemaining > 0) {
            state.timeRemaining--;
            timerDisplay.textContent = formatTime(state.timeRemaining);
        } else {
            clearInterval(timer);
            if (state.isRecording) {
                stopRecording();
            }
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function stopRecording() {
    if (state.recognition) {
        state.recognition.stop();
        state.isRecording = false;
        updateRecordingButton();
    }
}

function generateFeedback() {
    fetch('/api/generate-feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript: state.transcript }),
    })
    .then(response => response.json())
    .then(data => {
        const feedbackSection = document.getElementById('feedback-section');
        const feedbackList = document.getElementById('feedback-list');
        feedbackList.innerHTML = '';
        
        data.feedback.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            feedbackList.appendChild(li);
        });
        
        feedbackSection.classList.remove('hidden');
    });
}

function resetSession() {
    state = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        isRecording: false,
        timeRemaining: 0,
        recognition: null,
        transcript: '',
    };
    
    if (state.recognition) {
        state.recognition.stop();
    }
    
    document.getElementById('transcript').textContent = '';
    document.getElementById('feedback-section').classList.add('hidden');
    showStep('stage');
}

function goBack() {
    switch (state.currentStep) {
        case 'time':
            showStep('stage');
            break;
        case 'ready':
            showStep('time');
            break;
        case 'recording':
            stopRecording();
            showStep('ready');
            break;
    }
}
