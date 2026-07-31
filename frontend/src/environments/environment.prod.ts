// Entorno de PRODUCCIÓN (ng build). En Vercel el backend se sirve en el mismo
// dominio bajo /api, así que se usa una ruta relativa (sin CORS ni URL fija).
export const environment = {
  production: true,
  apiUrl: '/api',
};
