# Mundial 2026 - Grupos y Llaves Reales

Aplicacion web para cargar el calendario oficial 2026 desde internet, ingresar marcadores y calcular clasificados siguiendo el formato completo:

- Fase de grupos (12 grupos)
- Dieciseisavos (Round of 32)
- Octavos
- Cuartos
- Semifinales
- Tercer puesto
- Final

## Flujo de uso

1. Abre [index.html](index.html) en tu navegador.
2. Haz clic en **Traer grupos y partidos de internet**.
3. Ingresa tus marcadores en cada partido.
4. Haz clic en **Calcular clasificados y llaves**.

La app mostrara:

- Tabla de posiciones por grupo
- 1ros y 2dos de cada grupo
- 8 mejores terceros
- Llaves completas de eliminacion segun referencias reales del fixture
- Campeon proyectado con tus marcadores

## Importar / exportar

- **Exportar JSON**: guarda todo el avance de marcadores.
- **Importar JSON**: restaura una sesion anterior.

## Fuente de datos

- https://raw.githubusercontent.com/openfootball/world-cup.json/master/2026/worldcup.json

## Regla importante

En fases de eliminacion directa no debe haber empate. Si hay empate, la app marca una advertencia para que ajustes el marcador.
