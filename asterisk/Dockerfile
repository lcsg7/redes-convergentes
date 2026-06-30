FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Evita que o postinst do asterisk tente iniciar o servico durante o build
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d && chmod +x /usr/sbin/policy-rc.d

# Ubuntu 22.04 traz o Asterisk 18 (PJSIP + WebSocket + WebRTC) no repo universe,
# que ja vem habilitado na imagem oficial. Sem --no-install-recommends para
# garantir os modulos de midia (res_srtp para DTLS-SRTP do WebRTC).
RUN apt-get update \
    && apt-get install -y asterisk \
    && rm -rf /var/lib/apt/lists/*

# Nossa configuracao sobrescreve os arquivos de exemplo do pacote
COPY config/ /etc/asterisk/

# http/ws (SIP sobre WebSocket), AMI e faixa RTP
EXPOSE 8088 5038 10000-10100/udp

CMD ["asterisk", "-f", "-vvv"]
