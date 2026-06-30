'use strict';

// ============================================================================
//  Chat-server: serve o front, mantem o chat em tempo real (WebSocket) e,
//  ao receber o evento "escalate", manda o Asterisk originar uma chamada de
//  voz entre alice e bob via AMI (Originate). Demonstra a convivencia dos dois
//  meios de comunicacao: dados em tempo real (WS) + voz (SIP/WebRTC).
// ============================================================================

const fs = require('fs');
const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const AsteriskManager = require('asterisk-manager');

const PORT = process.env.PORT || 3000;
const AMI_HOST = process.env.AMI_HOST || '127.0.0.1';
const AMI_PORT = process.env.AMI_PORT || 5038;
const AMI_USER = process.env.AMI_USER || 'admin';
const AMI_SECRET = process.env.AMI_SECRET || 'amisecret';

// ---------------------------------------------------------------------------
// Coletor de metricas (CSV) - etapas Executar/Analisar do GPSC
// ---------------------------------------------------------------------------
const METRICS_DIR = process.env.METRICS_DIR || '/app/metrics';
const CSV_PATH = `${METRICS_DIR}/metrics.csv`;
const TAG_PATH = `${METRICS_DIR}/tag.txt`;

// A 'tag' identifica o perfil de rede ativo (escrita por scripts/netem.sh).
function currentTag() {
  try { return fs.readFileSync(TAG_PATH, 'utf8').trim() || 'baseline'; }
  catch { return 'baseline'; }
}

function recordCall(setupMs, durationSec) {
  try {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
    if (!fs.existsSync(CSV_PATH)) {
      fs.writeFileSync(CSV_PATH, 'timestamp,tag,setup_ms,duration_s\n');
    }
    const row = `${new Date().toISOString()},${currentTag()},${setupMs},${durationSec}\n`;
    fs.appendFileSync(CSV_PATH, row);
    console.log('[CSV] ' + row.trim());
  } catch (e) {
    console.error('[CSV] erro ao gravar metrica:', e.message);
  }
}

// ---------------------------------------------------------------------------
// HTTP + arquivos estaticos do front-end
// ---------------------------------------------------------------------------
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Canal 1: chat em tempo real via WebSocket (path /chat)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/chat' });
const clients = new Set();

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(data);
  }
}

// ---------------------------------------------------------------------------
// AMI (Asterisk Manager Interface): dispara a "escalada" para voz
// ---------------------------------------------------------------------------
const ami = new AsteriskManager(AMI_PORT, AMI_HOST, AMI_USER, AMI_SECRET, true);
ami.keepConnected();
ami.on('connect', () => console.log(`[AMI] conectado em ${AMI_HOST}:${AMI_PORT}`));
ami.on('error', (err) => console.error('[AMI] erro:', err && err.message));

// Estados da chamada (lab: 1 chamada por vez).
let pendingCall = null; // entre o clique e o estabelecimento (mede setup time)
let activeCall = null;  // chamada em andamento (mede duracao)

function formatDur(totalSec) {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}min ${s.toString().padStart(2, '0')}s`;
}

ami.on('managerevent', (evt) => {
  // Ponte de audio formada -> chamada estabelecida
  if (evt.event === 'BridgeEnter' && pendingCall) {
    const ms = Date.now() - pendingCall.t0;
    broadcast({ type: 'system', text: `Chamada estabelecida (~${ms} ms desde o clique).` });
    activeCall = { startedAt: Date.now(), setupMs: ms };
    pendingCall = null; // BridgeEnter dispara por perna; reportamos so a 1a
  }
  // Alguem desligou -> reporta a duracao e grava a metrica (so na 1a perna)
  else if (evt.event === 'Hangup' && activeCall) {
    const durSec = Math.round((Date.now() - activeCall.startedAt) / 1000);
    broadcast({ type: 'system', text: `Chamada encerrada. Duracao: ${formatDur(durSec)}.` });
    recordCall(activeCall.setupMs, durSec);
    activeCall = null;
  }
});

function escalateToCall(byUser) {
  broadcast({ type: 'system', text: `${byUser} esta iniciando uma chamada de voz...` });
  pendingCall = { t0: Date.now() };

  // Toca alice; ao atender, disca bob e faz a ponte (click-to-call classico).
  ami.action(
    {
      Action: 'Originate',
      Channel: 'PJSIP/alice',
      Application: 'Dial',
      Data: 'PJSIP/bob,30',
      CallerID: 'Escalada de Chat <escalate>',
      Async: 'true',
    },
    (err) => {
      if (err) {
        pendingCall = null;
        broadcast({ type: 'system', text: `Falha ao iniciar a chamada: ${err.message}` });
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mensagens vindas do navegador
// ---------------------------------------------------------------------------
wss.on('connection', (ws) => {
  clients.add(ws);

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'chat' && msg.text) {
      broadcast({ type: 'chat', user: msg.user, text: msg.text, ts: Date.now() });
    } else if (msg.type === 'escalate') {
      escalateToCall(msg.user || 'Alguem');
    }
  });

  ws.on('close', () => clients.delete(ws));
});

server.listen(PORT, () => {
  console.log(`[HTTP] front em  http://localhost:${PORT}`);
  console.log(`[WS]   chat em   ws://localhost:${PORT}/chat`);
});
