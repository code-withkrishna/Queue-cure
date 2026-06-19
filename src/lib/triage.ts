// ============================================================
// AI Triage Engine — powered by Groq (LLaMA 3.1 8B Instant)
// Groq is free-tier friendly and extremely fast (<500ms)
// Classifies chief complaint → ROUTINE | URGENT | EMERGENCY
// Fail-safe: never blocks patient registration on API error
// ============================================================

export type TriagePriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface TriageResult {
  priority: TriagePriority;
  note: string;
}

const SYSTEM_PROMPT = `You are a medical triage assistant for a neighborhood clinic receptionist.
Given a brief chief complaint, classify it into exactly one priority level and give a
one-sentence (max 12 words) reasoning note for the receptionist.

Respond ONLY with a valid JSON object in this exact format:
{"priority":"ROUTINE","note":"Short note for receptionist here"}

Priority definitions:
- EMERGENCY: life-threatening (chest pain, difficulty breathing, loss of consciousness, severe bleeding, stroke symptoms, seizure)
- URGENT: needs same-day attention (high fever, moderate pain, suspected fracture, vomiting, severe headache, eye injury)
- ROUTINE: non-urgent (follow-up, minor cold, prescription refill, check-up, minor ache, vaccination)

Be conservative: when in doubt, classify one level higher.
Return only the JSON object — no preamble, no markdown fences.`;

export async function classifyTriage(complaint: string): Promise<TriageResult> {
  const fallback: TriageResult = {
    priority: 'ROUTINE',
    note: 'Auto-classification unavailable',
  };

  if (!complaint?.trim()) {
    return { priority: 'ROUTINE', note: 'No complaint provided' };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.1-8b-instant', // fast, free, perfect for structured triage
        max_tokens:  120,
        temperature: 0.1,                   // low temp → consistent JSON output
        response_format: { type: 'json_object' }, // Groq JSON mode — no fences possible
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: complaint.trim() },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[classifyTriage] Groq API error:', response.status, errBody);
      return fallback;
    }

    const data   = await response.json();
    const text   = data.choices?.[0]?.message?.content ?? '';
    const parsed: TriageResult = JSON.parse(text);

    if (!['ROUTINE', 'URGENT', 'EMERGENCY'].includes(parsed.priority)) {
      throw new Error(`Invalid priority returned: ${parsed.priority}`);
    }

    return {
      priority: parsed.priority,
      note:     String(parsed.note ?? '').slice(0, 120),
    };
  } catch (err) {
    console.error('[classifyTriage] parse/network error:', err);
    return fallback; // NEVER block patient registration
  }
}
