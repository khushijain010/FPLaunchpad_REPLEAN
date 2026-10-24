# The public live-mode server: Lean 4 + the extractor + the Fastify backend, in one sandboxed box.
# It runs code strangers paste, so: non-root user, no secrets in the image or environment, source
# filtering + rate limits in the app (REPLEAN_PUBLIC=1), and a hard per-run timeout.
# See docs/LIVE.md.

FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates git \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@9.15.9 \
 && useradd --create-home --shell /usr/sbin/nologin lean

USER lean
ENV ELAN_HOME=/home/lean/.elan \
    PATH=/home/lean/.elan/bin:$PATH
WORKDIR /home/lean/app

# Lean toolchain first, so code changes don't re-download it.
COPY --chown=lean:lean lean/lean-toolchain lean/
RUN curl -sSfL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh \
    | sh -s -- -y --no-modify-path --default-toolchain "$(cat lean/lean-toolchain)"

COPY --chown=lean:lean lean/ lean/
RUN cd lean && lake build extract

COPY --chown=lean:lean package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY --chown=lean:lean apps/server/package.json apps/server/
COPY --chown=lean:lean apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @replean/server

COPY --chown=lean:lean scripts/ scripts/
COPY --chown=lean:lean apps/server/src/ apps/server/src/
COPY --chown=lean:lean apps/web/src/core/ apps/web/src/core/

ENV REPLEAN_PUBLIC=1 \
    NODE_ENV=production \
    PORT=8787
EXPOSE 8787
CMD ["apps/server/node_modules/.bin/tsx", "apps/server/src/index.ts"]
