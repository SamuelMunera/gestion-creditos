# Web sencilla: Login + Dashboard

App de ejemplo con **Node.js (Express + JWT)** en el backend y **Angular** en el frontend.
Flujo: pantalla de **login** → si las credenciales son válidas, entra al **dashboard** con una **tabla** de créditos. Al hacer clic en una fila se despliega el detalle (valor crédito, valor cuota, fecha de pago, cuotas restantes).

## Credenciales de prueba

- Usuario: `admin`
- Contraseña: `1234`

## Estructura

```
papá/
├─ backend/          API en Node.js (Express)
│  └─ server.js      Login (JWT) + endpoint /api/creditos protegido
├─ frontend/         App Angular (login + dashboard)
│  └─ src/app/
│     ├─ pages/login       Pantalla de login
│     ├─ pages/dashboard   Tabla de datos
│     ├─ services          AuthService (login, token)
│     ├─ guards            Protege /dashboard
│     └─ interceptors      Agrega el token JWT a las peticiones
├─ iniciar-backend.cmd     Doble clic para arrancar la API
└─ iniciar-frontend.cmd    Doble clic para arrancar Angular
```

## Cómo ejecutar

Necesitas **dos terminales** (o hacer doble clic en los dos `.cmd`):

**1) Backend** (puerto 3000):

```
node backend/server.js
```

o doble clic en `iniciar-backend.cmd`.

**2) Frontend** (puerto 4200):

```
cd frontend
node node_modules/@angular/cli/bin/ng.js serve --open
```

o doble clic en `iniciar-frontend.cmd`.

Luego abre http://localhost:4200

> Nota: en este equipo el comando `npm` está roto (apunta a una instalación
> antigua de nvm). Por eso los scripts llaman a `node` directamente. Las
> dependencias ya quedaron instaladas. Si más adelante quieres reparar `npm`,
> lo más sencillo es reinstalar Node.js desde https://nodejs.org

## Cómo está hecho

- **Login:** el frontend envía usuario/clave a `POST /api/login`. Si son
  correctos, el backend responde con un **token JWT** que se guarda en
  `localStorage`.
- **Dashboard protegido:** un *guard* de Angular impide entrar sin token, y un
  *interceptor* añade el header `Authorization: Bearer <token>` a las peticiones.
- **Tabla:** el dashboard pide `GET /api/creditos` (ruta protegida en el
  backend) y muestra `#`, nombre y fecha final. Al hacer clic en una fila se
  despliega el detalle del crédito.
- **Crear:** el botón "＋ Crear" abre un formulario que envía `POST /api/creditos`.
  Se ingresa la **fecha inicial** y una **frecuencia** (7, 15 o 30 días). A partir
  de ahí el backend **calcula automáticamente**:
  - la **próxima fecha de pago** = fecha inicial + frecuencia;
  - la **fecha final** = fecha inicial + (frecuencia × cantidad de cuotas);
  - el **valor de la cuota** = (valor producto + intereses) ÷ cantidad de cuotas.
- **Registrar pago:** al abrir el detalle de un crédito, el botón "Pago" abre una
  ventana que **pide la fecha en que se pagó**; al confirmar envía
  `POST /api/creditos/:id/pago` con esa fecha, que la guarda en el historial,
  resta una cuota y adelanta la próxima fecha de pago según la frecuencia.
- **Historial:** el botón "Historial" (junto a "Pago") muestra la lista de fechas
  en las que se pagaron las cuotas de ese crédito.
- **Alerta de mora:** si la próxima fecha de pago ya venció y aún quedan cuotas,
  el crédito se marca "⚠ En mora" (badge en la fila + banner de aviso arriba de la
  tabla). Se calcula en el navegador comparando la fecha de pago con la fecha de hoy.
- **Eliminar:** el botón "Eliminar" abre una ventana de confirmación donde hay
  que escribir la palabra **confirmar**; entonces se envía `DELETE
  /api/creditos/:id` (borrado permanente).
- **Guardado permanente:** los créditos se guardan en `backend/datos.json`, así
  que **no se pierden al reiniciar** el servidor. Si borras ese archivo, vuelven
  a aparecer los 6 datos de ejemplo.
- **Imprimir:** el botón "🖨 Imprimir" abre el diálogo de impresión del navegador
  con una tabla limpia (todos los datos, sin menús ni botones). Desde ahí puedes
  imprimir en papel o "Guardar como PDF".
- **Pestañas Simulador / Créditos:** en la parte superior del cuadro se cambia
  entre la vista de créditos y el simulador.
- **Simulador de crédito:** calcula al instante el monto de intereses, el total a
  pagar, el valor de la cuota, la fecha final y una **tabla con todas las cuotas y
  sus fechas**. Todo en el navegador (no se guarda). Un botón permite **crear un
  crédito con esos datos** (abre el formulario ya lleno para ponerle el nombre).
- **Responsivo:** la interfaz se adapta a móvil — formularios a una sola columna,
  barra superior y cabecera apiladas, y tablas con desplazamiento horizontal.
