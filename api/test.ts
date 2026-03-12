import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.TRANSIT_511_API_KEY;
    const url = req.query.url as string;
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}api_key=${apiKey}&format=json`);
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    res.send(Buffer.from(buffer));
  } catch (e: any) {
    res.status(500).send(e.message);
  }
}
