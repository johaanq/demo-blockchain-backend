# Ledger electoral — Backend (NestJS)

API para **registro inmutable de votos** (demo: segunda vuelta Perú 2026, **Keiko Fujimori vs Roberto Sánchez**). NestJS, arquitectura hexagonal y DDD.

## Estructura

```
src/
  domain/              # Entidades, agregados, value objects, puertos
  application/         # Casos de uso + BlockFactory
  infrastructure/      # SHA-256, repositorio en memoria
  blockchain/          # Controller, service, DTOs, módulo Nest
  main.ts
  app.module.ts
```

## Desarrollo local

```bash
npm install
npm run dev
```

API: `http://localhost:4000/api`

## Docker

```bash
docker compose up --build
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado y dificultad PoW |
| PATCH | `/api/config/difficulty` | Ajustar dificultad del sellado |
| POST | `/api/chain/init` | Apertura de jornada (solo génesis) |
| GET | `/api/chain` | Cadena de escrutinio |
| POST | `/api/chain/blocks` | Registrar voto sin sellar |
| POST | `/api/chain/mine` | Sellar voto (PoW) |
| POST | `/api/chain/mine/stream` | Sellar con eventos SSE en vivo |
| GET | `/api/chain/validate` | Validar integridad del escrutinio |
| POST | `/api/chain/tamper` | Simular fraude (demo) |

## Génesis

Al arrancar el servidor la cadena está **vacía** (sin registros). La jornada se abre con `POST /api/chain/init` o automáticamente al registrar el primer voto desde el frontend.

Al inicializar se crea el bloque:

`GENESIS | 2da-vuelta-PE | KEIKO vs SANCHEZ | apertura-jornada | 07-jun-2026`

## Variables de entorno

Ver `.env.example`: `PORT`, `DIFFICULTY`, `CORS_ORIGINS`.
