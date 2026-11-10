# Médico de Cabecera App — MVP

Plataforma web responsiva para un piloto de telemedicina preventiva en Honduras. El repositorio público contiene **solo código y pruebas con datos ficticios**. No se debe ingresar información clínica real antes de completar la revisión legal, clínica y de seguridad indicada abajo.

## Alcance funcional

- Registro e inicio de sesión. El registro público crea solo pacientes. Un administrador se crea por comando separado.
- Solicitud de perfil médico (especialidad, colegiación, descripción) y aprobación manual por administrador. La aplicación no valida automáticamente la licencia.
- Publicación de horarios por médicos aprobados, reserva por pacientes con membresía activa y consultas por chat.
- Nota clínica por el médico asignado, visible al paciente, y carga/descarga privada de PDF, PNG o JPEG (máximo 5 MB). Mensajes, notas y archivos se cifran en reposo con una clave derivada de `APP_SECRET`.
- Planes individual, familiar y empresarial asignados manualmente por administración. No hay pagos ni gestión real de integrantes de familia en esta versión.
- Panel administrativo para verificar médicos, asignar planes y consultar auditoría **sin acceso al contenido clínico**.
- Consentimiento explícito y revocable para una futura asistencia IA. **No se envían datos a un modelo ni se generan recomendaciones automáticas.** Grabación y transcripción están deshabilitadas; hay campo de consentimiento preparado, sin flujo de captura.
- Videollamada opcional mediante un servidor Jitsi privado indicado en `VIDEO_BASE_URL`. Esta app solo entrega un enlace de sala aleatoria a los participantes de la cita. No ofrece grabación, transcripción ni control de acceso dentro de Jitsi. Para un piloto clínico, configure autenticación y controles de acceso del servidor de video antes de habilitarlo.

Quedan fuera la academia virtual de IA y una app separada de foto de comida/calorías.

## Ejecutar localmente

Requiere Node.js 22 o superior.

```bash
npm ci
cp .env.example .env
# Edite .env: configure APP_SECRET y APP_ORIGIN
set -a; source .env; set +a
npm run build
npm start
```

Abra `http://localhost:3000`. Para desarrollo, `npm run dev` reinicia el servidor; si cambia el cliente, ejecute `npm run build` de nuevo.

Cree el administrador inicial en un entorno seguro:

```bash
ADMIN_EMAIL=admin@example.org ADMIN_PASSWORD='una-clave-larga-y-unica' node server/bootstrap-admin.js
```

El valor de `ADMIN_PASSWORD` debe tener al menos 16 caracteres. Evite dejarlo en el historial de comandos: en un despliegue use variables temporales o el gestor de secretos del proveedor. Ingrese como administrador, active la membresía del paciente de prueba y apruebe una solicitud médica **solo tras una validación manual real**. El médico puede publicar horarios; el paciente puede reservar, chatear y subir archivos.

## Pruebas y CI

```bash
npm run lint
npm test
npm run build
```

GitHub Actions ejecuta las tres tareas en cada push y pull request. Las pruebas usan bases temporales y datos ficticios.

## Despliegue

El contenedor permite un despliegue sencillo en un servidor con HTTPS, volumen persistente y copias de seguridad cifradas:

```bash
docker build -t medico-de-cabecera-app .
docker run --rm -p 3000:3000 \
  --env-file .env.production \
  -v medico-data:/app/data \
  medico-de-cabecera-app
```

Configure `APP_SECRET` (32+ caracteres aleatorios), `APP_ORIGIN` (origen HTTPS exacto), `NODE_ENV=production`, `DATA_DIR=/app/data` y, opcionalmente, `VIDEO_BASE_URL` (HTTPS a Jitsi privado). Termine TLS en un proxy confiable. El volumen debe ser privado y persistente. **No cambie `APP_SECRET` sin un plan de recifrado:** los datos cifrados existentes no podrán leerse. Mantenga secretos fuera del repositorio y fuera de los logs. La app no incluye despliegue automático porque no hay proveedor/servidor definido; CI comprueba el artefacto antes de publicarlo.

En producción también se requieren: gestión de copias y restauración, monitoreo, rotación de claves, análisis antivirus de cargas, límites de abuso distribuidos, correo de recuperación de cuenta, política de retención/borrado, evaluación de seguridad y controles de acceso del proveedor de video. SQLite con un único volumen sirve para un piloto pequeño de una instancia; para múltiples instancias migre a una base transaccional compartida y almacenamiento privado de objetos.

## Privacidad, roles y límites

Las sesiones usan cookies `HttpOnly`, `SameSite=Strict` y `Secure` en producción; las escrituras requieren token CSRF y comprueban el origen. El registro público nunca otorga rol médico ni administrativo. Los detalles de cada consulta y sus archivos solo son accesibles para el paciente y el médico asignado. Administración ve metadatos de reservas y eventos de auditoría, sin notas, mensajes ni documentos. Los nombres de archivos no se usan como rutas en disco. Los documentos se sirven como descarga y no desde un directorio público.

Un plan empresarial se asigna a cada usuario de forma manual; no existe un portal de empleador ni acceso de empresas a datos clínicos. El plan familiar es una categoría de membresía, no autoriza a familiares a leer expedientes. Las urgencias se dirigen a servicios de emergencia presenciales/locales.

**Pendiente antes de uso con pacientes reales:** verificar con asesoría hondureña las reglas de telemedicina, privacidad, expedientes, recetas, consentimiento, grabación, licencias y colegiación de médicos; definir el protocolo clínico de urgencias; y completar una revisión de seguridad y protección de datos. Este código no afirma cumplimiento regulatorio. No emite recetas, diagnósticos automáticos ni certificados médicos.

## Arquitectura

Una aplicación Express sirve la API y la interfaz estática. SQLite guarda usuarios, sesiones, horarios, consultas, membresías, consentimientos y auditoría. Los datos clínicos se cifran con AES-256-GCM antes de persistir. El frontend usa JavaScript sencillo y CSS responsivo; `esbuild` genera el bundle. Los endpoints se documentan de forma legible en `server/index.js`. Se eligió una sola instancia y un solo volumen para reducir complejidad del primer piloto.
