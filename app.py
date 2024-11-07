from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from openai import OpenAI
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pitches.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class Pitch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stage = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

def generate_ai_feedback(transcript: str, stage: str) -> list:
    prompt = f'''Analyze this {stage} pitch and provide actionable feedback:
    Transcript: {transcript}
    
    Please provide feedback in these categories:
    1. Opening and Hook
    2. Value Proposition
    3. Market Understanding
    4. Delivery and Communication
    5. Areas for Improvement
    
    Format each section with a number and title, followed by detailed feedback.'''

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        feedback_text = response.choices[0].message.content
        # Split feedback into sections and filter empty sections
        feedback_sections = [section.strip() for section in feedback_text.split('\n\n') if section.strip()]
        
        if not feedback_sections:
            return ["Unable to generate feedback. Please try again."]
            
        return feedback_sections
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        return ["Unable to generate AI feedback at this time. Please try again later."]

def generate_question_or_objection(transcript: str, stage: str) -> dict:
    prompt = f'''Based on this {stage} pitch transcript, generate a relevant investor question or objection:
    Transcript: {transcript}
    
    Generate a challenging but constructive question that an investor might ask.
    Format your response as: {{"type": "question", "content": "Your question here"}} or {{"type": "objection", "content": "Your objection here"}}
    Make it specific to the pitch content.'''

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        # Parse the response text as JSON
        response_text = response.choices[0].message.content.strip()
        return json.loads(response_text)
    except Exception as e:
        print(f"Error generating question: {str(e)}")
        return {"type": "question", "content": "Could you elaborate more on your business model?"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/save-transcript', methods=['POST'])
def save_transcript():
    try:
        data = request.get_json()
        if not data:
            print("No JSON data received in save_transcript")
            return jsonify({'success': False, 'message': 'No data received'}), 400
            
        if 'stage' not in data or 'duration' not in data or 'transcript' not in data:
            print("Missing required fields in save_transcript")
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        if not data['transcript'].strip():
            print("Empty transcript in save_transcript")
            return jsonify({'success': True, 'message': 'No transcript to save'}), 200

        new_pitch = Pitch(
            stage=data['stage'],
            duration=data['duration'],
            transcript=data['transcript']
        )
        db.session.add(new_pitch)
        db.session.commit()
        print("Transcript saved successfully")
        return jsonify({'success': True, 'message': 'Transcript saved successfully'})
    except Exception as e:
        db.session.rollback()
        print(f"Error saving transcript: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/generate-feedback', methods=['POST'])
def get_feedback():
    try:
        data = request.get_json()
        if not data:
            print("No JSON data received in generate_feedback")
            return jsonify({'success': False, 'message': 'No data received'}), 400
            
        if 'transcript' not in data or 'stage' not in data:
            print("Missing transcript or stage in generate_feedback")
            return jsonify({'success': False, 'message': 'Missing transcript or stage'}), 400
        
        transcript = data.get('transcript')
        stage = data.get('stage')
        
        if not transcript or not transcript.strip():
            print("Empty transcript in generate_feedback")
            return jsonify({'success': False, 'message': 'Empty transcript'}), 400
        
        feedback = generate_ai_feedback(transcript, stage)
        if not feedback:
            return jsonify({'success': False, 'message': 'Failed to generate feedback'}), 500
            
        return jsonify({'success': True, 'feedback': feedback})
    except Exception as e:
        print(f"Error in generate_feedback route: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while generating feedback'}), 500

@app.route('/api/generate-question', methods=['POST'])
def generate_question():
    try:
        data = request.get_json()
        if not data:
            print("No JSON data received in generate_question")
            return jsonify({'success': False, 'message': 'No data received'}), 400
            
        if 'transcript' not in data or 'stage' not in data:
            print("Missing transcript or stage in generate_question")
            return jsonify({'success': False, 'message': 'Missing transcript or stage'}), 400
        
        transcript = data.get('transcript')
        stage = data.get('stage')
        
        if not transcript or not transcript.strip():
            print("Empty transcript in generate_question")
            return jsonify({'success': False, 'message': 'Empty transcript'}), 400
        
        question = generate_question_or_objection(transcript, stage)
        if not question:
            return jsonify({'success': False, 'message': 'Failed to generate question'}), 500
            
        return jsonify({'success': True, 'response': question})
    except Exception as e:
        print(f"Error in generate_question route: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while generating question'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
