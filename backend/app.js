import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carga las variables del archivo backend/.env (Node 24 trae loadEnvFile nativo,
// sin necesidad de instalar dotenv). En Vercel no hay .env: las variables llegan
// desde el panel del proyecto, así que si no existe el archivo se ignora.
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // Sin .env local: se usan process.env (Vercel) o los valores por defecto.
}

const JWT_SECRET = process.env.JWT_SECRET || "cambia-esta-clave-secreta";

// Cadena de conexión a MongoDB. Por defecto usa el Mongo local (servicio de
// Windows). En producción se define MONGODB_URI (por ejemplo, MongoDB Atlas).
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/creditos";

const app = express();
app.use(cors());
app.use(express.json());

// --- Usuarios de login (sencillo, sin BD de usuarios) ---
const USUARIOS_LOGIN = [
  { usuario: "Hector", clave: "6611", nombre: "Hector" },
];

// Datos de ejemplo (semilla) para poblar la BD la primera vez.
// Vacío: la plataforma arranca sin datos de prueba. Los créditos se crean
// desde la aplicación.
const SEMILLA = [];

// --- Modelo de MongoDB (Mongoose) ---
// Se conserva el campo `id` numérico para no cambiar el frontend; además ocultamos
// los campos internos de Mongo (`_id`, `__v`) al serializar a JSON.
const creditoSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    nombre: { type: String, required: true },
    nombreProducto: String,
    cedula: String,
    telefono: String,
    fechaInicial: String,
    fechaFinal: String,
    valorProducto: Number,
    valorIntereses: Number,
    tipoInteres: { type: String, enum: ["porcentaje", "fijo"], default: "porcentaje" },
    valorCuota: Number,
    frecuenciaPago: Number,
    fechaPago: String,
    cantidadCuotas: Number,
    cuotasRestantes: Number,
    historialPagos: { type: [String], default: [] },
    // Si la última cuota (la 12) se le regaló al cliente como incentivo.
    cuotaRegalada: { type: Boolean, default: false },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

// Evita "OverwriteModelError" si el módulo se recarga (invocaciones serverless).
const Credito =
  mongoose.models.Credito || mongoose.model("Credito", creditoSchema);

// --- Conexión a MongoDB cacheada entre invocaciones ---
// En serverless (Vercel) el módulo se reutiliza entre peticiones: guardamos la
// promesa de conexión para no volver a conectar (ni agotar conexiones de Atlas)
// en cada request. Se conecta de forma perezosa en la primera petición.
let promesaConexion = null;

async function conectarDB() {
  if (mongoose.connection.readyState === 1) return; // ya conectado
  if (!promesaConexion) {
    promesaConexion = (async () => {
      await mongoose.connect(MONGODB_URI);
      await inicializarDatos();
    })().catch((e) => {
      promesaConexion = null; // permite reintentar en la próxima petición
      throw e;
    });
  }
  await promesaConexion;
}

// --- Migración/semilla: si la colección está vacía, se cargan los créditos de
// datos.json (solo en local, si existe) o la semilla de ejemplo. ---
const ARCHIVO_DATOS = path.join(__dirname, "datos.json");

async function inicializarDatos() {
  const total = await Credito.estimatedDocumentCount();
  if (total > 0) return;

  let iniciales = SEMILLA;
  try {
    if (fs.existsSync(ARCHIVO_DATOS)) {
      const previos = JSON.parse(fs.readFileSync(ARCHIVO_DATOS, "utf-8"));
      if (Array.isArray(previos) && previos.length) {
        iniciales = previos;
        console.log(`Migrando ${previos.length} crédito(s) desde datos.json a MongoDB...`);
      }
    }
  } catch (e) {
    console.error("No se pudo leer datos.json, se usa la semilla:", e.message);
  }

  if (!iniciales.length) return; // sin semilla: la BD arranca vacía.
  await Credito.insertMany(iniciales);
  console.log(`Base de datos inicializada con ${iniciales.length} crédito(s).`);
}

