# Mundial 2026 - Grupos y Llaves Reales

Aplicacion web estatica para cargar el fixture del Mundial 2026 desde internet, ingresar marcadores y seguir el torneo completo con clasificacion automatica y llaves reales.

## Demo publicada

- Repositorio: https://github.com/olarjohn/mundial
- GitHub Pages esperada: https://olarjohn.github.io/mundial/

## Que hace

- Carga el calendario 2026 desde una fuente publica.
- Permite digitar marcadores de fase de grupos.
- Calcula clasificados automaticamente.
- Completa los cruces de dieciseisavos con referencias reales del fixture.
- Propaga ganadores en eliminacion directa.
- Muestra tablas por grupo, clasificados, llaves y campeon proyectado.
- Permite exportar e importar el avance en JSON.

## Formato del torneo incluido

- Fase de grupos
- Dieciseisavos
- Octavos
- Cuartos
- Semifinales
- Partido por el tercer puesto
- Final

## Flujo de uso

1. Abre [index.html](index.html) en tu navegador.
2. Haz clic en **Traer grupos y partidos de internet**.
3. Ingresa los marcadores de la fase de grupos.
4. Usa **Calcular clasificados y actualizar llaves**.
5. Completa los resultados de eliminacion directa desde la seccion de llaves.

## Reglas que aplica la app

- Ordena los partidos cronologicamente.
- Toma los 2 mejores de cada grupo.
- Selecciona los 8 mejores terceros.
- En eliminacion directa no permite empates como resultado final.
- Si cambia un clasificado en una ronda previa, limpia marcadores inconsistentes de rondas posteriores.

## Estructura del proyecto

- [index.html](index.html): estructura principal de la interfaz.
- [styles.css](styles.css): estilos y layout responsive.
- [app.js](app.js): logica del torneo, clasificacion y render.
- [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml): despliegue automatico a GitHub Pages.

## Publicacion en GitHub Pages

El repositorio ya incluye un workflow de GitHub Actions que publica automaticamente el sitio en GitHub Pages cada vez que haces push a `main`.

Si GitHub Pages todavia no aparece activa en el repositorio:

1. Entra a `Settings > Pages`.
2. Verifica que la fuente de despliegue use **GitHub Actions**.
3. Haz un nuevo push a `main` si quieres forzar otro despliegue.

## Datos y fuente

- Fuente base del fixture: https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json

## Desarrollo local

Puedes abrir [index.html](index.html) directamente o usar la configuracion de VS Code incluida en [.vscode/launch.json](.vscode/launch.json).
