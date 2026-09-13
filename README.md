# Comandero

Aplicación de comandas para una cafetería, construida con NestJS (patrón MVC, vistas Handlebars) y MongoDB Atlas (Mongoose).

- El **camarero** ve las mesas (4 interior, 4 terraza A, 4 terraza B) con su estado (`libre`, `reservada`, `ocupada`), abre una mesa y añade productos organizados por categoría.
- Los productos de categorías con destino `cocina` llegan en tiempo real (WebSockets) a la vista de **cocina**, donde el cocinero (login propio) sólo ve esos platos.
- El **admin** gestiona categorías y productos desde `/admin`.

## Requisitos

- Node.js y npm
- Un clúster de MongoDB Atlas y una cadena de conexión

### Reconocimiento inteligente de pedidos por voz

Para interpretar comandas mediante IA, añade esta variable en el entorno del servidor (nunca en código cliente):

```env
OPENAI_API_KEY=tu_clave_de_api
# Opcional: OPENAI_VOICE_ORDER_MODEL=gpt-5.4
```

Sin esta clave, el botón de voz seguirá transcribiendo, pero no podrá interpretar la comanda.

## Puesta en marcha

1. Crea `.env` con estas variables:

   ```env
   MONGODB_URI=mongodb+srv://USUARIO:CONTRASENA@CLUSTER.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=comandero
   SESSION_SECRET=una_clave_larga_y_aleatoria
   ```

   En Atlas, añade la IP del servidor a Network Access y crea el usuario de base de datos.
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

Cada dominio vive en `src/modules/<nombre>` con `entities/`, `services/` y `controllers/` (Mongoose + Nest). Las vistas Handlebars están en `src/views`, los estáticos (CSS) en `src/public`. El estado en tiempo real (nuevos pedidos a cocina, platos listos) se transmite vía Socket.IO (`src/modules/events`).

## Scripts

- `npm run start:dev` — desarrollo con recarga en caliente
- `npm run build` / `npm run start:prod` — build y ejecución en producción
- `npm run seed` — datos de prueba

- `gcloud run deploy comandero` - despliegue en gcloud (una vez hecho el build)
   ó
   gcloud run services update comandero --region=europe-west3 
  --project=linaje-504114 
  --set-env-vars="MONGODB_DB=comandero"
