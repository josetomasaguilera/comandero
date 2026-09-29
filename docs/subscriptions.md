# Suscripciones de Comandero

## Comportamiento

- Una suscripción por bar, para todos sus usuarios: **10 EUR al mes**.
- Los bares nuevos disponen de **30 días exactos** desde su creación, sin tarjeta. El alta en Stripe se ofrece al terminar la prueba; no se genera ningún cobro automático por registrarse en Comandero.
- Los bares anteriores a esta versión quedan **exentos permanentemente**. Al iniciar la aplicación se marca `billingExempt: true` únicamente en documentos sin `billingVersion`. Los nuevos documentos llevan `billingVersion: 1` y no se eximen al reiniciar. No elimines este campo ni lo aceptes desde formularios.
- Al vencer la prueba, se bloquean las páginas y operaciones del bar salvo el acceso a la cuenta, cierre de sesión y suscripción. Se conservan los datos. Los usuarios no administradores ven una indicación para contactar con su administrador.
- Solo un administrador puede abrir Checkout o el portal para **su propio bar**. Los formularios de facturación llevan un token de sesión.
- Se concede acceso de pago cuando Stripe informa de una suscripción activa del plan configurado, con la última factura pagada y su período todavía vigente. Un pago fallido no amplía el acceso. Si se cancela al final del período, se mantiene el acceso hasta su vencimiento; una cancelación inmediata lo revoca.
- Los avisos de Stripe se verifican mediante firma sobre el cuerpo original. Cada aviso consulta el estado actual de Stripe para que eventos repetidos o fuera de orden no restauren estados antiguos. Una exclusión mutua en MongoDB evita crear dos Checkout simultáneos para el mismo bar; se reutilizan las sesiones abiertas.
- El acceso HTTP se comprueba en cada petición autenticada y el de WebSocket al entrar y cada minuto. La fecha del navegador no interviene.

## Configurar Stripe

1. En el entorno de pruebas de Stripe, crea un producto **Comandero** con un precio recurrente de **10,00 EUR cada mes**, una unidad y sin prueba adicional en Stripe. No configures impuestos adicionales, descuentos ni cambios de plan si quieres conservar el total de 10 EUR. Copia su identificador `price_...`.
2. Activa el portal de clientes de Stripe para consultar facturas, actualizar el método de pago y cancelar **al final del período**. Desactiva cambios de plan y de cantidad; la aplicación solo admite el plan indicado.
3. Configura estas variables en el servidor (también en Cloud Run). Usa primero claves de prueba, nunca las pongas en vistas o JavaScript del navegador:

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   APP_URL=https://tu-dominio
   ```

   `APP_URL` es el origen público de la aplicación. Para desarrollo se permite `http://localhost:8080`. Sin estas variables los bares exentos y las pruebas siguen funcionando, pero los pagos no se ofrecen. Configúralas antes de que termine la primera prueba.

4. Crea un destino de webhook **públicamente accesible** en `https://tu-dominio/billing/webhook`, sin autenticación de Cloud Run delante. La autenticidad se verifica con la firma de Stripe. Suscribe estos eventos y copia el secreto de firma en `STRIPE_WEBHOOK_SECRET`:

   ```text
   checkout.session.completed
   checkout.session.async_payment_succeeded
   checkout.session.async_payment_failed
   customer.subscription.created
   customer.subscription.updated
   customer.subscription.deleted
   customer.subscription.paused
   customer.subscription.resumed
   invoice.paid
   invoice.payment_failed
   invoice.payment_action_required
   ```

5. Despliega la aplicación y comprueba **Administración → Suscripción**. Un bar existente debe mostrar su exención; un registro nuevo, su fecha de vencimiento y los días restantes.

Para probar webhooks locales con Stripe CLI:

```powershell
stripe listen --forward-to localhost:8080/billing/webhook
```

Usa el secreto `whsec_...` que imprime ese comando para desarrollo. Es diferente del secreto del destino de producción.

## Verificación antes de cobrar

En una base de datos de pruebas, crea un bar nuevo y adelanta su vencimiento modificando únicamente `trialEndsAt` de ese bar. Comprueba el bloqueo y completa un Checkout con una tarjeta de prueba de Stripe. No cambies fechas de bares reales.

Verifica: factura pagada, pago rechazado, regreso sin completar Checkout, dos clics simultáneos en suscribirse, reenvío de un webhook, cancelación al final del período y acceso de camarero/cocina después de vencer. Un parámetro `?returned=1` por sí solo nunca activa el acceso.

Al pasar a producción, crea el precio y el webhook en modo real, activa también el portal real y sustituye las tres variables de Stripe por sus valores reales. Los objetos de prueba no sirven en modo real. Revisa los eventos fallidos en Stripe: un error temporal devuelve un estado de error para que Stripe reintente la entrega. La pantalla de suscripción también consulta Stripe al abrirla como administrador.

La implementación incluye pruebas unitarias y de acceso. La validación de un cobro completo requiere configurar la cuenta de Stripe; no se han efectuado cobros ni creado productos remotos automáticamente.

Referencias: [Checkout](https://docs.stripe.com/api/checkout/sessions/create), [webhooks de suscripción](https://docs.stripe.com/billing/subscriptions/webhooks), [firmas](https://docs.stripe.com/webhooks/signature), [portal de clientes](https://docs.stripe.com/customer-management).
