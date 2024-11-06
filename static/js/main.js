document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // State management
    let state = {
        currentStep: 'stage',
        selectedStage: '',
        selectedTime: '',
        isRecording: false,
        timeRemaining: 0,
        recognition: null,
        timer: null
    };

    // DOM Elements
    const screens = {
        stage: document.getElementById('stageSelection'),
        time: document.getElementById('timeSelection'),
        ready: document.getElementById('readyScreen'),
        recording: document.getElementById('recordingScreen')
    };

    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme based on system preference
    if (prefersDark) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', () => {
        document.body.setAttribute('data-theme', themeToggle.checked ? 'dark' : 'light');
    });

    // Stage Selection
    document.querySelectorAll('.stage-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            document.querySelectorAll('.stage-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            // Add active class to clicked button
            button.classList.add('active');
            
            state.selectedStage = button.dataset.value;
            showScreen('time');
        });
    });

    // Time Selection
    document.querySelectorAll('.time-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            
            state.selectedTime = parseInt(button.dataset.value);
            state.timeRemaining = state.selectedTime * 60;
            showScreen('ready');
        });
    });

    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', handleBack);
    });

    // Start Button
    document.getElementById('startBtn').addEventListener('click', () => {
        showScreen('recording');
        startRecording();
    });

    // Reset Buttons
    document.getElementById('resetBtn').addEventListener('click', resetSession);
    document.getElementById('resetSessionBtn').addEventListener('click', resetSession);

    // Record Button
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);

    // Feedback Button
    document.getElementById('feedbackBtn').addEventListener('click', generateFeedback);

    function showScreen(screenName) {
        state.currentStep = screenName;
        Object.entries(screens).forEach(([name, element]) => {
            element.classList.toggle('hidden', name !== screenName);
        });
    }

    function handleBack() {
        switch (state.currentStep) {
            case 'time':
                showScreen('stage');
                break;
            case 'ready':
                showScreen('time');
                break;
            case 'recording':
                showScreen('ready');
                stopRecording();
                break;
        }
    }

    // ... rest of the code remains the same ...
});
