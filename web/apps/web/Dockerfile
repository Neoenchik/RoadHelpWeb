FROM node:20-bookworm-slim

WORKDIR /workspace/apps/web

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY apps/web/docker-entrypoint.sh /usr/local/bin/roadhelp-web-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/roadhelp-web-entrypoint \
    && chmod +x /usr/local/bin/roadhelp-web-entrypoint

EXPOSE 3000

ENTRYPOINT ["roadhelp-web-entrypoint"]
CMD ["npm", "run", "dev"]
