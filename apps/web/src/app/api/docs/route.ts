import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    // Using process.cwd() assumes we are in apps/web, but docs are in root.
    // Monorepo root is usually two levels up from apps/web
    const docsDir = path.resolve(process.cwd(), '../../docs');

    if (file) {
        // Security check: ensure no directory traversal
        const safePath = path.resolve(docsDir, file);
        if (!safePath.startsWith(docsDir)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
        }

        try {
            const content = fs.readFileSync(safePath, 'utf-8');
            return NextResponse.json({ content });
        } catch (e) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }
    } else {
        try {
            const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
            return NextResponse.json({ files });
        } catch (e) {
            // Fallback for different CWD scenarios
            return NextResponse.json({ files: [], error: String(e), cwd: process.cwd() });
        }
    }
}
