import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { handleError, json, parseBody } from '@/lib/api';
import { aiGuard, loadFitnessContext } from '@/lib/ai-service';
import { chatWithAIAssistant } from '@/lib/gemini';

const schema = z.object({ message: z.string().trim().min(1, 'Message is required.').max(1000, 'Message is too long (max 1000 characters).') });

export async function POST(req: NextRequest) {
  try {
    const { message } = await parseBody(req, schema);
    const { user, subscription } = await aiGuard(req, 'chat');

    // Conversation history comes from the database, not from client-supplied data.
    const past = await db.select('ai_chat_messages', { eq: { user_id: user.id }, order: ['created_at', 'desc'], limit: 6 });
    const history = past.reverse().map((m) => ({ role: m.role as 'user' | 'model', parts: String(m.content).slice(0, 1500) }));

    const { metrics, goal } = await loadFitnessContext(user.id);
    const reply = await chatWithAIAssistant(message, history, {
      name: user.full_name,
      goal: goal.primary_goal,
      weight: metrics.current_weight_kg,
      plan: subscription?.plan,
    });

    await db.insert('ai_chat_messages', { user_id: user.id, role: 'user', content: message });
    await db.insert('ai_chat_messages', { user_id: user.id, role: 'model', content: reply.slice(0, 8000) });
    return json({ reply });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { requirePremium } = await import('@/lib/api');
    const { user } = await requirePremium(req);
    const rows = await db.select('ai_chat_messages', { eq: { user_id: user.id }, order: ['created_at', 'desc'], limit: 30 });
    return json({ messages: rows.reverse().map((m) => ({ role: m.role, parts: m.content })) });
  } catch (e) {
    return handleError(e);
  }
}
