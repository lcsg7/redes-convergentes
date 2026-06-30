# Comunicação Convergente: do texto à voz

Projeto da cadeira de **Redes Convergentes**. Um chat em tempo real (**WebSocket**)
que, com um clique, **escala** a conversa para uma chamada de voz (**SIP/WebRTC**)
orquestrada pelo **Asterisk** — tudo no navegador, sem softphone externo.

## Arquitetura

```
  Navegador (Alice)                         Navegador (Bob)
  ┌──────────────────┐                      ┌──────────────────┐
  │ Chat  (WebSocket)│◀───── ws:3000 ──────▶│ Chat  (WebSocket)│
  │ Voz   (WebRTC)   │◀───── ws:8088 ──────▶│ Voz   (WebRTC)   │
  └────────┬─────────┘                      └─────────┬────────┘
           │  (1) clique "Escalar"                     │
           ▼                                           ▼
     ┌─────────────┐    (2) AMI Originate      ┌──────────────┐
     │ chat-server │ ────────────────────────▶ │   Asterisk   │
     │   (Node)    │                           │ (chan_pjsip) │
     └─────────────┘    (3) toca os 2 ramais   └──────────────┘
```

- **chat-server** (Node): serve o front, mantém o chat (WebSocket nativo) e dispara
  o `Originate` no Asterisk via **AMI** quando alguém clica em "Escalar".
- **asterisk**: dois ramais WebRTC (`alice`, `bob`) com transporte SIP-sobre-WebSocket
  e mídia DTLS-SRTP (cert auto-gerado).
- `network_mode: host` para a mídia WebRTC funcionar direto em `127.0.0.1` (lab local Linux).

## Como rodar

```bash
docker-compose up --build
```

Depois:

1. Abra **http://localhost:3000** em **duas** janelas.
2. Numa entre como **Alice**, na outra como **Bob** (permita o microfone).
3. Troque mensagens de texto (canal WebSocket).
4. Clique em **"Escalar para ligação"** → os dois navegadores tocam e atendem
   automaticamente: agora é voz (canal SIP/WebRTC). 🎉

## Camada experimental (para o GPSC)

O servidor já mede o **tempo de estabelecimento da chamada** (do clique até a ponte
de áudio) e publica no chat. A partir daí dá para coletar dados variando:

| Variável (independente) | Métrica (dependente) |
|---|---|
| Degradação de rede (`tc/netem`: atraso, perda) | tempo de estabelecimento, jitter, perda RTP |
| Codec (ulaw × alaw × opus) | banda consumida na voz |
| Canal (texto × voz) | banda, latência de entrega |

Captura/análise: **sngrep** (sinalização SIP), **Wireshark** (frames WS + RTP/DTLS),
gráficos no **Jupyter**.

## Verificar / depurar

```bash
docker exec -it conv-asterisk asterisk -rx "pjsip show endpoints"   # alice/bob registrados?
docker exec -it conv-asterisk asterisk -rx "pjsip show contacts"
docker logs -f conv-chat-server                                     # AMI conectado? Originate?
sudo sngrep                                                         # ver o SIP no host
```

Se a ligação não conecta: confirme que os dois navegadores mostram **"SIP: registrado"**
e que você permitiu o microfone (o navegador só libera mídia em `localhost`/HTTPS).

## Experimento (coleta de métricas)

Cada chamada encerrada grava uma linha em `metrics/metrics.csv`
(`timestamp,tag,setup_ms,duration_s`). A `tag` identifica o perfil de rede ativo,
definido pelo script `scripts/netem.sh`, que degrada a interface `lo` (por onde
passa todo o tráfego do lab).

```bash
sudo bash scripts/netem.sh status               # ver estado atual
sudo bash scripts/netem.sh apply 100 0 delay100 # atraso de 100 ms
sudo bash scripts/netem.sh apply 0 5 loss5      # perda de 5%
sudo bash scripts/netem.sh apply 0 10 loss10    # perda de 10%
sudo bash scripts/netem.sh clear                # remove a degradação (tag=baseline)
```

**Fluxo sugerido:** para cada perfil, aplique o `netem`, rode ~30 escaladas no
navegador (clicar/escalar/desligar) e ele acumula as linhas no CSV com a `tag` certa.
Ao final, `clear`.

**Análise:** abra `analysis/analise.ipynb` no Jupyter (ou no JupyterLite do GPSC) —
ele lê o `metrics.csv` e gera os gráficos (tempo de estabelecimento por perfil,
duração, banda). Para a banda texto×voz, capture com Wireshark/sngrep durante uma
sessão de chat e durante uma chamada, e preencha `analysis/banda.csv`.
