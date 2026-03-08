/* PaperVault — AI Quiz Generator (Netlify Function)
   Requires: ANTHROPIC_API_KEY set in Netlify → Site settings → Environment variables */

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return {
    statusCode: 500, headers,
    body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured — go to Netlify → Site Settings → Environment Variables and add it.' })
  };

  let category, subject, count;
  try { ({ category, subject, count = 10 } = JSON.parse(event.body)); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  const LABELS = {
    class10:   'Class 10 CBSE Boards',
    class11:   'Class 11 CBSE',
    class12:   'Class 12 CBSE Boards',
    jee_mains: 'JEE Mains',
    jee_adv:   'JEE Advanced',
    neet:      'NEET'
  };

  const exam     = LABELS[category] || category;
  const pyqCount = Math.ceil(count * 0.6);
  const aiCount  = count - pyqCount;

  const prompt = `You are an expert quiz creator for Indian competitive exams.

Create exactly ${count} MCQ questions for **${exam} — ${subject}**.

STEP 1: Search the web for actual Previous Year Questions (PYQs) from ${exam} ${subject} papers. Search on:
- embibe.com, byjus.com, vedantu.com, toppr.com
- Official NTA/CBSE paper archives
- Search query: "${exam} ${subject} previous year questions MCQ with solutions"

STEP 2: Pick the best ${pyqCount} genuine PYQ questions you find (with their actual year and source).

STEP 3: Create ${aiCount} additional high-quality, original MCQ questions that match the difficulty and style of ${exam} ${subject}.

STEP 4: Return ONLY a JSON array — no markdown, no explanation, no text before or after. Start with [ and end with ].

Required format:
[
  {
    "question": "Full question text here",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct": "B",
    "explanation": "Detailed explanation of the correct answer",
    "source": "JEE Mains 2022",
    "type": "pyq"
  },
  {
    "question": "AI-generated question",
    "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...",
    "correct": "A",
    "explanation": "...",
    "source": "AI Generated",
    "type": "ai"
  }
]

Rules:
- "type" must be exactly "pyq" or "ai"
- "correct" must be exactly "A", "B", "C", or "D"
- All questions must be appropriate for ${exam} difficulty
- Explanations must be clear and educational
- Return ONLY the JSON array — no other text whatsoever`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: res.status, headers, body: JSON.stringify({ error: `Anthropic API error: ${err}` }) };
    }

    const data  = await res.json();
    const text  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);

    if (!match) return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Could not extract questions from AI response', preview: text.slice(0, 300) })
    };

    let questions;
    try { questions = JSON.parse(match[0]); }
    catch (e) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'JSON parse failed: ' + e.message }) };
    }

    // Validate + normalise
    questions = questions
      .filter(q => q.question && q.option_a && q.option_b && q.option_c && q.option_d && q.correct)
      .map(q => ({
        question:    String(q.question),
        option_a:    String(q.option_a),
        option_b:    String(q.option_b),
        option_c:    String(q.option_c),
        option_d:    String(q.option_d),
        correct:     String(q.correct).toUpperCase().charAt(0),
        explanation: String(q.explanation || 'Refer to your study material for explanation.'),
        source:      String(q.source || 'AI Generated'),
        type:        q.type === 'pyq' ? 'pyq' : 'ai'
      }));

    return { statusCode: 200, headers, body: JSON.stringify({ questions }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
