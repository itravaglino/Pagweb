# Pagweb · Emulador Fitbit Sense 2 + Gemma

Emulador web de un **Fitbit Sense 2** (`rhea`, 336×336). El mouse es el dedo: tap, doble tap, swipe y long-press. Dentro de la esfera vive **Gemma**, una bolita circular que rebota y cambia de cara.

Di **hey Gemma**, **oye Gemma** o **hola Gemma** (o escríbelo) para hablarle. Un modelo ultraliviano (Gemma 3 270M, o un router local en modo demo) decide expresiones y tareas simples. Las preguntas las responde Gemma 3 1B on-device cuando hay WebGPU.

## Cómo correrlo

```bash
npm install
npm test
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Opcional: copia `.env.example` y rellena las claves de [dev.fitbit.com](https://dev.fitbit.com/) para sincronizar el día real.

## Gestos

- **Tap** en Gemma: empieza a escuchar
- **Doble tap**: arma / desarma el micrófono
- **Swipe izq/der**: Gemma, reloj y stats
- **Swipe abajo**: ajustes
- **Long press**: menú
- **Botón lateral**: vuelve al reloj

El compositor de texto no exige palabra de activación. El micrófono sí, salvo que el tap o el doble tap hayan armado la escucha.

## Modelos

Al abrir el emulador intentamos **Ollama en tu GPU**. En esta máquina ya hay `gemma3:1b` (tareas) y `gemma3:4b` (charla). Si Ollama no está corriendo, caemos a **WebGPU en Chrome** y, si tampoco hay GPU, al modo demo.

```bash
ollama serve
ollama pull gemma3:1b
ollama pull gemma3:4b
```

Opcional en `.env`: `OLLAMA_HOST`, `OLLAMA_LIGHT_MODEL`, `OLLAMA_CHAT_MODEL`.

## Voz

La voz usa las voces Neural del sistema (español). En el panel derecho puedes elegir voz, ritmo, tono y volumen. Los presets **Gemma / Clara / Baja** quedan guardados en el navegador.

## Device API (Fitbit OS)

`shared/fitbit-os` reproduce APIs del Sense 2:

| Módulo | Uso |
| --- | --- |
| `clock` | `granularity`, evento `tick` con `evt.date` |
| `display` | `on`, `poke()`, AOD |
| `haptics` | `nudge`, `ping`, `confirmation`, `alert` |
| `heart-rate` | HR simulado o BLE GATT 0x180D |
| `user-activity` | pasos, calorías, AZM |
| `power` | batería |
| Fitbit Web API | OAuth 2 PKCE (`FITBIT_CLIENT_ID` / `SECRET`) |

## Intents

`chat`, `timer`, `stats`, `face`, `clock`, `stop`.

Ejemplos: *qué hora es*, *muéstrame mis pasos*, *pon un timer de 5 minutos*, *ponte feliz*.
