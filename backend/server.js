import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = 3000;
const JWT_SECRET = "cambia-esta-clave-secreta"; // en producción usar variable de entorno

app.use(cors());
app.use(express.json());

// --- "Base de datos" en memoria (sencillo, sin BD real) ---
const USUARIOS_LOGIN = [
  { usuario: "admin", clave: "1234", nombre: "Administrador" },
];

// Datos de ejemplo (semilla) por si aún no existe el archivo local
const SEMILLA = [
  { id: 1, nombre: "Ana Gómez",    fechaInicial: "2026-07-16", fechaFinal: "2026-12-15", valorProducto: 5000000, valorIntereses: 5,      tipoInteres: "porcentaje", valorCuota: 437500, frecuenciaPago: 30, fechaPago: "2026-08-15", cantidadCuotas: 12, cuotasRestantes: 8,  historialPagos: ["2026-04-16", "2026-05-16", "2026-06-15", "2026-07-15"] },
  { id: 2, nombre: "Luis Pérez",   fechaInicial: "2026-08-05", fechaFinal: "2027-03-20", valorProducto: 8000000, valorIntereses: 800000, tipoInteres: "fijo",       valorCuota: 488889, frecuenciaPago: 15, fechaPago: "2026-08-20", cantidadCuotas: 18, cuotasRestantes: 18, historialPagos: [] },
  { id: 3, nombre: "María Ruiz",   fechaInicial: "2026-07-29", fechaFinal: "2026-10-05", valorProducto: 3000000, valorIntereses: 3,      tipoInteres: "porcentaje", valorCuota: 515000, frecuenciaPago: 7,  fechaPago: "2026-07-20", cantidadCuotas: 6,  cuotasRestantes: 5,  historialPagos: ["2026-07-13"] },
  { id: 4, nombre: "Carlos Díaz",  fechaInicial: "2026-07-31", fechaFinal: "2027-01-30", valorProducto: 6500000, valorIntereses: 500000, tipoInteres: "fijo",       valorCuota: 466667, frecuenciaPago: 30, fechaPago: "2026-08-30", cantidadCuotas: 15, cuotasRestantes: 15, historialPagos: [] },
  { id: 5, nombre: "Sofía Torres", fechaInicial: "2026-07-28", fechaFinal: "2026-11-12", valorProducto: 4200000, valorIntereses: 4,      tipoInteres: "porcentaje", valorCuota: 546000, frecuenciaPago: 15, fechaPago: "2026-08-12", cantidadCuotas: 8,  cuotasRestantes: 8,  historialPagos: [] },
  { id: 6, nombre: "Jorge Vega",   fechaInicial: "2026-08-11", fechaFinal: "2027-05-18", valorProducto: 9000000, valorIntereses: 900000, tipoInteres: "fijo",       valorCuota: 412500, frecuenciaPago: 7,  fechaPago: "2026-08-18", cantidadCuotas: 24, cuotasRestantes: 24, historialPagos: [] },
];

// --- Persistencia local: se guardan/leen los créditos en un archivo JSON ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO_DATOS = path.join(__dirname, "datos.json");

function cargarDatos() {
  try {
    if (fs.existsSync(ARCHIVO_DATOS)) {
      return JSON.parse(fs.readFileSync(ARCHIVO_DATOS, "utf-8"));
    }
  } catch (e) {
    console.error("No se pudo leer datos.json, se usan los datos de ejemplo:", e.message);
  }
  return SEMILLA;
}

function guardarDatos() {
  try {
    fs.writeFileSync(ARCHIVO_DATOS, JSON.stringify(CREDITOS, null, 2), "utf-8");
  } catch (e) {
    console.error("No se pudo guardar datos.json:", e.message);
  }
}

let CREDITOS = cargarDatos();
if (!fs.existsSync(ARCHIVO_DATOS)) {
  guardarDatos(); // crea el archivo la primera vez
}

// --- Utilidades de fechas (formato YYYY-MM-DD) ---
function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDias(fechaISO, dias) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(fechaISO || "") ? fechaISO : hoyISO();
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(dias));
  return d.toISOString().slice(0, 10);
}

