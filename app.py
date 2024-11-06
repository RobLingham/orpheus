from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/generate-feedback', methods=['POST'])
def generate_feedback():
    # Mock feedback generation - in a real app, this would use NLP/AI
    feedback = [
        "Great introduction! You clearly stated the problem your startup is solving.",
        "Consider providing more specific details about your target market.",
        "Your explanation of the revenue model was clear and concise.",
        "Try to speak a bit slower when discussing technical aspects.",
        "Good job highlighting your team's expertise and experience."
    ]
    return jsonify({"feedback": feedback})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
