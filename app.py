from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from openai import OpenAI
import json
import random

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pitches.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Angel Investor Questions and Objections
ANGEL_INVESTOR_QUESTIONS = [
    "Can you describe your product/service and the problem it solves?",
    "What is your target market, and how big is it?",
    "Who are your main competitors, and how do you differentiate yourself?",
    "What is your go-to-market strategy?",
    "How do you plan to acquire customers?",
    "What is your current traction (revenue, customers, growth metrics, etc.)?",
    "What is your business model and revenue streams?",
    "How do you plan to scale the business?",
    "What is your burn rate, and how much runway do you have?",
    "What milestones will you achieve with this funding?",
    "Who is on your team, and what are their backgrounds?",
    "What is your valuation, and how did you determine it?",
    "What is your exit strategy?",
    "What are the key risks or challenges you foresee, and how will you mitigate them?",
    "What experience do you have in this industry?",
    "Do you have any intellectual property or competitive advantages?",
    "What are your current funding needs, and how will the funds be used?",
    "What are your projections for the next year, three years, etc.?",
    "How do you see the market evolving, and where does your company fit in that future?",
    "Do you have any existing partnerships or customer testimonials?",
    "Have you received any prior funding or investment? If so, from whom?",
    "What is your expected ROI for investors, and in what timeframe?",
    "Are there any regulatory or compliance issues to consider?",
    "What kind of support or involvement do you expect from investors?",
    "Do you have an advisory board or mentors?"
]

ANGEL_INVESTOR_OBJECTIONS = [
    "The market seems niche—how big do you see it growing, and how do you plan to capture a significant share?",
    "There are some established players in this space—what's your unique strategy for differentiating and gaining market share?",
    "Your current traction is limited—what milestones or indicators can you point to that show this will gain momentum?",
    "Your customer acquisition costs seem high—how are you planning to make this more sustainable as you scale?",
    "Scaling a business like this can be challenging—what strategies do you have to ensure scalable growth without spiraling costs?",
    "The revenue model isn't immediately clear—can you walk me through your key monetization strategies and how they'll evolve?",
    "I'm curious about how you arrived at this valuation—can you share the rationale and why you think it reflects the potential here?",
    "It's a challenging space—what makes you and your team uniquely positioned to execute successfully?",
    "Your current burn rate appears high—what milestones are you aiming to reach before the next round, and how are you managing costs?",
    "It seems like others could replicate this easily—what steps are you taking to create a durable competitive moat?",
    "Why do you believe now is the ideal time for this product/service to succeed?",
    "How have you validated that you've achieved product-market fit, and what signals are you looking for next?",
    "Can you elaborate on your exit strategy and what kind of opportunities you foresee for investors down the line?",
    "This technology looks complex—what technical hurdles do you anticipate, and how are you mitigating these risks?",
    "It seems like there are several moving parts—how are you prioritizing and focusing your efforts?",
    "This appears to have a high-risk profile—how do you plan to de-risk it for investors?",
    "I'd like to understand more about your sales strategy—how do you plan to acquire and retain customers?",
    "Can you break down your unit economics—how do they scale and lead to profitability?",
    "What are your customer retention strategies, and what data do you have on how well they're working?",
    "There may be regulatory hurdles or legal issues—how are you approaching this, and is it something you're actively considering?",
    "It's a crowded market—what makes your offering stand out, and why will customers choose you?",
    "Your financial projections appear ambitious—how did you arrive at these numbers, and what assumptions are they based on?",
    "What past experience or key metrics can you point to that demonstrate your ability to execute this plan?",
    "Is your intellectual property protected, and how does it give you a defensible edge?",
    "I'm curious about your personal commitment to this venture—what level of time, effort, and investment have you put in?"
]

class Pitch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stage = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    transcript = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()