// --- Middleware para validar el token JWT ---
function verificarToken(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ mensaje: "No autorizado: falta el token" });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
}

// --- Rutas ---
app.post("/api/login", (req, res) => {
  const { usuario, clave } = req.body || {};
  const encontrado = USUARIOS_LOGIN.find(
    (u) => u.usuario === usuario && u.clave === clave
  );

  if (!encontrado) {
    return res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
  }

  const token = jwt.sign(
    { usuario: encontrado.usuario, nombre: encontrado.nombre },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({ token, nombre: encontrado.nombre });
});

app.get("/api/creditos", verificarToken, (req, res) => {
  res.json(CREDITOS);
});

app.post("/api/creditos", verificarToken, (req, res) => {
  const {
    nombre,
    fechaInicial,
    valorProducto,
    valorIntereses,
    tipoInteres,
    frecuenciaPago,
    cantidadCuotas,
    cuotasRestantes,
  } = req.body || {};

  if (!nombre || !fechaInicial) {
    return res
      .status(400)
      .json({ mensaje: "El nombre y la fecha inicial son obligatorios" });
  }

  const nuevoId = CREDITOS.length
    ? Math.max(...CREDITOS.map((c) => c.id)) + 1
    : 1;

  // Solo se permiten 7, 15 o 30 días; por defecto 30.
  const frecuencia = [7, 15, 30].includes(Number(frecuenciaPago))
    ? Number(frecuenciaPago)
    : 30;

  const tipo = tipoInteres === "fijo" ? "fijo" : "porcentaje";
  const producto = Number(valorProducto) || 0;
  const intereses = Number(valorIntereses) || 0;
  const cuotas = Number(cantidadCuotas) || 0;

  // Monto de intereses: porcentaje sobre el producto o un valor fijo.
  const montoIntereses = tipo === "porcentaje" ? (producto * intereses) / 100 : intereses;

  // El valor de la cuota se calcula automáticamente: (producto + intereses) / cuotas.
  const valorCuota = cuotas > 0 ? Math.round((producto + montoIntereses) / cuotas) : 0;

  const nuevo = {
    id: nuevoId,
    nombre,
    fechaInicial,
    // La fecha final se calcula: fecha inicial + (frecuencia * cantidad de cuotas).
    fechaFinal: cuotas > 0 ? sumarDias(fechaInicial, frecuencia * cuotas) : fechaInicial,
    valorProducto: producto,
    valorIntereses: intereses,
    tipoInteres: tipo,
    valorCuota,
    frecuenciaPago: frecuencia,
    // La próxima fecha de pago se calcula: fecha inicial + frecuencia.
    fechaPago: sumarDias(fechaInicial, frecuencia),
    cantidadCuotas: cuotas,
    cuotasRestantes: Number(cuotasRestantes) || 0,
    historialPagos: [],
  };

  CREDITOS.push(nuevo);
  guardarDatos();
  res.status(201).json(nuevo);
});

// Registrar un pago: baja una cuota y avanza la próxima fecha de pago.
app.post("/api/creditos/:id/pago", verificarToken, (req, res) => {
  const id = Number(req.params.id);
  const credito = CREDITOS.find((c) => c.id === id);
  if (!credito) {
    return res.status(404).json({ mensaje: "Crédito no encontrado" });
  }

  if (credito.cuotasRestantes > 0) {
    // La fecha del pago la confirma el usuario; si no viene, se usa hoy.
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.fecha || "")
      ? req.body.fecha
      : hoyISO();
    if (!Array.isArray(credito.historialPagos)) credito.historialPagos = [];
    credito.historialPagos.push(fecha);
    credito.cuotasRestantes -= 1;
    credito.fechaPago = sumarDias(credito.fechaPago, credito.frecuenciaPago || 30);
    guardarDatos();
  }

  res.json(credito);
});

// Eliminar (hard delete) un crédito.
app.delete("/api/creditos/:id", verificarToken, (req, res) => {
  const id = Number(req.params.id);
  const indice = CREDITOS.findIndex((c) => c.id === id);
  if (indice === -1) {
    return res.status(404).json({ mensaje: "Crédito no encontrado" });
  }

  CREDITOS.splice(indice, 1);
  guardarDatos();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