// El siguiente id numérico disponible (equivale al viejo Math.max(...ids) + 1).
async function siguienteId() {
  const ultimo = await Credito.findOne().sort({ id: -1 }).lean();
  return ultimo ? ultimo.id + 1 : 1;
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

// Asegura la conexión a la BD antes de las rutas que la necesitan.
async function conDB(req, res, next) {
  try {
    await conectarDB();
    next();
  } catch (e) {
    console.error("No se pudo conectar a MongoDB:", e.message);
    res.status(500).json({ mensaje: "No se pudo conectar a la base de datos" });
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

app.get("/api/creditos", verificarToken, conDB, async (req, res) => {
  try {
    const creditos = await Credito.find().sort({ id: 1 });
    res.json(creditos);
  } catch (e) {
    console.error("Error al listar créditos:", e.message);
    res.status(500).json({ mensaje: "Error al consultar la base de datos" });
  }
});

app.post("/api/creditos", verificarToken, conDB, async (req, res) => {
  const {
    nombre,
    nombreProducto,
    cedula,
    telefono,
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

  // El valor de la cuota se calcula sobre UNA cuota menos (regla del negocio):
  // con 12 cuotas se divide entre 11, de modo que en 11 pagos ya se recupera el
  // total. Así la cuota 12 se puede regalar como incentivo sin perder dinero
  // (o cobrarse como ganancia extra si el cliente no gana el incentivo).
  const divisor = cuotas > 1 ? cuotas - 1 : cuotas;
  const valorCuota = divisor > 0 ? Math.round((producto + montoIntereses) / divisor) : 0;

  try {
    const nuevo = await Credito.create({
      id: await siguienteId(),
      nombre,
      nombreProducto: nombreProducto || "",
      cedula: cedula || "",
      telefono: telefono || "",
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
    });
    res.status(201).json(nuevo);
  } catch (e) {
    console.error("Error al crear crédito:", e.message);
    res.status(500).json({ mensaje: "Error al guardar en la base de datos" });
  }
});

// Registrar un pago: baja una cuota y avanza la próxima fecha de pago.
app.post("/api/creditos/:id/pago", verificarToken, conDB, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const credito = await Credito.findOne({ id });
    if (!credito) {
      return res.status(404).json({ mensaje: "Crédito no encontrado" });
    }

    if (credito.cuotasRestantes > 0) {
      // La fecha del pago la confirma el usuario; si no viene, se usa hoy.
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.fecha || "")
        ? req.body.fecha
        : hoyISO();
      credito.historialPagos.push(fecha);
      credito.cuotasRestantes -= 1;
      credito.fechaPago = sumarDias(credito.fechaPago, credito.frecuenciaPago || 30);
      await credito.save();
    }

    res.json(credito);
  } catch (e) {
    console.error("Error al registrar pago:", e.message);
    res.status(500).json({ mensaje: "Error al actualizar la base de datos" });
  }
});

// Regalar la última cuota: salda el crédito perdonando la cuota 12 como
// incentivo. Solo aplica cuando queda exactamente 1 cuota (la última).
app.post("/api/creditos/:id/regalar", verificarToken, conDB, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const credito = await Credito.findOne({ id });
    if (!credito) {
      return res.status(404).json({ mensaje: "Crédito no encontrado" });
    }

    if (credito.cuotasRestantes !== 1) {
      return res
        .status(400)
        .json({ mensaje: "Solo se puede regalar la última cuota (debe quedar 1)" });
    }

    credito.cuotasRestantes = 0;
    credito.cuotaRegalada = true;
    await credito.save();

    res.json(credito);
  } catch (e) {
    console.error("Error al regalar la cuota:", e.message);
    res.status(500).json({ mensaje: "Error al actualizar la base de datos" });
  }
});

// Eliminar (hard delete) un crédito.
app.delete("/api/creditos/:id", verificarToken, conDB, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const eliminado = await Credito.findOneAndDelete({ id });
    if (!eliminado) {
      return res.status(404).json({ mensaje: "Crédito no encontrado" });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("Error al eliminar crédito:", e.message);
    res.status(500).json({ mensaje: "Error al actualizar la base de datos" });
  }
});

export default app;
export { conectarDB };
