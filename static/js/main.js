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

// All previous functions from the original code remain the same...

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

// Keep the remaining original code for event listeners and document initialization
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();
    
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
        startBtn.addEventListener('click', handleStart);
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('resetModal').classList.remove('hidden');
    });

    document.getElementById('cancelResetBtn').addEventListener('click', () => {
        document.getElementById('resetModal').classList.add('hidden');
    });

    document.getElementById('confirmResetBtn').addEventListener('click', () => {
        document.getElementById('resetModal').classList.add('hidden');
        resetSession();
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', goBack);
    });

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', generateFeedback);
    }

    const continuePitchBtn = document.getElementById('continuePitchBtn');
    if (continuePitchBtn) {
        continuePitchBtn.addEventListener('click', continuePitch);
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
            resetSession();
        }, 1000);
    });
});