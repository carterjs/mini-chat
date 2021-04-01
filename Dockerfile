FROM hayd/deno:latest

EXPOSE 8000

WORKDIR /app

ADD . /app

RUN deno cache index.ts

CMD ["run", "--allow-net", "--allow-read", "index.ts"]