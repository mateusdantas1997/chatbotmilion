const os = require('os');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    delays: {
        entreVideos: 6000,
        entreAudios: 10000,
        digitacao: 5000,
        gravacao: 8000
    },
    limites: {
        tentativasReconexao: 5,
        tamanhoMaximoMidia: 16 * 1024 * 1024
    }
};

// Logger System (sem arquivos)
class Logger {
    info(mensagem) {
        const timestamp = new Date().toISOString();
        console.log(`[INFO][${timestamp}] ${mensagem}`);
    }

    error(mensagem, erro = '') {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR][${timestamp}] ${mensagem} ${erro}`);
    }
}

// State Manager
class GerenciadorEstado {
    constructor() {
        this.estadosUsuario = new Map();
        this.mensagensEnviadas = new Map();
        this.conversasFinalizadas = new Set();
    }

    obterEstadoUsuario(idUsuario) {
        return this.estadosUsuario.get(idUsuario);
    }

    definirEstadoUsuario(idUsuario, estado) {
        this.logger?.info(`Definindo estado do usuário ${idUsuario}: ${estado}`);
        this.estadosUsuario.set(idUsuario, estado);
    }

    mensagemJaEnviada(idUsuario, estagio) {
        return this.mensagensEnviadas.get(`${idUsuario}-${estagio}`);
    }

    marcarMensagemEnviada(idUsuario, estagio) {
        this.logger?.info(`Marcando mensagem enviada para o estágio ${estagio} do usuário ${idUsuario}`);
        this.mensagensEnviadas.set(`${idUsuario}-${estagio}`, true);
    }

    conversaFinalizada(idUsuario) {
        return this.conversasFinalizadas.has(idUsuario);
    }

    finalizarConversa(idUsuario) {
        this.logger?.info(`Finalizando conversa do usuário ${idUsuario}`);
        this.conversasFinalizadas.add(idUsuario);
    }

    limparEstadoUsuario(idUsuario) {
        this.logger?.info(`Limpando estado do usuário ${idUsuario}`);
        this.estadosUsuario.delete(idUsuario);
        this.mensagensEnviadas.delete(idUsuario);
        this.conversasFinalizadas.delete(idUsuario);
    }
}

// Media Manager (sem diretórios)
class GerenciadorMidia {
    constructor(logger) {
        this.logger = logger;
    }
    async enviarMidia(client, msg, caminhoMidia, opcoes = {}) {
        try {
            if (!fs.existsSync(caminhoMidia)) {
                throw new Error(`Arquivo não encontrado: ${caminhoMidia}`);
            }
            const media = MessageMedia.fromFilePath(caminhoMidia);
            this.logger.info(`Enviando mídia: ${caminhoMidia}`);
            return await client.sendMessage(msg.from, media, opcoes);
        } catch (erro) {
            this.logger.error(`Erro ao enviar mídia: ${caminhoMidia}`, erro);
            throw erro;
        }
    }
    async enviarMultiplosVideos(client, msg, caminhoVideos, delayEntre = config.delays.entreVideos) {
        for (const caminhoVideo of caminhoVideos) {
            try {
                // Definir visualização única para os vídeos específicos
                const opcoes = {};
                if (caminhoVideo === './video1.mp4' || caminhoVideo === './video3.mp4') {
                    opcoes.isViewOnce = true; // Habilita visualização única
                }

                await this.enviarMidia(client, msg, caminhoVideo, opcoes);
                this.logger.info(`Vídeo enviado: ${caminhoVideo}`);

                if (caminhoVideos.indexOf(caminhoVideo) < caminhoVideos.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, delayEntre));
                }
            } catch (erro) {
                this.logger.error(`Erro ao enviar vídeo ${caminhoVideo}:`, erro);
            }
        }
    }
}

// Main WhatsApp Bot
class WhatsAppBot {
    constructor() {
        this.logger = new Logger();
        this.gerenciadorEstado = new GerenciadorEstado();
        this.gerenciadorMidia = new GerenciadorMidia(this.logger);
        this.chromePath = this.obterCaminhoChromeDriver();
        this.inicializarBot();
    }

    obterCaminhoChromeDriver() {
        const plataforma = os.platform();
        const caminhos = {
            win32: [
                path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
                path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google/Chrome/Application/chrome.exe'),
                path.join(process.env.PROGRAMFILES || '', 'Google/Chrome/Application/chrome.exe'),
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
            ],
            darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
            linux: [
                '/usr/bin/google-chrome',
                '/usr/bin/chrome',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/google-chrome',
                '/opt/google/chrome/google-chrome'
            ]
        };
        const possiveisCaminhos = caminhos[plataforma] || [];
        for (const caminhoBrowser of possiveisCaminhos) {
            try {
                if (fs.existsSync(caminhoBrowser)) {
                    return caminhoBrowser;
                }
            } catch (erro) {
                continue;
            }
        }
        throw new Error(`Chrome não encontrado para a plataforma: ${plataforma}`);
    }

    async inicializarBot() {
        try {
            this.client = new Client({
                puppeteer: {
                    executablePath: this.chromePath,
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--remote-debugging-port=9222',
                        '--max-memory=512M'
                    ]
                },
                webVersionCache: { type: 'none' },
                restartOnAuthFail: true
            });
            this.configurarHandlers();
            await this.client.initialize();
        } catch (erro) {
            this.logger.error('Erro ao inicializar o bot:', erro);
            process.exit(1);
        }
    }

    configurarHandlers() {
        this.client.on('qr', this.handleQR.bind(this));
        this.client.on('ready', this.handleReady.bind(this));
        this.client.on('auth_failure', this.handleAuthFailure.bind(this));
        this.client.on('disconnected', this.handleDisconnect.bind(this));
        this.client.on('message', this.handleMessage.bind(this));
        process.on('uncaughtException', this.handleUncaughtException.bind(this));
        process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    handleQR(qr) {
        qrcode.generate(qr, { small: true });
        this.logger.info('Novo QR Code gerado');
    }

    handleReady() {
        this.logger.info('WhatsApp conectado com sucesso');
    }

    handleAuthFailure(msg) {
        this.logger.error('Falha na autenticação:', msg);
        this.tentarReconexao('auth_failure');
    }

    handleDisconnect(reason) {
        this.logger.error('Desconectado:', reason);
        this.tentarReconexao(reason);
    }

    handleUncaughtException(erro) {
        this.logger.error('Erro não capturado:', erro);
    }

    handleUnhandledRejection(reason) {
        this.logger.error('Promessa rejeitada não tratada:', reason);
    }

    async handleMessage(msg) {
        try {
            if (!msg.from.endsWith('@c.us')) return;
            const idUsuario = msg.from;
            if (this.gerenciadorEstado.conversaFinalizada(idUsuario)) {
                return;
            }
            if (!this.gerenciadorEstado.obterEstadoUsuario(idUsuario)) {
                this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'initial');
                await this.processarProximoEstagio(idUsuario, msg, 'initial');
            } else {
                const estadoAtual = this.gerenciadorEstado.obterEstadoUsuario(idUsuario);
                await this.processarProximoEstagio(idUsuario, msg, estadoAtual);
            }
        } catch (erro) {
            this.logger.error('Erro no processamento de mensagem:', erro);
        }
    }

    async processarProximoEstagio(idUsuario, msg, estagioAtual) {
        try {
            if (this.gerenciadorEstado.mensagemJaEnviada(idUsuario, estagioAtual)) {
                this.logger.info(`Mensagem já enviada para estágio ${estagioAtual}`);
                return;
            }
            const chat = await msg.getChat();
            await this.processarEstagio(idUsuario, msg, chat, estagioAtual);
        } catch (erro) {
            this.logger.error(`Erro ao processar estágio ${estagioAtual}:`, erro);
        }
    }

    async processarEstagio(idUsuario, msg, chat, estagio) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        try {
            switch (estagio) {
                case 'initial':
                    await this.processarEstagioInicial(idUsuario, msg, chat);
                    break;
                case 'waiting_preview':
                    await this.processarEstagioPreview(idUsuario, msg, chat);
                    break;
                case 'waiting_peladinha':
                    await this.processarEstagioPeladinha(idUsuario, msg, chat);
                    break;
                case 'waiting_promise':
                    await this.processarEstagioPromise(idUsuario, msg, chat);
                    break;
                case 'waiting_for_price_response':
                    await this.processarEstagioPriceResponse(idUsuario, msg, chat);
                    break;
                case 'waiting_final_promise':
                    await this.processarEstagioFinalPromise(idUsuario, msg, chat);
                    break;
                case 'sending_link':
                    await this.processarEstagioSendingLink(idUsuario, msg, chat);
                    break;
                case 'waiting_before_audio6':
                    await this.processarEstagioBeforeAudio6(idUsuario, msg, chat);
                    break;
                case 'waiting_after_audio6':
                    await this.processarEstagioAfterAudio6(idUsuario, msg, chat);
                    break;
                default:
                    this.logger.error(`Estado desconhecido: ${estagio}`);
                    this.gerenciadorEstado.limparEstadoUsuario(idUsuario);
                    break;
            }
        } catch (erro) {
            this.logger.error('Erro ao processar o estágio:', erro);
            throw erro;
        }
    }

    async processarEstagioInicial(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'initial');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Oii amor, que bom que me chamou❤️ \n');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Vou lhe enviar um áudio te explicando, momentinho vida');
        await delay(config.delays.digitacao);
        await chat.sendStateRecording();
        await delay(config.delays.gravacao);
        await this.gerenciadorMidia.enviarMidia(this.client, msg, './audio1.ogg', { sendAudioAsVoice: true });
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Você tem interesse amor? 😈🔥');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_preview');
    }

    async processarEstagioPreview(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_preview');
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Vou te enviar uma prévia minha e da minha amiga meu lindo🥰');
        await delay(config.delays.entreVideos);
        const videos = ['./video1.mp4', './video3.mp4'];
        await this.gerenciadorMidia.enviarMultiplosVideos(this.client, msg, videos);
        await delay(config.delays.digitacao);
        await chat.sendStateRecording();
        await delay(config.delays.gravacao);
        await this.gerenciadorMidia.enviarMidia(this.client, msg, './audio2.ogg', { sendAudioAsVoice: true });
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Você gostou bb?🥰');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_peladinha');
    }

    async processarEstagioPeladinha(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_peladinha');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Amor você está perdendo tempo de me ver de quatro brincando com minha pepequinha');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'No meu grupinho privado tem muito mais conteúdos gostoso mostrando minha bucetinha toda molhada e sentando gostoso até eu gozar, você vai ficar de pau duro seu safadinho😏🥰');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Me deu vontade de te mostrar minha bucetinha, você quer amor?');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_promise');
    }

    async processarEstagioPromise(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_promise');
        await delay(config.delays.digitacao);
        await chat.sendStateRecording();
        await delay(config.delays.gravacao);
        await this.gerenciadorMidia.enviarMidia(this.client, msg, './audio3.ogg', { sendAudioAsVoice: true });
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Por hoje vou deixar por menos de 15 reais só para você meu bb, aproveite rsrs');
        await delay(config.delays.digitacao);
        await chat.sendStateRecording();
        await delay(config.delays.gravacao);
        await this.gerenciadorMidia.enviarMidia(this.client, msg, './audio5.ogg', { sendAudioAsVoice: true });
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Mas me diz amor, que você vai assinar mesmo meu conteúdo e não vai perder essa chance de me ver peladinha?😈');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Não me fale que você não vai ter menos que 15 reais bb?');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_for_price_response');
    }

    async processarEstagioPriceResponse(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_for_price_response');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_final_promise');
        await this.processarProximoEstagio(idUsuario, msg, 'waiting_final_promise');
    }

    async processarEstagioFinalPromise(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_final_promise');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Ainn vida, que sorte a minhaa😍😍');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Fiquei louca pra sentir sua rola bem gostosa na minha boca e na minha bucetinha bem quentinha');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Mas antes de eu te enviar meu link com a promoção, me promete que depois você vai marcar comigo?🥹');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Me promete que vamos marcar pra você me comer gostoso?😏');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'sending_link');
    }

    async processarEstagioSendingLink(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'sending_link');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Ameeei, vou te enviar o link pra a gente gozar bem gostoso juntinhos');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Clique aqui para pagar e ver minha bucetinha toda molhada💦😏\n 👉 https://bit.ly/liivinha 👈');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Aaa amorzinho e lembrando, assim que você pagar, aguarde ser confirmado o pagamento que irá liberar seu acesso, tá?🥰');
        await delay(config.delays.digitacao);
        await chat.sendStateTyping();
        await delay(config.delays.digitacao);
        await this.client.sendMessage(msg.from, 'Te espero lá bb😈🔥');
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_before_audio6');
    }

    async processarEstagioBeforeAudio6(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_before_audio6');
        await delay(config.delays.digitacao);
        await chat.sendStateRecording();
        await delay(config.delays.gravacao);
        await this.gerenciadorMidia.enviarMidia(this.client, msg, './audio6.ogg', { sendAudioAsVoice: true });
        this.gerenciadorEstado.definirEstadoUsuario(idUsuario, 'waiting_after_audio6');
    }

    async processarEstagioAfterAudio6(idUsuario, msg, chat) {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        try {
            this.gerenciadorEstado.marcarMensagemEnviada(idUsuario, 'waiting_after_audio6');
    
            // Primeira mensagem
            await delay(config.delays.digitacao);
            await chat.sendStateTyping();
            await delay(config.delays.digitacao);
            await this.client.sendMessage(msg.from, 'Amorzinho, eu só posso continuar nossa conversa se você assinar meu conteúdo clicando no link que te enviei');
            this.logger.info('Mensagem 1 enviada.');
    
            // Segunda mensagem
            await delay(config.delays.digitacao);
            await chat.sendStateTyping();
            await delay(config.delays.digitacao);
            await this.client.sendMessage(msg.from, 'Vou te enviar aqui em baixo novamente caso não tenha encontrado, tá?');
            this.logger.info('Mensagem 2 enviada.');
    
            // Terceira mensagem (link)
            await delay(config.delays.digitacao);
            await chat.sendStateTyping();
            await delay(config.delays.digitacao);
            await this.client.sendMessage(msg.from, '🥰👇🏼\n https://bit.ly/liivinha');
            this.logger.info('Link enviado.');
    
            // Quarta mensagem
            await delay(config.delays.digitacao);
            await chat.sendStateTyping();
            await delay(config.delays.digitacao);
            await this.client.sendMessage(msg.from, 'Compre vai meu bb, deixa eu te fazer gozar mostrando minha bucetinha toda molhada🤤😈');
            this.logger.info('Mensagem 4 enviada.');
    
            // Finalizar conversa
            this.gerenciadorEstado.finalizarConversa(idUsuario);
            this.gerenciadorEstado.limparEstadoUsuario(idUsuario);
            this.logger.info(`Conversa finalizada para o usuário ${idUsuario}`);
        } catch (erro) {
            this.logger.error('Erro ao processar estágio after_audio6:', erro.message || erro);
            throw erro;
        }
    }

    async tentarReconexao(motivo) {
        let tentativas = 0;
        const maxTentativas = config.limites.tentativasReconexao;
        while (tentativas < maxTentativas) {
            try {
                this.logger.info(`Tentativa de reconexão ${tentativas + 1}/${maxTentativas}`);
                await this.client.initialize();
                this.logger.info('Reconectado com sucesso');
                return;
            } catch (erro) {
                tentativas++;
                this.logger.error(`Falha na tentativa de reconexão ${tentativas}:`, erro);
                if (tentativas < maxTentativas) {
                    const tempoEspera = 5000 * tentativas;
                    await new Promise(resolve => setTimeout(resolve, tempoEspera));
                }
            }
        }
        this.logger.error('Máximo de tentativas de reconexão atingido. Reiniciando processo...');
        process.exit(1);
    }
}

// Inicialização
const bot = new WhatsAppBot();