def analyze_pitch_content(transcript: str) -> dict:
    prompt = f'''Analyze this pitch transcript and identify the main topics discussed:
    Transcript: {transcript}
    
    Return a JSON object with these keys:
    - main_topics: List of main topics covered
    - missing_topics: List of important topics not covered
    - stage: Current stage of the pitch (early/middle/late)'''

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}]
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error analyzing pitch: {str(e)}")
        return {"main_topics": [], "missing_topics": [], "stage": "early"}

def generate_default_question() -> dict:
    default_questions = [
        "Could you elaborate more on that point?",
        "How do you see this evolving in the future?",
        "What metrics are you using to measure success?",
        "Can you provide more specific examples?",
        "What are the key challenges you're facing?"
    ]
    return {"type": "question", "content": random.choice(default_questions)}

def generate_question_or_objection(transcript: str, stage: str) -> dict:
    if stage != 'angel':
        # Default behavior for non-angel pitches
        return generate_default_question()
    
    # Analyze pitch content
    analysis = analyze_pitch_content(transcript)
    
    # Determine if we should ask about a missing topic or challenge an existing one
    if analysis['missing_topics'] and random.random() < 0.7:
        # 70% chance to ask about missing topics
        topic = random.choice(analysis['missing_topics'])
        question = next((q for q in ANGEL_INVESTOR_QUESTIONS if topic.lower() in q.lower()), None)
        if question:
            return {"type": "question", "content": question}
    
    # 30% chance to raise an objection about current content
    if analysis['main_topics']:
        topic = random.choice(analysis['main_topics'])
        objection = next((o for o in ANGEL_INVESTOR_OBJECTIONS if topic.lower() in o.lower()), None)
        if objection:
            return {"type": "objection", "content": objection}
    
    # Fallback to random selection
    if random.random() < 0.5:
        return {"type": "question", "content": random.choice(ANGEL_INVESTOR_QUESTIONS)}
    else:
        return {"type": "objection", "content": random.choice(ANGEL_INVESTOR_OBJECTIONS)}

def generate_ai_feedback(transcript: str, stage: str) -> dict:
    prompt = f'''Analyze this {stage} pitch and provide actionable feedback. 
    Return your analysis in this exact JSON format:
    {{
        "opening_and_hook": "detailed feedback about the opening",
        "value_proposition": "detailed feedback about the value proposition",
        "market_understanding": "detailed feedback about market understanding",
        "delivery_and_communication": "detailed feedback about delivery",
        "areas_for_improvement": ["point 1", "point 2", "point 3"]
    }}
    
    Transcript: {transcript}'''

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[{
                "role": "user", 
                "content": prompt
            }],
            temperature=0.7,
            max_tokens=1000
        )
        
        feedback_json = json.loads(response.choices[0].message.content.strip())
        
        # Validate the response structure
        required_keys = [
            "opening_and_hook",
            "value_proposition",
            "market_understanding",
            "delivery_and_communication",
            "areas_for_improvement"
        ]
        
        if not all(key in feedback_json for key in required_keys):
            raise ValueError("Invalid feedback format")
            
        if not isinstance(feedback_json["areas_for_improvement"], list):
            raise ValueError("areas_for_improvement must be a list")
            
        return {
            "success": True,
            "feedback": feedback_json
        }
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {str(e)}")
        return {
            "success": False,
            "error": "Failed to parse feedback response"
        }
    except Exception as e:
        print(f"Error generating feedback: {str(e)}")
        return {
            "success": False,
            "error": "Unable to generate AI feedback at this time."
        }

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
            return jsonify({'success': False, 'message': 'No data received'}), 400
            
        if 'transcript' not in data or 'stage' not in data:
            return jsonify({'success': False, 'message': 'Missing transcript or stage'}), 400
        
        transcript = data.get('transcript')
        stage = data.get('stage')
        
        if not transcript or not transcript.strip():
            return jsonify({'success': False, 'message': 'Empty transcript'}), 400
        
        feedback = generate_ai_feedback(transcript, stage)
        return jsonify(feedback)  # Return the feedback directly since it's already formatted correctly
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