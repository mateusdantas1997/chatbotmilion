const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Caminho para o Chromium ou Google Chrome
const chromePath = '/usr/bin/google-chrome';

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
        ],
    },
    webVersionCache: {
        type: 'none',
    },
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

async function sendMultipleVideos(msg, videoPaths) {
    try {
        if (!videoPaths || !Array.isArray(videoPaths)) {
            throw new Error('Caminhos dos vídeos inválidos ou não fornecidos.');
        }

        for (let i = 0; i < videoPaths.length; i++) {
            try {
                if (!videoPaths[i]) {
                    console.error('Caminho do vídeo inválido:', videoPaths[i]);
                    continue;
                }

                // Verificar se o arquivo existe
                const absolutePath = path.resolve(__dirname, videoPaths[i]);
                if (!fs.existsSync(absolutePath)) {
                    console.error(`Arquivo não encontrado: ${absolutePath}`);
                    continue;
                }

                const video = MessageMedia.fromFilePath(absolutePath);
                if (!video) {
                    console.error('Erro ao carregar o vídeo:', absolutePath);
                    continue;
                }

                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    try {
                        await client.sendMessage(msg.from, video);
                        console.log(`Vídeo enviado com sucesso: ${absolutePath}`);
                        break;
                    } catch (sendError) {
                        attempts++;
                        console.error(`Tentativa ${attempts} falhou ao enviar vídeo:`, sendError);
                        if (attempts === maxAttempts) {
                            throw sendError;
                        }
                        await delay(2000 * attempts);
                    }
                }

                if (i < videoPaths.length - 1) {
                    await delay(6000);
                }
            } catch (videoError) {
                console.error(`Erro ao processar vídeo ${videoPaths[i]}:`, videoError);
                continue;
            }
        }
    } catch (error) {
        console.error('Erro ao enviar vídeos:', error);
    }
}

async function processNextStage(userId, msg, currentStage) {
    try {
        if (finishedConversations.has(userId)) {
            console.log('Conversa já finalizada para o usuário:', userId);
            return;
        }

        const chat = await msg.getChat();

        if (checkMessageSent(userId, currentStage)) {
            console.log(`Mensagem já enviada para o estágio: ${currentStage}`);
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

                const audio1Path = path.resolve(__dirname, './audio1.ogg');
                if (!fs.existsSync(audio1Path)) {
                    throw new Error(`Áudio não encontrado: ${audio1Path}`);
                }
                const audio1 = MessageMedia.fromFilePath(audio1Path);
                await client.sendMessage(msg.from, audio1, { sendAudioAsVoice: true });

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

                const audio2Path = path.resolve(__dirname, './audio2.ogg');
                if (!fs.existsSync(audio2Path)) {
                    throw new Error(`Áudio não encontrado: ${audio2Path}`);
                }
                const audio2 = MessageMedia.fromFilePath(audio2Path);
                await client.sendMessage(msg.from, audio2, { sendAudioAsVoice: true });

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

                const audio3Path = path.resolve(__dirname, './audio3.ogg');
                if (!fs.existsSync(audio3Path)) {
                    throw new Error(`Áudio não encontrado: ${audio3Path}`);
                }
                const audio3 = MessageMedia.fromFilePath(audio3Path);
                await client.sendMessage(msg.from, audio3, { sendAudioAsVoice: true });

                await delay(10000);
                await chat.sendStateTyping();
                await delay(3000);
                await client.sendMessage(msg.from, 'Por hoje vou deixar por menos de 15 reais só para você meu bb, aproveite rsrs');

                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                const audio5Path = path.resolve(__dirname, './audio5.ogg');
                if (!fs.existsSync(audio5Path)) {
                    throw new Error(`Áudio não encontrado: ${audio5Path}`);
                }
                const audio5 = MessageMedia.fromFilePath(audio5Path);
                await client.sendMessage(msg.from, audio5, { sendAudioAsVoice: true });

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

                const audio6Path = path.resolve(__dirname, './audio6.ogg');
                if (!fs.existsSync(audio6Path)) {
                    throw new Error(`Áudio não encontrado: ${audio6Path}`);
                }
                const audio6 = MessageMedia.fromFilePath(audio6Path);
                await client.sendMessage(msg.from, audio6, { sendAudioAsVoice: true });

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
        console.error('Erro ao processar o estágio:', error);
    }
}

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});

client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
    console.error('Cliente desconectado:', reason);
});

client.initialize();

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
            return;
        }

        const currentState = userStates.get(userId);
        await processNextStage(userId, msg, currentState);

    } catch (error) {
        console.error('Erro no processamento da mensagem:', error);
    }
});
