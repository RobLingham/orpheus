let recognition = null;
let isRecording = false;
let timer = null;
let incrementTimer = null;

window.pitchPracticeState = {
    currentStep: 'stage',
    selectedStage: '',
    selectedTime: '',
    selectedPitchType: 'straight',
    timeRemaining: 0,
    incrementTimeRemaining: 45
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

    if (screenName === 'ready' && window.pitchPracticeState.selectedPitchType === 'qa') {
        const readyContent = document.querySelector('.ready-content p');
        if (readyContent) {
            readyContent.textContent = "During this session you'll field questions and face objections. You'll be able to speak for 45 second increments (or until you hit the microphone button), receive questions/objections, respond to them, or continue on in your pitch.";
        }
    }

    const qaElements = document.querySelectorAll('.qa-mode-only');
    qaElements.forEach(element => {
        element.classList.toggle('show', window.pitchPracticeState.selectedPitchType === 'qa');
    });

    // Update feedback button text based on pitch type
    if (screenName === 'recording') {
        const feedbackBtn = document.getElementById('feedbackBtn');
        if (feedbackBtn) {
            feedbackBtn.textContent = window.pitchPracticeState.selectedPitchType === 'qa' ? 
                'Generate Question/Objection' : 'Generate Feedback';
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
        timeDisplay.textContent = formatTime(window.pitchPracticeState.timeRemaining);
    }
}

function updateIncrementTimer() {
    const incrementDisplay = document.getElementById('incrementDisplay');
    if (incrementDisplay) {
        incrementDisplay.textContent = formatTime(window.pitchPracticeState.incrementTimeRemaining);
    }
}

function startRecording() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Speech recognition is not supported in this browser. Please use Chrome.');
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
        document.getElementById('transcript').textContent = transcript;
    };

    recognition.start();
    isRecording = true;

    timer = setInterval(() => {
        if (window.pitchPracticeState.timeRemaining > 0) {
            window.pitchPracticeState.timeRemaining--;
            updateTimer();
        } else {
            stopRecording();
        }
    }, 1000);

    if (window.pitchPracticeState.selectedPitchType === 'qa') {
        incrementTimer = setInterval(() => {
            if (window.pitchPracticeState.incrementTimeRemaining > 0) {
                window.pitchPracticeState.incrementTimeRemaining--;
                updateIncrementTimer();
            } else {
                stopRecording();
                generateQuestion();
            }
        }, 1000);
    }
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
    }
    isRecording = false;
    clearInterval(timer);
    clearInterval(incrementTimer);
}

async function generateFeedback() {
    const transcript = document.getElementById('transcript')?.textContent;
    if (!transcript) {
        alert('Please record your pitch first!');
        return;
    }

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
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to generate feedback');
        }

        const feedbackList = document.getElementById('feedbackList');
        if (feedbackList) {
            feedbackList.innerHTML = data.feedback
                .filter(item => item.trim())
                .map(item => `<li>${item}</li>`)
                .join('');
        }

        const feedbackContainer = document.getElementById('feedbackContainer');
        if (feedbackContainer) {
            feedbackContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('Failed to generate feedback. Please try again.');
    }
}

async function generateQuestion() {
    stopRecording();  // This stops the recording and pauses timer
    
    const transcript = document.getElementById('transcript')?.textContent;
    if (!transcript) {
        alert('Please record your response first!');
        return;
    }

    try {
        const response = await fetch('/api/generate-question', {
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
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to generate question');
        }

        const question = data.response;
        if (!question || !question.content) {
            throw new Error('Invalid question format received');
        }

        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        questionElement.innerHTML = `
            <h4>${question.type === 'question' ? 'Question' : 'Objection'}</h4>
            <p>${question.content}</p>
            <div class="response" id="response-${Date.now()}"></div>
        `;
        
        const questionsList = document.getElementById('questionsList');
        if (questionsList) {
            questionsList.appendChild(questionElement);
            questionsList.scrollTop = questionsList.scrollHeight;
        }
        
        const continuePitchBtn = document.getElementById('continuePitchBtn');
        if (continuePitchBtn) {
            continuePitchBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error generating question:', error);
        alert('Failed to generate question. Please try again.');
    }
}

async function analyzeResponses() {
    const questions = document.querySelectorAll('.question-item');
    const responses = [];
    
    questions.forEach(question => {
        responses.push({
            question: question.querySelector('h4').textContent,
            content: question.querySelector('p').textContent,
            response: question.querySelector('.response').textContent
        });
    });
    
    try {
        const response = await fetch('/api/analyze-responses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                responses: responses,
                stage: window.pitchPracticeState.selectedStage
            })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to analyze responses');
        }

        displayAnalysis(data.analysis);
    } catch (error) {
        console.error('Error analyzing responses:', error);
        alert('Failed to analyze responses. Please try again.');
    }
}

function displayAnalysis(analysis) {
    const feedbackContainer = document.getElementById('feedbackContainer');
    const feedbackList = document.getElementById('feedbackList');
    
    if (!feedbackContainer || !feedbackList) return;
    
    feedbackList.innerHTML = '';
    const sections = analysis.split(/\d+\.\s+/).filter(Boolean);
    
    sections.forEach(section => {
        const [title, ...points] = section.split('\n').filter(Boolean);
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'feedback-section';
        sectionDiv.innerHTML = `
            <h4>${title.trim()}</h4>
            <ul>
                ${points.map(point => `<li>${point.trim().replace(/^[•-]\s*/, '')}</li>`).join('')}
            </ul>
        `;
        feedbackList.appendChild(sectionDiv);
    });
    
    feedbackContainer.classList.remove('hidden');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const stageButtons = document.querySelectorAll('.stage-btn');
    stageButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedStage = button.dataset.value;
            showScreen('time');
        });
    });

    const timeButtons = document.querySelectorAll('.time-btn');
    timeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const minutes = parseInt(button.dataset.value);
            window.pitchPracticeState.selectedTime = minutes;
            window.pitchPracticeState.timeRemaining = minutes * 60;
            showScreen('pitchType');
        });
    });

    const pitchTypeButtons = document.querySelectorAll('.pitch-type-btn');
    pitchTypeButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.pitchPracticeState.selectedPitchType = button.dataset.value;
            showScreen('ready');
        });
    });

    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            showScreen('recording');
            startRecording();
        });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.pitchPracticeState = {
                currentStep: 'stage',
                selectedStage: '',
                selectedTime: '',
                selectedPitchType: 'straight',
                timeRemaining: 0,
                incrementTimeRemaining: 45
            };
            showScreen('stage');
        });
    }

    const recordBtn = document.getElementById('recordBtn');
    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    if (feedbackBtn) {
        feedbackBtn.addEventListener('click', () => {
            if (window.pitchPracticeState.selectedPitchType === 'qa') {
                generateQuestion();
            } else {
                generateFeedback();
            }
        });
    }

    const continuePitchBtn = document.getElementById('continuePitchBtn');
    if (continuePitchBtn) {
        continuePitchBtn.addEventListener('click', () => {
            window.pitchPracticeState.incrementTimeRemaining = 45;
            startRecording();
            continuePitchBtn.style.display = 'none';
        });
    }

    const endSessionBtn = document.getElementById('endSessionBtn');
    if (endSessionBtn) {
        endSessionBtn.addEventListener('click', () => {
            if (window.pitchPracticeState.selectedPitchType === 'qa') {
                analyzeResponses();
            } else {
                stopRecording();
                generateFeedback();
            }
        });
    }

    const backButtons = document.querySelectorAll('.back-btn');
    backButtons.forEach(button => {
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
});
