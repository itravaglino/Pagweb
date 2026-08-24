# Pagweb · Emulador Fitbit con Gemma

Emulador web de un **Fitbit Sense 2**. El mouse es el dedo: tap, doble tap, swipe y long-press. Dentro de la esfera vive **Gemma**, una bolita circular que rebota y cambia de cara.

Di **hey Gemma**, **oye Gemma** o **hola Gemma** (o escríbelo) para hablarle. Un modelo ultraliviano (Gemma 3 270M, o un router local en modo demo) decide expresiones y tareas simples. Las preguntas las responde Gemma 3 1B on-device cuando hay WebGPU.

## Cómo correrlo

```bash
npm install
npm test
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Gestos

- **Tap** en Gemma: empieza a escuchar
- **Doble tap**: arma / desarma el micrófono
- **Swipe**: cambia entre Gemma, reloj y stats
- **Long press**: menú
- **Botón lateral**: vuelve al reloj

El compositor de texto no exige palabra de activación. El micrófono sí, salvo que el tap o el doble tap hayan armado la escucha.

## Modelos

La UI funciona al instante en **modo demo** (sin GPU). En Chrome con WebGPU, pulsa **Activar Gemma on-device**:

| Modelo | Rol | Tamaño aprox. |
| --- | --- | --- |
| Gemma 3 270M | expresiones, intents, timers, hora | ~300 MB |
| Gemma 3 1B | preguntas | ~1 GB |

Los pesos se descargan una vez desde Hugging Face y quedan en caché del navegador. Si no hay WebGPU, seguimos en demo.

## Device API (Fitbit OS)

`shared/fitbit-os` reproduce APIs del Sense 2 (`clock`, `display`, `haptics`, `hrm`, `accelerometer`, `battery`, `user-activity`, `body-presence`) para alimentar stats y la vibración del emulador.

## Intents

`chat`, `timer`, `stats`, `face`, `clock`, `stop`.

Ejemplos: *qué hora es*, *muéstrame mis pasos*, *pon un timer de 5 minutos*, *ponte feliz*.
