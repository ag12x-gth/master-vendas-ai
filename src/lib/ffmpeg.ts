
'use server';

// import ffmpeg from 'fluent-ffmpeg';
// import fs from 'fs/promises';

// Esta função agora importa dinamicamente os caminhos para evitar problemas de build com o Webpack.
export async function convertToOgg(): Promise<string> {
    if (process.env.NODE_ENV !== 'production') console.debug("A conversão de áudio para OGG está desativada para permitir o deploy.");
    throw new Error("A funcionalidade de conversão de áudio não está disponível no momento.");
}
