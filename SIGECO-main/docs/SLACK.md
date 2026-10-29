# Avisos privados de SIGECO en Slack

## Comportamiento

El registro exige el ID de miembro de Slack del workspace de la empresa, como `U012ABCDEF0`. No acepta nombres de usuario, correos ni IDs de canales. El ID se normaliza y no puede compartirse entre cuentas SIGECO. La validación de registro comprueba el formato y la unicidad; la entrega confirma si Slack acepta el destinatario.

Al crear una solicitud, SIGECO abre una conversación privada con el encargado activo del área de destino y envía el código, título, áreas, solicitante, correo, prioridad y enlace a la bandeja. Las solicitudes del agente utilizan el mismo flujo. Si TI escala al SuperAdmin, el nuevo aviso se dirige al SuperAdmin.

El destinatario se obtiene del área y del rol de encargado, no del texto escrito por el usuario. Solo se permite un encargado activo por destino para enviar el aviso. Si falta un encargado, existen varios o no hay ID de Slack, el aviso queda pendiente; no se difunde a otras áreas.

El ticket permanece guardado si falla Slack. Los avisos pendientes se reintentan cada cinco minutos mediante el programador. Se cancelan si el ticket cambia de destino o deja de requerir atención. Los avisos ya enviados no se vuelven a enviar al ejecutar nuevamente el proceso.

## Configuración del workspace

1. Crear una app de Slack desde `docs/slack-app-manifest.json` e instalarla en el workspace de la empresa.
2. Añadir los permisos de bot `im:write` y `chat:write`; reinstalar la app si se modifican sus permisos.
3. Guardar el Bot User OAuth Token en `backend/.env`, en `SLACK_BOT_USER_OAUTH_TOKEN`. Nunca guardar el token en Git ni en el frontend.
4. Configurar `SIGECO_FRONTEND_URL` con la dirección desde la que los encargados acceden al sistema.
5. Ejecutar `php artisan config:clear` si había configuración en caché.
6. En **Equipo del área**, abrir **Slack: Configurar ID** para registrar el ID de los encargados existentes. SuperAdmin puede configurarlo para todos; cada encargado puede actualizar su propio ID y el de su equipo.

Ejemplo de configuración sin credenciales:

```dotenv
SLACK_BOT_USER_OAUTH_TOKEN=
SIGECO_FRONTEND_URL=http://localhost:5173
SLACK_CA_BUNDLE=
```

Para copiar el ID: Slack → perfil del usuario → Más → Copiar ID de miembro. Todos los IDs deben pertenecer al workspace donde se instaló el bot.

Si PHP en Windows devuelve `cURL error 60`, configura sus certificados CA o indica en `SLACK_CA_BUNDLE` la ruta absoluta a un paquete CA válido. Esta opción conserva la verificación HTTPS y se aplica también al servidor que ya está ejecutándose.

## Reintentos automáticos

`npm start` y `start.ps1` también inician el programador. Si se levantan los servidores por separado, mantener abierto:

```powershell
cd backend
php artisan schedule:work
```

En producción, programar `php artisan schedule:run` cada minuto. Para ejecutar un intento manual de los avisos que ya vencieron su espera:

```powershell
php artisan slack:send-pending
```

Los resultados quedan en `req.avisos_slack`: estado, destinatario, intentos, error y fecha de envío. Si no hay token configurado, los avisos quedan pendientes y no se realiza ninguna llamada a Slack. Los cambios de ID no generan avisos históricos por sí solos.

Referencia oficial: [abrir conversaciones privadas](https://docs.slack.dev/reference/methods/conversations.open/) y [enviar mensajes](https://docs.slack.dev/reference/methods/chat.postMessage/).
