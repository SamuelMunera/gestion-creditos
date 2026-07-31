// Entrada serverless de Vercel: expone la app Express en /api/*.
// Vercel enruta cualquier /api/... a este archivo (ruta comodín [...path]);
// la app Express, cuyas rutas ya empiezan por /api, resuelve internamente.
import app from "../backend/app.js";

export default app;
