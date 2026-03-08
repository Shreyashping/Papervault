exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { category, subject, count } = JSON.parse(event.body);

    const prompt = `You are an expert Indian exam question setter. Generate exactly ${count} high-quality multiple choice questions for ${category} - ${subject}.

Rules:
- Questions must be relevant to the Indian curriculum (CBSE/NTA/NEET standards)
- Mix easy, medium and hard difficulty
- Each question must have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include a brief explanation for the correct answer
- Base questions on real PYQ patterns from JEE/NEET/CBSE exams

Respond ONLY with a valid JSON array, no markdown, no extra text:
[
  {
    "question": "Question text here",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct": "A",
    "explanation": "Brief explanation of why A is correct",
    "source": "AI Generated · ${category}"
  }
]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const clean = text.replace(/```json|```/g, "").trim();

    // Validate it's real JSON before returning
    JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: clean
    };

  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
