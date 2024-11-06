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
    incrementTimeRemaining: 0,
    timer: null,
    incrementTimer: null,
    currentTranscriptSegment: ''
};

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
            : '';
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

// ... [Rest of the file remains the same until the DOMContentLoaded event]

document.addEventListener('DOMContentLoaded', function() {
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

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

    // ... [Rest of the event handlers remain the same]
});
