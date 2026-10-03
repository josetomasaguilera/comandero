# Recuperación de contraseña

En `/login`, «¿Has olvidado tu contraseña?» permite solicitar un enlace con el
usuario y el email asociado. Se piden ambos porque varias cuentas pueden compartir
email. Las cuentas sin email necesitan que el administrador lo configure.

Configura estas variables en el entorno del servidor (también en Cloud Run):

```env
APP_URL=https://tu-dominio.example
SMTP_HOST=smtp.tu-proveedor.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-usuario-smtp
SMTP_PASSWORD=tu-clave-smtp
SMTP_FROM=Comandero <no-reply@tu-dominio.example>
```

En el puerto 587 se exige STARTTLS; para TLS directo usa 465 y `SMTP_SECURE=true`.
Un relay sin autenticación puede omitir `SMTP_USER` y `SMTP_PASSWORD`.
Consulta las [opciones SMTP de Nodemailer](https://nodemailer.com/smtp).
`APP_URL` debe ser la URL pública de la aplicación; no se utiliza el Host enviado
por el navegador para construir enlaces. No guardes credenciales en el repositorio.

El enlace caduca a los 30 minutos. Solo se guarda su hash SHA-256 en MongoDB y se
consume mediante una actualización atómica. Se admite una solicitud por cuenta
cada minuto; un nuevo enlace invalida el anterior. La contraseña necesita al menos
8 caracteres y como máximo 72 bytes UTF-8. Tras el cambio, las sesiones anteriores
dejan de ser válidas en su siguiente petición autenticada. Las conexiones en tiempo
real ya abiertas se comprueban cada minuto y se desconectan si la sesión caducó.

La respuesta no revela si una cuenta existe. Si el envío falla, se elimina el
token emitido y se registra un mensaje sin credenciales ni enlaces. La interfaz
mantiene la misma respuesta genérica.

Para comprobar el flujo, configura un SMTP de pruebas que admita TLS, solicita un
enlace para una cuenta con email y úsalo para cambiar la contraseña. Comprueba
el inicio de sesión con la nueva contraseña, el rechazo de la anterior y el
rechazo de un segundo uso del enlace. No se envían correos en los tests unitarios.
