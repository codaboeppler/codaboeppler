================================================================================
PLUGIN FIGMA - GENERADOR DE HU FINANCIERO
================================================================================

DESCRIPCION
================================================================================
Plugin de Figma que analiza un frame/pantalla seleccionado y genera
automaticamente una Historia de Usuario (HU) en formato jerarquico
(1. a. i.) listo para copiar en ClickUp.


INSTALACION
================================================================================

1. Clonar o descargar esta carpeta (figma-plugin-hu/)

2. Instalar dependencias:
   npm install

3. Compilar TypeScript:
   npx tsc -p tsconfig.json

4. En Figma Desktop:
   a. Menu > Plugins > Development > Import plugin from manifest
   b. Seleccionar el archivo manifest.json de esta carpeta

5. Listo. El plugin aparece en Plugins > Development > Generador de HU Financiero


USO
================================================================================

1. Seleccionar un frame o componente en tu archivo de Figma
2. Ejecutar el plugin (Plugins > Development > Generador de HU Financiero)
3. Llenar los campos:
   a. Numero de HU (ej: 001, 042)
   b. Tipo de HU:
      i. Pantalla / Componente - para vistas estaticas
      ii. Flujo / Proceso - para flujos con pasos
      iii. Financiero - para pantallas con calculos y montos
      iv. Integracion - para pantallas con conexiones externas
   c. Nombre de la pantalla (opcional, se autodetecta del frame)
   d. Contexto adicional (descripcion de negocio para enriquecer la HU)
4. Click en "Generar Historia de Usuario"
5. Click en "Copiar al portapapeles"
6. Pegar en ClickUp


QUE DETECTA EL PLUGIN
================================================================================

El plugin analiza automaticamente:
- Botones (button, btn, cta)
- Campos de entrada (input, field, textarea, search)
- Contenedores y secciones (card, panel, section)
- Listas y tablas (list, table, row)
- Indicadores (badge, tag, status, alert)
- Navegacion (tab, nav, menu, breadcrumb)
- Textos visibles
- Estados (hover, active, disabled, expanded, etc.)
- Componentes e instancias


FORMATO DE SALIDA
================================================================================

La HU se genera con estas secciones:

1. Componente principal
   a. Vista general
   b. Estructura
   c. Navegacion

2. Elementos visibles
   a. Textos detectados
   b. Indicadores
   c. Listas / Tablas

3. Interaccion
   a. Botones
   b. Campos de entrada

4. Estados

5. Validaciones

6. Logica de negocio (solo para tipo Financiero y Proceso)

7. Post-accion (solo para tipo Financiero y Proceso)

+ Metadatos de analisis (dimensiones, conteos)


NOTAS TECNICAS
================================================================================

- El plugin recorre hasta 8 niveles de profundidad en el arbol de nodos
- Detecta componentes e instancias de Figma
- La deteccion de elementos se basa en convenciones de nombres
- Para mejores resultados, usa nombres descriptivos en tus capas de Figma
  (ej: "btn_refrendar", "input_monto", "card_contrato")
