# Progresso do projeto — Redes Convergentes

Status em 2026-06-30. Projeto: **chat (WebSocket) que escala para voz (SIP/WebRTC)**
em containers. Repositório: https://github.com/lcsg7/redes-convergentes

## Entregáveis

| Entregável | Status | Onde |
|---|---|---|
| Dockerfile / docker-compose | ✅ pronto e validado | `docker-compose.yml`, `asterisk/`, `chat-server/` |
| Texto explicativo (teoria) | ✅ pronto | `docs/tutorial.pdf` (Parte I) |
| Tutorial de instalação (PDF) | ✅ pronto | `docs/tutorial.pdf` (Parte II) / fonte `docs/tutorial.tex` |
| Apresentação (PDF) | ✅ pronto | `docs/apresentacao.pdf` / fonte `docs/apresentacao.tex` |
| Conteúdo dos campos do GPSC | ✅ redigido | `docs/gpsc.txt` (texto puro) e `docs/gpsc.md` |
| Vídeo | ⏳ pendente (usuário) | seguir `docs/tutorial.pdf` como roteiro |
| Preencher o GPSC na plataforma | ⏳ pendente (usuário) | colar de `docs/gpsc.txt` |
| Rodar a coleta de métricas | ⏳ pendente (usuário) | gera `metrics/metrics.csv` + gráficos |

## O que falta (ações do usuário)

1. **Colar o conteúdo no GPSC** (https://joaopessoa.ifpb.edu.br/gpsc) a partir de `docs/gpsc.txt`.
   Blocos 1–4 já dá pra colar; **Analisar/Finalizar** precisam dos números do experimento.
2. **Rodar as chamadas** nos perfis de rede para gerar dados reais (ver abaixo).
3. **Gravar o vídeo** demonstrando o tutorial.

## Como rodar (resumo)

```bash
# subir o ambiente (Linux + Docker)
docker-compose up --build            # sudo se necessario

# usar: abrir http://localhost:3000 em 2 janelas (Alice/Bob), permitir microfone,
# trocar mensagens e clicar em "Escalar para ligacao"

# experimento (perfis de rede):
sudo bash scripts/netem.sh apply 100 0 delay100
sudo bash scripts/netem.sh apply 0 5  loss5
sudo bash scripts/netem.sh clear

# analise: abrir analysis/analise.ipynb (le metrics/metrics.csv)

# regenerar os PDFs apos editar os .tex:
cd docs && pdflatex tutorial.tex && pdflatex tutorial.tex
cd docs && pdflatex apresentacao.tex && pdflatex apresentacao.tex
```

Detalhes completos e troubleshooting: ver `README.md`.

## Mapa dos arquivos principais

- `docker-compose.yml` — orquestra `asterisk` + `chat-server` (network_mode host).
- `asterisk/config/` — http, pjsip (WebRTC), dialplan, AMI, `modules.conf` (noload chan_sip).
- `chat-server/server.js` — chat (WebSocket) + AMI Originate + coletor de métricas (CSV).
- `chat-server/public/` — front (`index.html`, `app.js` com JsSIP, `vendor/jssip.min.js`).
- `scripts/netem.sh` — perfis de degradação de rede (tc/netem).
- `analysis/analise.ipynb` — gráficos do experimento.
- `docs/` — `tutorial.(tex|pdf)`, `apresentacao.(tex|pdf)`, `gpsc.(txt|md)`.

## Notas de ambiente (gotchas)

- Precisa ser **Linux** (`network_mode: host`).
- `docker-compose` v1 + Docker novo: para **recriar** containers use `docker-compose down && docker-compose up -d --build` (bug `ContainerConfig`).
- `chan_sip` fica com `noload` (senão quebra o WebRTC).
- Mídia/microfone só liberam em `http://localhost` (contexto seguro).
