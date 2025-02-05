const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Sistema de logs melhorado
const log = {
    info: (message) => {
        const timestamp = new Date().toISOString();
        console.log(`[INFO][${timestamp}] ${message}`);
        fs.appendFileSync('bot.log', `[INFO][${timestamp}] ${message}\n`);
    },
    error: (message, error) => {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR][${timestamp}] ${message}`, error);
        fs.appendFileSync('error.log', `[ERROR][${timestamp}] ${message} ${error}\n`);
    }
};

// Caminho para o Chrome
const chromePath = '/usr/bin/google-chrome';

// Configuração do cliente com sistema de recuperação
const client = new Client({
    puppeteer: {
        executablePath: chromePath,
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--remote-debugging-port=9222',
            '--max-memory=512M',
        ],
    },
    webVersionCache: {
        type: 'none',
    },
    restartOnAuthFail: true,
});

const userStates = new Map();
const messagesSent = new Map();
const finishedConversations = new Set();

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function checkMessageSent(userId, stage) {
    return messagesSent.get(`${userId}-${stage}`);
}

function markMessageAsSent(userId, stage) {
    messagesSent.set(`${userId}-${stage}`, true);
}

// Sistema de retry melhorado
async function withRetry(operation, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            log.error(`Tentativa ${attempt}/${maxAttempts} falhou`, error);
            if (attempt < maxAttempts) {
                await delay(2000 * attempt);
            }
        }
    }
    throw lastError;
}

async function sendMedia(msg, mediaPath, options = {}) {
    return withRetry(async () => {
        const absolutePath = path.resolve(__dirname, mediaPath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Arquivo não encontrado: ${absolutePath}`);
        }
        const media = MessageMedia.fromFilePath(absolutePath);
        return await client.sendMessage(msg.from, media, options);
    });
}

async function sendMultipleVideos(msg, videoPaths) {
    try {
        if (!videoPaths || !Array.isArray(videoPaths)) {
            throw new Error('Caminhos dos vídeos inválidos ou não fornecidos.');
        }

        for (const videoPath of videoPaths) {
            try {
                await sendMedia(msg, videoPath);
                log.info(`Vídeo enviado com sucesso: ${videoPath}`);
                if (videoPaths.indexOf(videoPath) < videoPaths.length - 1) {
                    await delay(6000);
                }
            } catch (error) {
                log.error(`Erro ao enviar vídeo ${videoPath}:`, error);
            }
        }
    } catch (error) {
        log.error('Erro ao enviar vídeos:', error);
    }
}

