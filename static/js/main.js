[Previous content from line 1-21 remains the same...]

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
            feedbackBtn.textContent = state.selectedPitchType === 'qa' ? 'Generate Question/Objection' : 'Generate Feedback';
        }
    }
}

[Previous content from line 53-143 remains the same...]

async function generateQuestion() {
    stopRecording();  // This stops the recording and pauses timer
    
    const transcript = document.getElementById('transcript')?.textContent;
    if (!transcript) {
        alert('Please record your response first!');
        return;
    }

    const state = window.pitchPracticeState;
    const questionsList = document.getElementById('questionsList');
    const continuePitchBtn = document.getElementById('continuePitchBtn');

    if (!questionsList || !continuePitchBtn) return;

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
        
        const data = await response.json();
        if (data.success) {
            displayAnalysis(data.analysis);
        }
    } catch (error) {
        console.error('Error analyzing responses:', error);
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

[Previous content remains the same until the DOM event listeners...]

    // End Session Button
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

[Rest of the previous content remains the same...]
