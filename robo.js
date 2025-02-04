const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const client = new Client({
    puppeteer: {
        executablePath: '/usr/bin/google-chrome',
    },
    webVersionCache: {
        type: 'none', // Desativa o cache local para evitar problemas
    },
});

// Map para armazenar o estado da conversa de cada usuário
const userStates = new Map();

// Map para controlar mensagens já enviadas
const messagesSent = new Map();

// Set para rastrear conversas finalizadas
const finishedConversations = new Set();

// Função de delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para verificar se a mensagem já foi enviada
function checkMessageSent(userId, stage) {
    return messagesSent.get(`${userId}-${stage}`);
}

// Função para marcar mensagem como enviada
function markMessageAsSent(userId, stage) {
    messagesSent.set(`${userId}-${stage}`, true);
}

// Função para enviar múltiplos vídeos
async function sendMultipleVideos(msg, videoPaths) {
    try {
        if (!videoPaths || !Array.isArray(videoPaths)) {
            throw new Error('Caminhos dos vídeos inválidos ou não fornecidos.');
        }

        for (let i = 0; i < videoPaths.length; i++) {
            if (!videoPaths[i]) {
                console.error('Caminho do vídeo inválido:', videoPaths[i]);
                continue;
            }

            const video = MessageMedia.fromFilePath(videoPaths[i]);
            if (!video) {
                console.error('Erro ao carregar o vídeo:', videoPaths[i]);
                continue;
            }

            await client.sendMessage(msg.from, video);
            if (i < videoPaths.length - 1) {
                await delay(6000); // Delay entre vídeos
            }
        }
    } catch (error) {
        console.error('Erro ao enviar vídeos:', error);
    }
}

// Função para processar o próximo estágio da conversa
async function processNextStage(userId, msg, currentStage) {
    try {
        // Verifica se a conversa já foi finalizada
        if (finishedConversations.has(userId)) {
            console.log('Conversa já finalizada para o usuário:', userId);
            return;
        }

        const chat = await msg.getChat();

        // Verifica se já enviou as mensagens deste estágio
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

                const audio1 = MessageMedia.fromFilePath('./audio1.ogg');
                if (!audio1) {
                    throw new Error('Erro ao carregar o áudio 1.');
                }
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
                    './video2.mp4',
                    './video3.mp4'
                ];
                await sendMultipleVideos(msg, videos);

                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                const audio2 = MessageMedia.fromFilePath('./audio2.ogg');
                if (!audio2) {
                    throw new Error('Erro ao carregar o áudio 2.');
                }
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
                await client.sendMessage(msg.from, 'Você está perdendo tempo de me ver de quatro brincando com minha pepequinha amor');

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

                const audio3 = MessageMedia.fromFilePath('./audio3.ogg');
                if (!audio3) {
                    throw new Error('Erro ao carregar o áudio 3.');
                }
                await client.sendMessage(msg.from, audio3, { sendAudioAsVoice: true });

                await delay(10000);
                await chat.sendStateTyping();
                await delay(3000);
                await client.sendMessage(msg.from, 'Por hoje vou deixar por menos de 15 reais só para você meu bb, aproveite rsrs');

                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);

                const audio5 = MessageMedia.fromFilePath('./audio5.ogg');
                if (!audio5) {
                    throw new Error('Erro ao carregar o áudio 5.');
                }
                await client.sendMessage(msg.from, audio5, { sendAudioAsVoice: true });

                await delay(5000);
                await chat.sendStateTyping();
                await delay(5000);
                await client.sendMessage(msg.from, 'Mas me diz amor, que você vai assinar mesmo meu conteúdo e não vai perder essa chance de me ver peladinha?😈');
                userStates.set(userId, 'waiting_final_promise');
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

                // Move to waiting for response before audio6
                userStates.set(userId, 'waiting_before_audio6');
                break;

            case 'waiting_before_audio6':
                markMessageAsSent(userId, currentStage);
                await delay(10000);
                await chat.sendStateRecording();
                await delay(10000);
                const audio6 = MessageMedia.fromFilePath('./audio6.ogg');
                if (!audio6) {
                    throw new Error('Erro ao carregar o áudio 6.');
                }
                await client.sendMessage(msg.from, audio6, { sendAudioAsVoice: true });

                // Move to waiting for response after audio6
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

                // Marca a conversa como finalizada e limpa os estados
                finishedConversations.add(userId);
                userStates.delete(userId);
                break;
        }
    } catch (error) {
        console.error('Erro ao processar o estágio:', error);
    }
}

// Inicialização do cliente
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

// Manipulador de mensagens
client.on('message', async (msg) => {
    try {
        const userId = msg.from;

        // Verificar se a mensagem não é de um grupo
        if (!msg.from.endsWith('@c.us')) {
            return;
        }

        // Se a conversa já foi finalizada, simplesmente ignora
        if (finishedConversations.has(userId)) {
            return;
        }

        // Se é uma nova conversa
        if (!userStates.has(userId)) {
            userStates.set(userId, 'initial');
            await processNextStage(userId, msg, 'initial');
            return;
        }

        // Processar próximo estágio baseado no estado atual
        const currentState = userStates.get(userId);
        await processNextStage(userId, msg, currentState);

    } catch (error) {
        console.error('Erro no processamento da mensagem:', error);
    }
});
