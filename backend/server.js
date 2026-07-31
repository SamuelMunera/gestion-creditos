// Arranque para desarrollo LOCAL: importa la app Express y la pone a escuchar.
// En Vercel no se usa este archivo; allí la app se sirve como función serverless
// desde api/[...path].js.
import app, { conectarDB } from "./app.js";

const PORT = process.env.PORT || 3000;

// Conecta a MongoDB al arrancar para fallar rápido si la BD no está disponible
// (en local). Si falla, se seguirá intentando en la primera petición.
conectarDB()
  .then(() => console.log(`Conectado a MongoDB`))
  .catch((e) =>
    console.error("Aviso: aún no se pudo conectar a MongoDB:", e.message)
  );

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
