FROM oven/bun:1.3 AS base
WORKDIR /app

# Install curl for health check (before source copy for layer caching)
RUN apt-get update -qq && apt-get install -y -qq curl && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY src/ ./src/

# Run as non-root user
RUN groupadd --system accord && useradd --system --gid accord --no-create-home accord \
    && mkdir -p /app/uploads /app/data \
    && chown -R accord:accord /app
USER accord

EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
