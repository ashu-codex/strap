import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { strapStore } from '@/lib/store';
import { chatWithAIAssistant } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { user, isPremium, subscription } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isPremium) {
      return NextResponse.json(
        {
          error: 'AI Fitness Assistant is exclusively available to STRAP Premium members.',
          isPremium: false,
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const goal = strapStore.goals.get(user.id);
    const metrics = strapStore.metrics.get(user.id);

    const userContext = {
      name: user.full_name,
      goal: goal?.primary_goal,
      weight: metrics?.current_weight_kg,
      plan: subscription?.plan,
    };

    const reply = await chatWithAIAssistant(message, history || [], userContext);

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
