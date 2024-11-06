[Previous content remains the same until generateQuestion function]

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
            let question;
            try {
                // Handle both string and parsed JSON responses
                question = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
            } catch (parseError) {
                console.error('Error parsing question response:', parseError);
                question = {
                    type: 'question',
                    content: 'Could you elaborate more on your pitch?'
                };
            }

            const questionElement = document.createElement('div');
            questionElement.className = 'question-item';
            questionElement.innerHTML = `
                <h4>${question.type === 'question' ? 'Question' : 'Objection'}</h4>
                <p>${question.content}</p>
                <div class="response" id="response-${Date.now()}"></div>
            `;
            questionsList.appendChild(questionElement);
            questionsList.scrollTop = questionsList.scrollHeight;
            
            // Show continue button
            continuePitchBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error generating question:', error);
        // Add fallback question in case of error
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        questionElement.innerHTML = `
            <h4>Question</h4>
            <p>Could you elaborate more on your pitch?</p>
            <div class="response" id="response-${Date.now()}"></div>
        `;
        questionsList.appendChild(questionElement);
        continuePitchBtn.style.display = 'block';
    }
}

[Rest of the file remains the same]
