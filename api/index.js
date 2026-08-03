// Entrada serverless de Vercel: expone la app Express para TODA la API.
// El rewrite de vercel.json enruta cualquier /api/... (a cualquier profundidad:
// /api/login, /api/creditos, /api/creditos/:id, /api/creditos/:id/pago) a esta
// función. La app Express, cuyas rutas ya empiezan por /api, resuelve internamente
// según la URL original de la petición.
import app from "../backend/app.js";

export default app;
