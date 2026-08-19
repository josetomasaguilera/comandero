# Comandero

Aplicación de comandas para una cafetería, construida con NestJS (patrón MVC, vistas Handlebars) y PostgreSQL (TypeORM).

- El **camarero** ve las mesas (4 interior, 4 terraza A, 4 terraza B) con su estado (`libre`, `reservada`, `ocupada`), abre una mesa y añade productos organizados por categoría.
- Los productos de categorías con destino `cocina` llegan en tiempo real (WebSockets) a la vista de **cocina**, donde el cocinero (login propio) sólo ve esos platos.
- El **admin** gestiona categorías y productos desde `/admin`.

## Requisitos

- Node.js y npm
- PostgreSQL accesible (por defecto `localhost:5432`)

## Puesta en marcha

1. Copia `.env.example` a `.env` y ajusta las credenciales de tu Postgres.
2. Crea la base de datos indicada en `DB_DATABASE` (por defecto `comandero`).
3. Instala dependencias:

   ```bash
   npm install
   ```

4. Puebla datos de prueba (12 mesas, usuarios, categorías y productos):

   ```bash
   npm run seed
   ```

   Usuarios creados: `admin/admin123`, `camarero/camarero123`, `cocina/cocina123`.

5. Arranca en modo desarrollo:

   ```bash
   npm run start:dev
   ```

   La app queda disponible en `http://localhost:3002`.

## Estructura

Cada dominio vive en `src/modules/<nombre>` con `entities/`, `services/` y `controllers/` (TypeORM + Nest). Las vistas Handlebars están en `src/views`, los estáticos (CSS) en `src/public`. El estado en tiempo real (nuevos pedidos a cocina, platos listos) se transmite vía Socket.IO (`src/modules/events`).

## Scripts

- `npm run start:dev` — desarrollo con recarga en caliente
- `npm run build` / `npm run start:prod` — build y ejecución en producción
- `npm run seed` — datos de prueba

- `gcloud run deploy comandero` - despliegue en gcloud (una vez hecho el build)
   ó
   gcloud run services update comandero `
  --region=europe-west3 `
  --project=linaje-504114 `
  --set-env-vars="DB_HOST=34.40.74.30,DB_PORT=5432,DB_USERNAME=postgres,DB_DATABASE=comandero,DB_SSL=false,DB_PASSWORD=@Tomas1968"
