'use strict';

// ============================================================================
//  Front-end: dois canais de comunicacao na mesma pagina.
//   1) Chat: WebSocket nativo -> servidor Node (ws://host:3000/chat)
//   2) Voz:  WebRTC via JsSIP  -> Asterisk        (ws://host:8088/ws)
//  Ao clicar em "Escalar para ligacao", o servidor manda o Asterisk originar
//  a chamada; os dois navegadores recebem o INVITE e atendem automaticamente.
// ============================================================================

const App = (() => {
  // Credenciais dos dois ramais WebRTC (devem casar com o pjsip.conf)
  const USERS = {
    alice: { user: 'alice', password: 'alice123' },
    bob:   { user: 'bob',   password: 'bob123'   },
  };

  let me = null;
  let chatWs = null;     // canal de chat
  let ua = null;         // User Agent SIP (JsSIP)
  let session = null;    // chamada em andamento

  const $ = (id) => document.getElementById(id);

  // -------------------------------------------------------------------------
  // Inicializacao
  // -------------------------------------------------------------------------
  function start(who) {
    me = USERS[who];
    if (!me) return;

    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('me').textContent = who;

    connectChat();
    connectSip();
  }

  // -------------------------------------------------------------------------
  // Canal 1: chat via WebSocket nativo
  // -------------------------------------------------------------------------
  function connectChat() {
    const url = `ws://${location.hostname}:${location.port || 3000}/chat`;
    chatWs = new WebSocket(url);

    chatWs.onopen = () => addSystem('Conectado ao chat.');
    chatWs.onclose = () => addSystem('Chat desconectado.');
    chatWs.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.type === 'chat') addChat(m.user, m.text);
      else if (m.type === 'system') addSystem(m.text);
    };

    $('input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });
  }

  function sendChat() {
    const input = $('input');
    const text = input.value.trim();
    if (!text || !chatWs || chatWs.readyState !== 1) return;
    chatWs.send(JSON.stringify({ type: 'chat', user: me.user, text }));
    input.value = '';
  }

  function escalate() {
    if (!chatWs || chatWs.readyState !== 1) return;
    chatWs.send(JSON.stringify({ type: 'escalate', user: me.user }));
  }

  // -------------------------------------------------------------------------
  // Canal 2: voz via WebRTC (JsSIP <-> Asterisk)
  // -------------------------------------------------------------------------
  function connectSip() {
    if (typeof JsSIP === 'undefined') {
      setSip('erro: JsSIP nao carregou', false);
      addSystem('Falha: biblioteca JsSIP nao carregou (verifique vendor/jssip.min.js).');
      return;
    }
    JsSIP.debug.enable('JsSIP:*'); // imprime o SIP no console (F12) - util p/ depurar

    const socket = new JsSIP.WebSocketInterface(`ws://${location.hostname}:8088/ws`);
    ua = new JsSIP.UA({
      sockets: [socket],
      uri: `sip:${me.user}@${location.hostname}`,
      password: me.password,
      register: true,
      session_timers: false,
    });

    ua.on('connected',    () => setSip('conectando...', false));
    ua.on('registered',   () => setSip('registrado', true));
    ua.on('registrationFailed', (e) => {
      const cause = (e && e.cause) || (e && e.response && e.response.status_code) || '?';
      setSip('falha no registro: ' + cause, false);
      addSystem('Registro SIP falhou: ' + cause);
    });
    ua.on('unregistered', () => setSip('nao registrado', false));
    ua.on('disconnected', (e) => {
      setSip('desconectado', false);
      if (e && e.error) addSystem('WebSocket SIP caiu: ' + (e.reason || e.code || 'erro'));
    });

    // Chamadas (entrada e saida)
    ua.on('newRTCSession', (data) => {
      session = data.session;

      session.on('peerconnection', (e) => {
        e.peerconnection.addEventListener('track', (ev) => {
          $('remoteAudio').srcObject = ev.streams[0];
        });
      });
      session.on('accepted', () => setCallUI(true));
      session.on('confirmed', () => setCallUI(true));
      session.on('ended',  () => setCallUI(false));
      session.on('failed', () => setCallUI(false));

      // Chamada recebida (resultado da escalada) -> atende automaticamente
      if (data.originator === 'remote') {
        session.answer({ mediaConstraints: { audio: true, video: false } });
      }
    });

    ua.start();
  }

  function hangup() {
    if (session) session.terminate();
  }

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------
  function addChat(user, text) {
    const el = document.createElement('div');
    el.className = 'msg ' + (user === me.user ? 'mine' : 'theirs');
    el.innerHTML = `<span class="who">${user}</span>${escapeHtml(text)}`;
    appendMsg(el);
  }

  function addSystem(text) {
    const el = document.createElement('div');
    el.className = 'msg system';
    el.textContent = text;
    appendMsg(el);
  }

  function appendMsg(el) {
    const box = $('messages');
    box.appendChild(el);
    box.scrollTop = box.scrollHeight;
  }

  function setSip(text, ok) {
    const s = $('sipStatus');
    s.textContent = 'SIP: ' + text;
    s.className = 'status ' + (ok ? 'on' : 'off');
  }

  function setCallUI(inCall) {
    $('escalateBtn').classList.toggle('hidden', inCall);
    $('hangupBtn').classList.toggle('hidden', !inCall);
    $('callStatus').textContent = inCall ? 'Em chamada' : '';
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  return { start, sendChat, escalate, hangup };
})();
