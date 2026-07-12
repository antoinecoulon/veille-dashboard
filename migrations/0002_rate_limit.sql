-- Table de rate limiting Better Auth (C5) — storage 'database'.
-- Nécessaire sur Cloudflare : la mémoire n'est pas partagée entre isolates.
-- Générée via `pnpm auth:generate` (schéma complet), extraite ici en migration dédiée.

create table "rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);
