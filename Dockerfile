FROM hayd/alpine-deno:1.9.0

# The port that your application listens to.
EXPOSE 8080

# Set base working directory
WORKDIR /app

# Prefer not to run as root.
USER deno

# These steps will be re-run upon each file change in your working directory:
ADD . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache /app/src/index.ts

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "/app/src/index.ts"]