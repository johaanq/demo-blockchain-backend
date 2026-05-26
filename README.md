# Demo Blockchain — Backend (NestJS)

API con **NestJS**, **arquitectura hexagonal** y **DDD**.

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

Desde esta carpeta (`demo-blockchain-backend`):

```bash
docker compose up --build
```

- API: `http://localhost:4000/api`
- Variables en `docker-compose.yml`: `PORT`, `DIFFICULTY`

Detener:

```bash
docker compose down
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado |
| POST | `/api/chain/init` | Bloque génesis |
| GET | `/api/chain` | Listar cadena |
| POST | `/api/chain/blocks` | Añadir bloque |
| POST | `/api/chain/mine` | Minar (PoW) |
| GET | `/api/chain/validate` | Validar integridad |
| POST | `/api/chain/tamper` | Alterar sin recalcular hash (demo) |

## Variables de entorno

Ver `.env.example`: `PORT`, `DIFFICULTY`, `CORS_ORIGINS`.
