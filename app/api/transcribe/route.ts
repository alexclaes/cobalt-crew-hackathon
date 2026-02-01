import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is 25MB, got ${Math.round(audioFile.size / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    console.log(`[Whisper] Processing audio file: ${audioFile.name}, size: ${Math.round(audioFile.size / 1024)}KB`);

    // Convert File to Buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create temp file path
    const tmpDir = '/tmp';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = audioFile.name.split('.').pop() || 'webm';
    const tmpPath = path.join(tmpDir, `audio-${timestamp}-${random}.${extension}`);

    try {
      // Write audio to temporary file
      await writeFile(tmpPath, buffer);

      // Transcribe with OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(tmpPath),
        model: 'whisper-1',
        language: 'en', // Can be omitted for auto-detection
        response_format: 'json',
      });

      console.log(`[Whisper] Transcription successful: "${transcription.text.substring(0, 100)}..."`);

      return NextResponse.json({
        transcription: transcription.text,
        duration: audioFile.size, // Approximate indicator
      });

    } finally {
      // Clean up temporary file
      try {
        await unlink(tmpPath);
        console.log(`[Whisper] Cleaned up temp file: ${tmpPath}`);
      } catch (cleanupError) {
        console.warn(`[Whisper] Failed to clean up temp file: ${tmpPath}`, cleanupError);
      }
    }

  } catch (error) {
    console.error('[Whisper] Transcription error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to transcribe audio',
          details: error.message 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 502 }
    );
  }
}
