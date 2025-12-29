'use server';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';

// Configura o path do binário estático
if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
    console.log(`[FFMPEG] Binário configurado: ${ffmpegStatic}`);
} else {
    console.error('[FFMPEG] ERRO CRÍTICO: ffmpeg-static não encontrado!');
}
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

/**
 * Converte um arquivo de áudio (geralmente OGG do WhatsApp) para MP3.
 * Útil para enviar para APIs que exigem MP3 (OpenAI Whisper, Vapi, etc).
 * 
 * @param inputPath Caminho absoluto do arquivo de entrada
 * @returns Caminho absoluto do arquivo de saída (MP3)
 */
export async function convertToMp3(inputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const outputFilename = `${uuidv4()}.mp3`;
        const outputPath = path.join(tempDir, outputFilename);

        console.log(`[FFMPEG] Iniciando conversão: ${inputPath} -> ${outputPath}`);

        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('end', () => {
                console.log(`[FFMPEG] Conversão concluída: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[FFMPEG] Erro na conversão:', err);
                reject(err);
            })
            .save(outputPath);
    });
}

/**
 * Converte um arquivo de áudio para OGG (Formato preferido do WhatsApp/Baileys).
 * 
 * @param inputPath Caminho absoluto do arquivo de entrada
 * @returns Caminho absoluto do arquivo de saída (OGG)
 */
export async function convertToOgg(inputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const outputFilename = `${uuidv4()}.ogg`;
        const outputPath = path.join(tempDir, outputFilename);

        console.log(`[FFMPEG] Iniciando conversão para OGG: ${inputPath} -> ${outputPath}`);

        ffmpeg(inputPath)
            .toFormat('ogg')
            .audioCodec('libopus') // Codec padrão do WhatsApp
            .on('end', () => {
                console.log(`[FFMPEG] Conversão OGG concluída: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[FFMPEG] Erro na conversão OGG:', err);
                reject(err);
            })
            .save(outputPath);
    });
}
