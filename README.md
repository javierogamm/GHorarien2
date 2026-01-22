# Calendario GHorarien

Aplicación web con Next.js + Appwrite (solo Databases) para gestionar eventos por usuario.

## Variables de entorno

Crea un archivo `.env.local` con:

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_APPWRITE_DATABASE_ID=
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID=
NEXT_PUBLIC_APPWRITE_EVENTS_COLLECTION_ID=
```

## Appwrite: creación de colecciones

1. Crea una base de datos en Appwrite y anota el **Database ID**.
2. Crea la colección `users` con los campos EXACTOS:
   - `user` (string, único)
   - `pass` (string)
3. Crea la colección `tabla` con los campos EXACTOS:
   - `eventType` (string)
   - `nombre` (string)
   - `user` (string)
   - `fecha` (datetime, ISO)
   - `horaInicio` (datetime, ISO)
   - `horaFin` (datetime, ISO)
   - `duration` (number)
   - `notas` (string)
4. Configura permisos de lectura/escritura según tus necesidades (no se usa Appwrite Auth).

### Script de ejemplo (Appwrite CLI)

Si usas Appwrite CLI, puedes adaptar los siguientes comandos:

```bash
appwrite databases create \
  --databaseId "unique()" \
  --name "Calendario"

appwrite databases createCollection \
  --databaseId "<DATABASE_ID>" \
  --collectionId "unique()" \
  --name "users"

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<USERS_COLLECTION_ID>" \
  --key "user" \
  --size 255 \
  --required true

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<USERS_COLLECTION_ID>" \
  --key "pass" \
  --size 255 \
  --required true

appwrite databases createCollection \
  --databaseId "<DATABASE_ID>" \
  --collectionId "unique()" \
  --name "tabla"

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "eventType" \
  --size 64 \
  --required true

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "nombre" \
  --size 255 \
  --required true

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "user" \
  --size 255 \
  --required true

appwrite databases createDatetimeAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "fecha" \
  --required true

appwrite databases createDatetimeAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "horaInicio" \
  --required true

appwrite databases createDatetimeAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "horaFin" \
  --required true

appwrite databases createIntegerAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "duration" \
  --required true

appwrite databases createStringAttribute \
  --databaseId "<DATABASE_ID>" \
  --collectionId "<EVENTS_COLLECTION_ID>" \
  --key "notas" \
  --size 500 \
  --required false
```

> Nota: Ajusta los IDs reales de base de datos y colecciones en las variables de entorno.

## Desarrollo local

```bash
npm install
npm run dev
```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno listadas arriba.
3. Despliega sin configuraciones especiales.
