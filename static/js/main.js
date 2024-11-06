// Only updating the generateFeedback function, rest of the file remains the same
async function generateFeedback() {
    stopRecording();
    
    const transcript = document.getElementById('transcript').textContent;
    if (!transcript) {
        alert('Please record your pitch first!');
        return;
    }

    const feedbackBtn = document.getElementById('feedbackBtn');
    feedbackBtn.disabled = true;
    feedbackBtn.textContent = 'Generating feedback...';

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

        const data = await response.json();
        
        if (data.success) {
            const feedbackContainer = document.getElementById('feedbackContainer');
            const feedbackList = document.getElementById('feedbackList');
            
            let feedbackPoints;
            try {
                feedbackPoints = typeof data.feedback === 'string' ? 
                    JSON.parse(data.feedback) : data.feedback;
            } catch (e) {
                feedbackPoints = {
                    feedback: [data.feedback]
                };
            }

            // Handle both array and object formats
            const feedbackArray = Array.isArray(feedbackPoints) ? 
                feedbackPoints : 
                Object.values(feedbackPoints).flat();

            feedbackList.innerHTML = feedbackArray
                .map(feedback => `<li>${feedback}</li>`)
                .join('');
            feedbackContainer.classList.remove('hidden');
        } else {
            alert('Failed to generate feedback. Please try again.');
        }
    } catch (error) {
        console.error('Error generating feedback:', error);
        alert('An error occurred while generating feedback. Please try again.');
    } finally {
        feedbackBtn.disabled = false;
        feedbackBtn.textContent = 'Generate Feedback';
    }
}
