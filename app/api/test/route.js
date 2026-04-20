import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const nlpEngine = global.__nlpEngine;
    if (!nlpEngine) {
      return NextResponse.json({ error: 'NLP Engine belum siap' }, { status: 503 });
    }

    const body = await request.json();
    if (!body.message) {
      return NextResponse.json({ error: 'Parameter "message" diperlukan' }, { status: 400 });
    }

    const result = nlpEngine.processMessage(body.message);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
