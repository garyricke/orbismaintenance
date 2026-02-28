// Fetches a Google Doc as plain text server-side, avoiding CORS entirely.
// The doc must be shared as "Anyone with the link — Viewer".

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get('id');

  if (!docId) {
    return new Response('Missing doc id', { status: 400 });
  }

  const docUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const upstream = await fetch(docUrl);

  if (!upstream.ok) {
    return new Response(
      `Could not fetch Google Doc (${upstream.status}). ` +
      `Make sure it is shared as "Anyone with the link — Viewer".`,
      { status: upstream.status }
    );
  }

  const text = await upstream.text();

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  });
};

export const config = { path: '/api/doc' };