async function processNextStage(userId, msg, currentStage) {
    try {
        if (finishedConversations.has(userId)) {
            log.info('Conversa já finalizada para o usuário:', userId);
            return;
        }

        const chat = await msg.getChat();

        if (checkMessageSent(userId, currentStage)) {
            log.info(`Mensagem já enviada para o estágio: ${currentStage}`);
            return;
        }

        switch (currentStage) {
            case 'initial':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Oii amor, que bom que me chamou❤️ \n');

                await delay(3000);
                await chat.sendStateTyping();
                await delay(5000);

                await client.sendMessage(msg.from, 'Vou lhe enviar um áudio te explicando, momentinho vida');
                await delay(5000);
                await chat.sendStateRecording();
                await delay(10000);

                await sendMedia(msg, './audio1.ogg', { sendAudioAsVoice: true });

                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Você tem interesse amor? 😈🔥');

                userStates.set(userId, 'waiting_preview');
                break;

            case 'waiting_preview':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await client.sendMessage(msg.from, 'Vou te enviar uma prévia minha e da minha amiga meu lindo🥰');
                await delay(8000);

                const videos = [
                    './video1.mp4',
                    './video3.mp4'
                ];
                await sendMultipleVideos(msg, videos);

                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                await sendMedia(msg, './audio2.ogg', { sendAudioAsVoice: true });

                await delay(3000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Você gostou bb?🥰');

                userStates.set(userId, 'waiting_peladinha');
                break;

            case 'waiting_peladinha':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Amor você está perdendo tempo de me ver de quatro brincando com minha pepequinha');

                await delay(10000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'No meu grupinho privado tem muito mais conteúdos gostoso mostrando minha bucetinha toda molhada e sentando gostoso até eu gozar, você vai ficar de pau duro seu safadinho😏🥰');

                await delay(10000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Me deu vontade de te mostrar minha bucetinha, você quer amor?');

                userStates.set(userId, 'waiting_promise');
                break;

            case 'waiting_promise':
                markMessageAsSent(userId, currentStage);
                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                await sendMedia(msg, './audio3.ogg', { sendAudioAsVoice: true });

                await delay(10000);
                await chat.sendStateTyping();
                await delay(3000);
                await client.sendMessage(msg.from, 'Por hoje vou deixar por menos de 15 reais só para você meu bb, aproveite rsrs');

                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                await sendMedia(msg, './audio5.ogg', { sendAudioAsVoice: true });

                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Mas me diz amor, que você vai assinar mesmo meu conteúdo e não vai perder essa chance de me ver peladinha?😈');
                await delay(10000);
                await chat.sendStateTyping();
                await delay(3000);
                await client.sendMessage(msg.from, 'Não me fale que você não vai ter menos que 15 reais bb?');

                userStates.set(userId, 'waiting_for_price_response');
                break;

            case 'waiting_for_price_response':
                markMessageAsSent(userId, currentStage);
                userStates.set(userId, 'waiting_final_promise');
                await processNextStage(userId, msg, 'waiting_final_promise');
                break;

            case 'waiting_final_promise':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Ainn vida, que sorte a minhaa😍😍');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Fiquei louca pra sentir sua rola bem gostosa na minha boca e na minha bucetinha bem quentinha');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Mas antes de eu te enviar meu link com a promoção, me promete que depois você vai marcar comigo?🥹');
                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Me promete que vamos marcar pra você me comer gostoso?😏');

                userStates.set(userId, 'sending_link');
                break;

            case 'sending_link':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Ameeei, vou te enviar o link pra a gente gozar bem gostoso juntinhos');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(10000);
                await client.sendMessage(msg.from, 'Clique aqui para pagar e ver minha bucetinha toda molhada💦😏\n 👉 https://pay.buymercadovital.com/rn4RgQV8kAW3wBV 👈');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Aaa amorzinho e lembrando, assim que você pagar, aguarde ser confirmado o pagamento que irá liberar seu acesso, tá?🥰');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Te espero lá bb😈🔥');

                userStates.set(userId, 'waiting_before_audio6');
                break;

            case 'waiting_before_audio6':
                markMessageAsSent(userId, currentStage);
                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                await sendMedia(msg, './audio6.ogg', { sendAudioAsVoice: true });

                userStates.set(userId, 'waiting_after_audio6');
                break;

            case 'waiting_after_audio6':
                markMessageAsSent(userId, currentStage);
                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Amorzinho, eu só posso continuar nossa conversa se você assinar meu conteúdo clicando no link que te enviei');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Vou te enviar aqui em baixo novamente caso não tenha encontrado, tá?');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, '🥰👇🏼\n https://pay.buymercadovital.com/rn4RgQV8kAW3wBV');

                await delay(5000);
                await chat.sendStateTyping();
                await delay(8000);
                await client.sendMessage(msg.from, 'Compre vai meu bb, deixa eu te fazer gozar mostrando minha bucetinha toda molhada🤤😈');

                finishedConversations.add(userId);
                userStates.delete(userId);
                break;
        }
    } catch (error) {
        log.error('Erro ao processar o estágio:', error);
    }
}

// Sistema de recuperação de estado
let reconnectionAttempts = 0;
const MAX_RECONNECTION_ATTEMPTS = 5;

async function handleReconnection(reason) {
    log.error('Desconexão detectada:', reason);
    
    if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
        reconnectionAttempts++;
        log.info(`Tentativa de reconexão ${reconnectionAttempts}/${MAX_RECONNECTION_ATTEMPTS}`);
        
        try {
            await client.initialize();
            reconnectionAttempts = 0;
        } catch (error) {
            log.error('Falha na reconexão:', error);
            setTimeout(() => handleReconnection(reason), 5000 * reconnectionAttempts);
        }
    } else {
        log.error('Máximo de tentativas de reconexão atingido. Reiniciando processo...');
        process.exit(1);
    }
}

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    log.info('Novo QR Code gerado');
});

client.on('ready', () => {
    log.info('WhatsApp conectado com sucesso');
    reconnectionAttempts = 0;
});

client.on('auth_failure', msg => {
    log.error('Falha na autenticação:', msg);
    handleReconnection('auth_failure');
});

client.on('disconnected', reason => {
    handleReconnection(reason);
});

process.on('uncaughtException', error => {
    log.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    log.error('Promessa rejeitada não tratada:', reason);
});

client.on('message', async (msg) => {
    try {
        const userId = msg.from;

        if (!msg.from.endsWith('@c.us')) {
            return;
        }

        if (finishedConversations.has(userId)) {
            return;
        }

        if (!userStates.has(userId)) {
            userStates.set(userId, 'initial');
            await processNextStage(userId, msg, 'initial');
        } else {
            const currentState = userStates.get(userId);
            await processNextStage(userId, msg, currentState);
        }
    } catch (error) {
        log.error('Erro no processamento de mensagem:', error);
    }
});

// Inicialização do cliente
client.initialize().catch(error => {
    log.error('Erro ao inicializar o cliente:', error);
});
