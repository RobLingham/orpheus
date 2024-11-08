// All previous code remains the same...

document.addEventListener('DOMContentLoaded', function() {
    // Previous event listeners remain the same...

    document.getElementById('saveAndContinueBtn').addEventListener('click', async function() {
        try {
            const transcript = document.getElementById('transcript')?.textContent;
            if (!transcript) return;

            // Save transcript
            const response = await fetch('/api/save-transcript', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transcript: transcript,
                    stage: window.pitchPracticeState.selectedStage,
                    duration: parseInt(window.pitchPracticeState.selectedTime) * 60 - window.pitchPracticeState.timeRemaining
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save transcript');
            }

            // Reset recording state but maintain session
            document.getElementById('transcript').textContent = '';
            document.getElementById('feedbackContainer').classList.add('hidden');
            
            if (window.pitchPracticeState.selectedPitchType === 'qa') {
                // Reset for next Q&A segment
                window.pitchPracticeState.incrementTimeRemaining = 30;
                document.getElementById('incrementDisplay').textContent = '0:30';
                document.getElementById('generateQuestionBtn').style.display = 'block';
            }

            // Show success message
            const successModal = document.getElementById('successModal');
            if (successModal) {
                successModal.classList.remove('hidden');
                if (typeof confetti !== 'undefined') {
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                }
            }
        } catch (error) {
            console.error('Error saving transcript:', error);
            alert('Failed to save transcript. Please try again.');
        }
    });

    document.getElementById('reviewAnalysisBtn').addEventListener('click', function() {
        document.getElementById('successModal').classList.add('hidden');
        // Add code here to show analysis view when implemented
    });

    document.getElementById('returnHomeBtn').addEventListener('click', function() {
        document.getElementById('successModal').classList.add('hidden');
        resetSession();
    });
});
