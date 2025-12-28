
import { convertToMp3, convertToOgg } from '../src/lib/ffmpeg';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';

const execPromise = util.promisify(exec);

async function runTest() {
    console.log("=== INICIANDO TESTE DE INFRAESTRUTURA DE ÁUDIO ===");

    // 1. Verificar binário FFMPEG
    try {
        const { stdout } = await execPromise('ffmpeg -version');
        console.log("✅ FFMPEG Binário encontrado:\n", stdout.split('\n')[0]);
    } catch (e) {
        console.error("❌ FFMPEG Binário NÃO encontrado no PATH do sistema.");
        console.error("   Certifique-se de que o pkgs.ffmpeg-full foi instalado no replit.nix");
        process.exit(1);
    }

    // 2. Criar arquivo Dummy (.ogg)
    const dummyOgg = path.join(process.cwd(), 'temp_test_audio.ogg');
    console.log(`\n🔊 Gerando arquivo de teste: ${dummyOgg}`);

    try {
        // Gera um tom senoidal de 3 segundos
        await execPromise(`ffmpeg -y -f lavfi -i "sine=frequency=1000:duration=3" -c:a libvorbis "${dummyOgg}"`);
        if (fs.existsSync(dummyOgg)) {
            const stats = fs.statSync(dummyOgg);
            console.log(`✅ Arquivo OGG criado com sucesso (${stats.size} bytes).`);
        } else {
            throw new Error("Arquivo não foi criado.");
        }
    } catch (e) {
        console.error("❌ Falha ao criar arquivo dummy:", e);
        process.exit(1);
    }

    // 3. Testar Conversão (OGG -> MP3)
    console.log("\n🔄 Testando OGG -> MP3 (Simulando msg do WhatsApp -> IA)...");
    try {
        const mp3Path = await convertToMp3(dummyOgg);
        if (fs.existsSync(mp3Path)) {
            const stats = fs.statSync(mp3Path);
            console.log(`✅ SUCESSO! Arquivo convertido para MP3: ${mp3Path}`);
            console.log(`   Tamanho: ${stats.size} bytes`);

            // Cleanup MP3
            fs.unlinkSync(mp3Path);
        } else {
            console.error("❌ O arquivo MP3 não foi encontrado após a conversão.");
        }
    } catch (e) {
        console.error("❌ Erro na conversão para MP3:", e);
    }

    // 4. Testar Conversão (MP3 -> OGG)
    console.log("\n🔄 Testando MP3 -> OGG (Simulando IA -> WhatsApp)...");
    try {
        // Re-usando o OGG como fonte apenas para teste, ou criando um MP3 dummy se necessario
        // Vamos converter o proprio OGG de volta para OGG (transcode) só para testar a função
        const oggPath = await convertToOgg(dummyOgg);
        if (fs.existsSync(oggPath)) {
            const stats = fs.statSync(oggPath);
            console.log(`✅ SUCESSO! Arquivo transcoded para OGG: ${oggPath}`);
            console.log(`   Tamanho: ${stats.size} bytes`);

            fs.unlinkSync(oggPath);
        }
    } catch (e) {
        console.error("❌ Erro na conversão para OGG:", e);
    }

    // Cleanup Origem
    if (fs.existsSync(dummyOgg)) fs.unlinkSync(dummyOgg);
    console.log("\n=== TESTE FINALIZADO ===");
}

runTest();
