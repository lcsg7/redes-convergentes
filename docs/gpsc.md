# Conteúdo para o GPSC — Projeto Redes Convergentes

> Texto pronto para colar em cada campo da plataforma GPSC.
> Projeto: escalada de chat (WebSocket) para voz (SIP/WebRTC) em containers.

---

## 1. Definir Projeto

**Título:**
Comunicação convergente: escalada de chat em tempo real (WebSocket) para chamada de voz (SIP/WebRTC) em containers Docker

**Tema:**
Integração de dois meios de comunicação — mensageria em tempo real (WebSocket) e voz sobre IP (SIP/WebRTC com Asterisk) — numa única aplicação web containerizada, demonstrando a convergência de serviços de dados e voz sobre a mesma infraestrutura IP.

**Contexto:**
Aplicações modernas combinam texto, voz e vídeo sobre a mesma infraestrutura IP — a chamada convergência de redes. Ferramentas de atendimento e colaboração frequentemente iniciam a interação por texto e, quando necessário, escalam para voz. O WebSocket consolidou-se como padrão para comunicação bidirecional em tempo real na web; o WebRTC leva voz e vídeo diretamente ao navegador; o Asterisk é o PBX de referência para sinalização SIP; e os containers (Docker) garantem portabilidade e reprodutibilidade do ambiente.

**Problema:**
Como integrar, numa mesma aplicação web, mensageria em tempo real (WebSocket) e voz (SIP/WebRTC), permitindo a transição transparente do texto para a voz com um clique — e qual é o custo dessa convergência (tempo de estabelecimento da chamada, banda consumida e qualidade da voz) sob diferentes condições de rede?

**Propósito:**
Desenvolver e caracterizar uma aplicação convergente em que usuários conversam por texto (WebSocket) e, com um clique, escalam a conversa para uma chamada de voz orquestrada pelo Asterisk (via Originate na interface AMI), com áudio WebRTC no próprio navegador (sem softphone externo). Medir o tempo de estabelecimento da chamada, a duração, a banda consumida por canal e a qualidade da voz (jitter/perda) sob degradação controlada de rede, com todo o ambiente empacotado em containers Docker para garantir reprodutibilidade.

**Pesquisadores:** Lucas Alves · Orientadora: Luciana Pereira Oliveira
**Disponibilização pública:** Sim

---

## 2. Detalhar Metodologia

**Procedimentos:** experimentais — construção de um protótipo funcional e coleta de métricas em cenários controlados.
**Abordagem:** quantitativa (mede tempo, banda, jitter e perda).
**Natureza:** aplicada.

**Objetivos:**
1. Construir, em containers, uma aplicação que integra chat (WebSocket) e voz (SIP/WebRTC), com escalada disparada via AMI;
2. Medir o tempo de estabelecimento da chamada (do clique até o áudio) e a duração das chamadas;
3. Comparar o custo de banda dos canais de texto e de voz;
4. Avaliar o comportamento da convergência (tempo de estabelecimento, jitter e perda) sob degradação controlada de rede.

---

## 3. Planejar

**Fases:**
- Modelagem da arquitetura convergente;
- Implementação (Asterisk WebRTC, chat-server em Node, front-end com JsSIP);
- Definição dos cenários de teste e dos perfis de degradação de rede;
- Execução e coleta de métricas;
- Análise dos dados e interpretação.

**Comitê de ética:** não se aplica — não há participação de seres humanos ou animais; o tráfego é sintético, gerado entre dois clientes de teste.
**Questionário:** não se aplica.

---

## 4. Executar

**Cenário:**
Um host Linux com Docker executa dois serviços em `network_mode: host`: `asterisk` (Ubuntu 22.04 + Asterisk 18, `chan_pjsip` com transporte WebSocket e mídia DTLS-SRTP) e `chat-server` (Node.js: serve o front, mantém o chat por WebSocket e dispara `Originate` via AMI). Dois navegadores atuam como ramais WebRTC (`alice` e `bob`) usando a biblioteca JsSIP. A escalada executa `Originate(PJSIP/alice, Dial PJSIP/bob)`.

**Variáveis independentes / parâmetros:**
- Atraso injetado na rede (ms) — via `tc/netem`;
- Perda de pacotes (%) — via `tc/netem`;
- Codec de voz (G.711 ulaw × Opus);
- Canal medido (texto × voz);
- Carga (nº de chats/chamadas simultâneas).

**Variáveis dependentes / dados de saída:**
- Tempo de estabelecimento da chamada (ms) — do clique ao `BridgeEnter`;
- Duração da chamada (s);
- Banda consumida por canal (kbps);
- Jitter (ms) e perda de pacotes RTP (%).

**Dados de entrada:** roteiro de mensagens e ações de escalada; perfis de rede do `netem`.
**Algoritmos/artefatos:** rotina de `Originate` (AMI); coletor de timestamps no `chat-server`; parser das capturas (sngrep/pcap).
**Figuras:** diagrama da arquitetura; capturas do sngrep (sinalização SIP) e do Wireshark (frames WebSocket e RTP/DTLS).
**Risco:** baixo.
**Timestamps / problemas:** registrados a cada execução.

---

## 5. Analisar

**Notebook (Jupyter):** lê o CSV com as execuções e gera os gráficos:
- Tempo de estabelecimento da chamada × degradação de rede (atraso/perda);
- Banda consumida: texto × voz;
- Jitter e perda RTP × perda de pacotes injetada.

**Interpretação:** identificar o limiar de degradação em que a chamada de voz se torna inviável; quantificar o sobrecusto (overhead) da voz em relação ao texto; e discutir o custo da convergência sobre a mesma infraestrutura.

---

## 6. Finalizar

**Resumo:** a aplicação integra com sucesso dois meios de comunicação distintos — mensageria em tempo real (WebSocket) e voz (SIP/WebRTC) — numa interface 100% web e em ambiente containerizado, com a transição texto→voz disparada por um único clique. O tempo de estabelecimento e a qualidade da chamada mantêm-se aceitáveis até o limiar de perda/atraso identificado na análise.

**Recomendações/conclusão:** discutir quando vale a pena escalar para voz, o impacto da degradação de rede sobre cada canal e a portabilidade garantida pelo Docker.
**Entregáveis:** código-fonte, tutorial de instalação (README), vídeo demonstrativo e apresentação.
