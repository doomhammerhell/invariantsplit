FROM node:22-bookworm-slim AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV FOUNDRY_HOME=/opt/foundry
ENV PATH=/opt/foundry/bin:/workspace/node_modules/.bin:${PATH}

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash build-essential ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

FROM base AS foundry

RUN curl -L https://foundry.paradigm.xyz | bash \
  && /root/.foundry/bin/foundryup \
  && mkdir -p /opt/foundry/bin \
  && cp /root/.foundry/bin/* /opt/foundry/bin/

FROM foundry AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY . .
RUN forge build

FROM base AS runtime

RUN useradd --create-home --shell /bin/bash invariant

COPY --from=foundry /opt/foundry /opt/foundry
COPY --from=deps /workspace/node_modules ./node_modules
COPY . .

RUN chown -R invariant:invariant /opt/foundry /workspace

USER invariant

CMD ["npm", "test"]

FROM runtime AS devcontainer

USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends gh jq less unzip \
  && rm -rf /var/lib/apt/lists/*

USER invariant
