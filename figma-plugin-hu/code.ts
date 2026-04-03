// Generador de HU Financiero - Figma Plugin
// Analiza la seleccion actual y genera Historias de Usuario en formato jerarquico

figma.showUI(__html__, { width: 520, height: 780 });

interface InputErrorInfo {
  fieldName: string;
  errorType: 'name' | 'color' | 'text' | 'variant';
  detail: string;
}

interface ComponentInfo {
  name: string;
  type: string;
  visible: boolean;
  children: ComponentInfo[];
  texts: string[];
  hasInteraction: boolean;
  width: number;
  height: number;
  isComponent: boolean;
  componentName?: string;
  states: string[];
  hasErrorState: boolean;
  errorDetails: InputErrorInfo[];
  fillColors: string[];
  strokeColors: string[];
}

// Detecta si un nodo tiene indicios de interaccion
function detectInteraction(node: SceneNode): boolean {
  const interactiveKeywords = [
    'button', 'btn', 'click', 'tap', 'link', 'toggle', 'switch',
    'checkbox', 'radio', 'select', 'dropdown', 'input', 'field',
    'search', 'filter', 'tab', 'accordion', 'expand', 'collapse',
    'modal', 'dialog', 'popup', 'menu', 'nav', 'cta'
  ];
  const nameLower = node.name.toLowerCase();
  return interactiveKeywords.some(k => nameLower.includes(k));
}

// Detecta estados en base al nombre del nodo
function detectStates(node: SceneNode): string[] {
  const states: string[] = [];
  const stateKeywords: Record<string, string> = {
    'hover': 'hover',
    'active': 'activo',
    'disabled': 'deshabilitado',
    'focused': 'enfocado',
    'selected': 'seleccionado',
    'expanded': 'expandido',
    'collapsed': 'colapsado',
    'error': 'error',
    'success': 'exito',
    'loading': 'cargando',
    'empty': 'vacio',
    'default': 'por defecto',
    'pressed': 'presionado',
    'checked': 'marcado',
    'unchecked': 'sin marcar'
  };
  const nameLower = node.name.toLowerCase();
  for (const [key, value] of Object.entries(stateKeywords)) {
    if (nameLower.includes(key)) {
      states.push(value);
    }
  }
  return states;
}

// Detecta si un color es rojo/error (tonos rojos, naranjas de alerta)
function isErrorColor(r: number, g: number, b: number): boolean {
  // Rojo puro y variantes
  if (r > 0.7 && g < 0.35 && b < 0.35) return true;
  // Rojo medio (como #DC2626, #EF4444, #F87171)
  if (r > 0.6 && g < 0.3 && b < 0.3) return true;
  // Naranja-rojo de advertencia
  if (r > 0.8 && g < 0.4 && b < 0.2) return true;
  return false;
}

// Extrae colores de fills y strokes de un nodo
function extractColors(node: SceneNode): { fills: string[]; strokes: string[]; hasRedFill: boolean; hasRedStroke: boolean } {
  const result = { fills: [] as string[], strokes: [] as string[], hasRedFill: false, hasRedStroke: false };

  if ('fills' in node && Array.isArray(node.fills)) {
    for (const fill of node.fills as Paint[]) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        const { r, g, b } = fill.color;
        const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        result.fills.push(hex);
        if (isErrorColor(r, g, b)) result.hasRedFill = true;
      }
    }
  }

  if ('strokes' in node && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes as Paint[]) {
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        const { r, g, b } = stroke.color;
        const hex = `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
        result.strokes.push(hex);
        if (isErrorColor(r, g, b)) result.hasRedStroke = true;
      }
    }
  }

  return result;
}

// Detecta patrones de error en nombres y textos
function detectInputErrors(node: SceneNode, parentName: string = ''): InputErrorInfo[] {
  const errors: InputErrorInfo[] = [];
  const nameLower = node.name.toLowerCase();
  const contextName = parentName || node.name;

  // 1. Deteccion por nombre del nodo
  const errorNamePatterns = [
    'error', 'invalid', 'warning', 'alert', 'danger',
    'validation', 'required', 'helper-error', 'error-msg',
    'error-text', 'error-icon', 'field-error', 'input-error',
    'form-error', 'hint-error', 'destructive'
  ];
  if (errorNamePatterns.some(p => nameLower.includes(p))) {
    errors.push({
      fieldName: contextName,
      errorType: 'name',
      detail: `Nodo "${node.name}" tiene patron de error en su nombre`
    });
  }

  // 2. Deteccion por color rojo en fills/strokes
  const colors = extractColors(node);
  if (colors.hasRedFill) {
    errors.push({
      fieldName: contextName,
      errorType: 'color',
      detail: `Nodo "${node.name}" tiene fill rojo (${colors.fills.filter(c => c).join(', ')}) - posible estado de error`
    });
  }
  if (colors.hasRedStroke) {
    errors.push({
      fieldName: contextName,
      errorType: 'color',
      detail: `Nodo "${node.name}" tiene borde rojo (${colors.strokes.filter(c => c).join(', ')}) - posible estado de error`
    });
  }

  // 3. Deteccion por contenido de texto
  if (node.type === 'TEXT') {
    const text = (node as TextNode).characters.toLowerCase();
    const errorTextPatterns = [
      'campo requerido', 'campo obligatorio', 'es requerido', 'es obligatorio',
      'no valido', 'no válido', 'invalido', 'inválido',
      'ingrese un', 'ingresa un', 'debe contener', 'debe ser',
      'formato incorrecto', 'formato invalido', 'formato no valido',
      'monto minimo', 'monto maximo', 'monto mínimo', 'monto máximo',
      'ya existe', 'no encontrado', 'no disponible',
      'required', 'invalid', 'must be', 'cannot be', 'is required',
      'too short', 'too long', 'min length', 'max length',
      'error', 'please enter', 'por favor ingrese',
      'caracteres minimo', 'caracteres maximo',
      'mayor que', 'menor que', 'entre',
      'fecha invalida', 'fecha no valida',
      'correo invalido', 'email invalido',
      'contrasena incorrecta', 'password incorrect',
      'no coincide', 'does not match',
      'solo numeros', 'solo letras', 'solo alfanumerico',
      'limite excedido', 'saldo insuficiente', 'fondos insuficientes'
    ];
    if (errorTextPatterns.some(p => text.includes(p))) {
      errors.push({
        fieldName: contextName,
        errorType: 'text',
        detail: `Texto de error detectado: "${(node as TextNode).characters.trim()}"`
      });
    }

    // Texto rojo tambien es indicador de error
    const textColors = extractColors(node);
    if (textColors.hasRedFill && (node as TextNode).characters.trim().length > 0) {
      errors.push({
        fieldName: contextName,
        errorType: 'color',
        detail: `Texto en rojo: "${(node as TextNode).characters.trim()}" - posible mensaje de error`
      });
    }
  }

  // 4. Deteccion por variantes de componente (error=true, state=error, etc.)
  if (node.type === 'INSTANCE') {
    const instance = node as InstanceNode;
    try {
      const props = instance.componentProperties;
      if (props) {
        for (const [key, val] of Object.entries(props)) {
          const keyLower = key.toLowerCase();
          const valStr = String(val.value).toLowerCase();
          if (
            (keyLower.includes('error') && (valStr === 'true' || valStr === 'yes')) ||
            (keyLower.includes('state') && valStr === 'error') ||
            (keyLower.includes('status') && valStr === 'error') ||
            (keyLower.includes('variant') && valStr === 'error') ||
            (keyLower.includes('validation') && valStr !== 'none' && valStr !== 'false') ||
            (keyLower.includes('destructive') && (valStr === 'true' || valStr === 'yes'))
          ) {
            errors.push({
              fieldName: contextName,
              errorType: 'variant',
              detail: `Componente "${node.name}" tiene propiedad ${key}=${val.value}`
            });
          }
        }
      }
    } catch (_e) {
      // componentProperties puede no estar disponible
    }
  }

  return errors;
}

// Recorre el arbol de nodos y extrae informacion
function extractNodeInfo(node: SceneNode, depth: number = 0): ComponentInfo {
  const colors = extractColors(node);
  const inputErrors = detectInputErrors(node);

  const info: ComponentInfo = {
    name: node.name,
    type: node.type,
    visible: node.visible,
    children: [],
    texts: [],
    hasInteraction: detectInteraction(node),
    width: Math.round(node.width),
    height: Math.round(node.height),
    isComponent: node.type === 'COMPONENT' || node.type === 'INSTANCE',
    states: detectStates(node),
    hasErrorState: inputErrors.length > 0,
    errorDetails: inputErrors,
    fillColors: colors.fills,
    strokeColors: colors.strokes
  };

  if (node.type === 'INSTANCE') {
    const mainComponent = (node as InstanceNode).mainComponent;
    if (mainComponent) {
      info.componentName = mainComponent.name;
    }
  }

  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    if (textNode.characters.trim()) {
      info.texts.push(textNode.characters.trim());
    }
  }

  if ('children' in node && depth < 8) {
    for (const child of node.children) {
      if (child.visible) {
        const childInfo = extractNodeInfo(child, depth + 1);
        info.children.push(childInfo);
        // Bubble up texts
        info.texts.push(...childInfo.texts);
        // Bubble up error state
        if (childInfo.hasErrorState) {
          info.hasErrorState = true;
          info.errorDetails.push(...childInfo.errorDetails);
        }
      }
    }
  }

  return info;
}

// Categoriza componentes detectados
function categorizeComponents(info: ComponentInfo): {
  inputs: ComponentInfo[];
  buttons: ComponentInfo[];
  labels: string[];
  containers: ComponentInfo[];
  lists: ComponentInfo[];
  indicators: ComponentInfo[];
  navigation: ComponentInfo[];
  inputErrors: InputErrorInfo[];
  inputsWithErrors: ComponentInfo[];
} {
  const result = {
    inputs: [] as ComponentInfo[],
    buttons: [] as ComponentInfo[],
    labels: [] as string[],
    containers: [] as ComponentInfo[],
    lists: [] as ComponentInfo[],
    indicators: [] as ComponentInfo[],
    navigation: [] as ComponentInfo[],
    inputErrors: [] as InputErrorInfo[],
    inputsWithErrors: [] as ComponentInfo[]
  };

  function walk(node: ComponentInfo, parentIsInput: boolean = false) {
    const nameLower = node.name.toLowerCase();

    if (/input|field|text.?field|search|textarea/i.test(nameLower)) {
      result.inputs.push(node);
      // Buscar errores dentro del input y sus hijos
      if (node.hasErrorState) {
        result.inputsWithErrors.push(node);
        result.inputErrors.push(...node.errorDetails);
      }
      // Revisar hijos del input por errores
      for (const child of node.children) {
        collectErrors(child, node.name);
      }
    } else if (/button|btn|cta/i.test(nameLower)) {
      result.buttons.push(node);
    } else if (/card|container|section|panel|group/i.test(nameLower)) {
      result.containers.push(node);
    } else if (/list|table|row|item/i.test(nameLower)) {
      result.lists.push(node);
    } else if (/badge|tag|chip|indicator|status|alert|toast/i.test(nameLower)) {
      result.indicators.push(node);
    } else if (/tab|nav|menu|breadcrumb|sidebar/i.test(nameLower)) {
      result.navigation.push(node);
    }

    // Recoger errores sueltos (no dentro de inputs)
    if (node.hasErrorState && !parentIsInput && !/input|field|text.?field/i.test(nameLower)) {
      result.inputErrors.push(...node.errorDetails);
    }

    if (node.texts.length > 0 && node.type === 'TEXT') {
      result.labels.push(...node.texts);
    }

    const isInput = /input|field|text.?field|search|textarea/i.test(nameLower);
    for (const child of node.children) {
      walk(child, isInput || parentIsInput);
    }
  }

  function collectErrors(node: ComponentInfo, parentFieldName: string) {
    if (node.hasErrorState) {
      // Re-tag errors with parent field name
      for (const err of node.errorDetails) {
        result.inputErrors.push({ ...err, fieldName: parentFieldName });
      }
    }
    for (const child of node.children) {
      collectErrors(child, parentFieldName);
    }
  }

  walk(info);

  // Deduplicar errores
  const seen = new Set<string>();
  result.inputErrors = result.inputErrors.filter(e => {
    const key = `${e.fieldName}|${e.errorType}|${e.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return result;
}

// Genera la HU en formato jerarquico
function generateHU(
  info: ComponentInfo,
  screenName: string,
  huNumber: string,
  huType: string,
  context: string
): string {
  const categories = categorizeComponents(info);
  const allStates: string[] = [];
  const allInteractive: ComponentInfo[] = [];

  function collectMeta(node: ComponentInfo) {
    allStates.push(...node.states);
    if (node.hasInteraction) allInteractive.push(node);
    node.children.forEach(collectMeta);
  }
  collectMeta(info);

  const uniqueStates = [...new Set(allStates)];
  const uniqueTexts = [...new Set(info.texts)].slice(0, 30);

  let hu = '';
  hu += `HU-${huNumber}: ${screenName}\n`;
  hu += `${'='.repeat(60)}\n\n`;

  // Seccion 1: Componente / Vista
  hu += `1. Componente principal\n`;
  hu += `   a. Vista general\n`;
  hu += `      i. Se muestra la pantalla "${screenName}" con dimensiones ${info.width}x${info.height}px\n`;

  if (context) {
    hu += `      ii. Contexto: ${context}\n`;
  }

  if (categories.containers.length > 0) {
    hu += `   b. Estructura\n`;
    categories.containers.forEach((c, idx) => {
      hu += `      ${toRoman(idx + 1)}. Seccion "${c.name}"`;
      if (c.texts.length > 0) {
        hu += ` - contiene: ${c.texts.slice(0, 3).join(', ')}`;
      }
      hu += '\n';
    });
  }

  if (categories.navigation.length > 0) {
    hu += `   c. Navegacion\n`;
    categories.navigation.forEach((n, idx) => {
      hu += `      ${toRoman(idx + 1)}. Elemento "${n.name}"\n`;
    });
  }

  // Seccion 2: Elementos visibles
  hu += `\n2. Elementos visibles\n`;

  if (uniqueTexts.length > 0) {
    hu += `   a. Textos detectados\n`;
    uniqueTexts.forEach((t, idx) => {
      if (idx < 15) {
        hu += `      ${toRoman(idx + 1)}. "${t}"\n`;
      }
    });
  }

  if (categories.indicators.length > 0) {
    hu += `   b. Indicadores\n`;
    categories.indicators.forEach((ind, idx) => {
      hu += `      ${toRoman(idx + 1)}. ${ind.name}`;
      if (ind.texts.length > 0) hu += ` - muestra: "${ind.texts[0]}"`;
      hu += '\n';
    });
  }

  if (categories.lists.length > 0) {
    hu += `   c. Listas / Tablas\n`;
    categories.lists.forEach((l, idx) => {
      hu += `      ${toRoman(idx + 1)}. ${l.name} (${l.children.length} elementos hijos)\n`;
    });
  }

  // Seccion 3: Interaccion
  hu += `\n3. Interaccion\n`;

  if (categories.buttons.length > 0) {
    hu += `   a. Botones\n`;
    categories.buttons.forEach((b, idx) => {
      hu += `      ${toRoman(idx + 1)}. Boton "${b.name}"`;
      if (b.texts.length > 0) hu += ` con texto "${b.texts[0]}"`;
      hu += '\n';
      hu += `         1. Al hacer click [DEFINIR ACCION]\n`;
    });
  }

  if (categories.inputs.length > 0) {
    hu += `   b. Campos de entrada\n`;
    categories.inputs.forEach((inp, idx) => {
      hu += `      ${toRoman(idx + 1)}. Campo "${inp.name}"\n`;
      hu += `         1. Tipo: [texto / numerico / fecha / selector]\n`;
      hu += `         2. Validacion: [DEFINIR]\n`;
      // Verificar si este input tiene errores detectados
      const fieldErrors = categories.inputErrors.filter(e => e.fieldName === inp.name);
      if (fieldErrors.length > 0) {
        hu += `         3. Estado de error detectado:\n`;
        fieldErrors.forEach((fe, feIdx) => {
          hu += `            ${String.fromCharCode(97 + feIdx)}. ${fe.detail}\n`;
        });
      }
    });
  }

  if (allInteractive.length > 0 && categories.buttons.length === 0 && categories.inputs.length === 0) {
    hu += `   a. Elementos interactivos\n`;
    allInteractive.slice(0, 10).forEach((el, idx) => {
      hu += `      ${toRoman(idx + 1)}. "${el.name}" - [DEFINIR INTERACCION]\n`;
    });
  }

  // Seccion 4: Estados
  hu += `\n4. Estados\n`;
  if (uniqueStates.length > 0) {
    hu += `   a. Estados detectados\n`;
    uniqueStates.forEach((s, idx) => {
      hu += `      ${toRoman(idx + 1)}. Estado: ${s}\n`;
    });
  }
  hu += `   ${uniqueStates.length > 0 ? 'b' : 'a'}. Estados por definir\n`;
  hu += `      i. Estado por defecto: [DEFINIR]\n`;
  hu += `      ii. Estado vacio: [DEFINIR - que se muestra cuando no hay datos]\n`;
  hu += `      iii. Estado de error: [DEFINIR]\n`;
  hu += `      iv. Estado de carga: [DEFINIR]\n`;

  // Seccion 5: Errores de input detectados
  hu += `\n5. Errores de input\n`;
  if (categories.inputErrors.length > 0) {
    hu += `   a. Errores detectados automaticamente\n`;

    // Agrupar por tipo de deteccion
    const byName = categories.inputErrors.filter(e => e.errorType === 'name');
    const byColor = categories.inputErrors.filter(e => e.errorType === 'color');
    const byText = categories.inputErrors.filter(e => e.errorType === 'text');
    const byVariant = categories.inputErrors.filter(e => e.errorType === 'variant');

    if (byColor.length > 0) {
      hu += `      i. Deteccion por color (bordes/fills rojos)\n`;
      byColor.forEach((e, idx) => {
        hu += `         ${idx + 1}. ${e.detail}\n`;
      });
    }
    if (byText.length > 0) {
      hu += `      ${byColor.length > 0 ? 'ii' : 'i'}. Mensajes de error en texto\n`;
      byText.forEach((e, idx) => {
        hu += `         ${idx + 1}. ${e.detail}\n`;
      });
    }
    if (byName.length > 0) {
      const rom = byColor.length > 0 && byText.length > 0 ? 'iii' : (byColor.length > 0 || byText.length > 0 ? 'ii' : 'i');
      hu += `      ${rom}. Nodos con patron de error en nombre\n`;
      byName.forEach((e, idx) => {
        hu += `         ${idx + 1}. ${e.detail}\n`;
      });
    }
    if (byVariant.length > 0) {
      hu += `      iv. Variantes de componente con estado error\n`;
      byVariant.forEach((e, idx) => {
        hu += `         ${idx + 1}. ${e.detail}\n`;
      });
    }

    hu += `   b. Comportamiento esperado de errores\n`;
    hu += `      i. Cuando se muestra: [al perder foco / al enviar formulario / en tiempo real]\n`;
    hu += `      ii. Donde se muestra: [debajo del campo / tooltip / inline]\n`;
    hu += `      iii. Como se limpia: [al corregir el valor / al hacer foco / manual]\n`;
    hu += `      iv. Estilo visual: borde rojo + mensaje de error debajo del campo\n`;
  } else {
    hu += `   a. No se detectaron errores de input en el diseno\n`;
    hu += `   b. Definir manualmente\n`;
    hu += `      i. [DEFINIR que campos requieren validacion]\n`;
    hu += `      ii. [DEFINIR mensajes de error para cada campo]\n`;
    hu += `      iii. [DEFINIR cuando se disparan las validaciones]\n`;
  }

  // Seccion 6: Validaciones
  hu += `\n6. Validaciones\n`;
  hu += `   a. Campos\n`;
  if (categories.inputs.length > 0) {
    categories.inputs.forEach((inp, idx) => {
      const hasErrors = categories.inputErrors.some(e => e.fieldName === inp.name);
      hu += `      ${toRoman(idx + 1)}. "${inp.name}": `;
      if (hasErrors) {
        hu += `[ERROR DETECTADO - ver seccion 5]\n`;
      } else {
        hu += `[DEFINIR regla de validacion]\n`;
      }
    });
  } else {
    hu += `      i. [DEFINIR validaciones de campos si aplica]\n`;
  }
  hu += `   b. Permisos\n`;
  hu += `      i. [DEFINIR que roles pueden ver esta pantalla]\n`;
  hu += `      ii. [DEFINIR que roles pueden interactuar]\n`;

  // Seccion 7: Logica de negocio (si aplica)
  if (huType === 'financial' || huType === 'process') {
    hu += `\n7. Logica de negocio\n`;
    hu += `   a. Calculos\n`;
    hu += `      i. [DEFINIR formulas o calculos que apliquen]\n`;
    hu += `         1. [Desglose del calculo]\n`;
    hu += `   b. Reglas\n`;
    hu += `      i. [DEFINIR reglas de negocio especificas]\n`;
  }

  // Seccion 8: Post-accion
  if (huType === 'process' || huType === 'financial') {
    hu += `\n8. Post-accion\n`;
    hu += `   a. Notificaciones\n`;
    hu += `      i. [DEFINIR si se genera notificacion al completar]\n`;
    hu += `   b. Registro\n`;
    hu += `      i. [DEFINIR que se registra en log de auditoria]\n`;
  }

  // Metadatos
  hu += `\n\n${'─'.repeat(60)}\n`;
  hu += `METADATOS DE ANALISIS\n`;
  hu += `${'─'.repeat(60)}\n`;
  hu += `Frame analizado: ${info.name}\n`;
  hu += `Dimensiones: ${info.width}x${info.height}px\n`;
  hu += `Componentes detectados: ${countNodes(info)}\n`;
  hu += `Textos unicos: ${uniqueTexts.length}\n`;
  hu += `Botones: ${categories.buttons.length}\n`;
  hu += `Campos de entrada: ${categories.inputs.length}\n`;
  hu += `Errores de input detectados: ${categories.inputErrors.length}\n`;
  hu += `Campos con error: ${categories.inputsWithErrors.length}\n`;
  hu += `Indicadores: ${categories.indicators.length}\n`;
  hu += `Estados detectados: ${uniqueStates.length}\n`;

  return hu;
}

function toRoman(num: number): string {
  const romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];
  return romans[num - 1] || `${num}`;
}

function countNodes(node: ComponentInfo): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

// Exporta el frame seleccionado como PNG (base64)
async function exportFrameAsPng(node: SceneNode): Promise<Uint8Array | null> {
  try {
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 2 }
    });
    return bytes;
  } catch (_e) {
    return null;
  }
}

// Escuchar mensajes del UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate') {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'error',
        message: 'Selecciona un frame o componente en Figma antes de generar.'
      });
      return;
    }

    const node = selection[0];
    const info = extractNodeInfo(node);
    const hu = generateHU(
      info,
      msg.screenName || node.name,
      msg.huNumber || 'XXX',
      msg.huType || 'screen',
      msg.context || ''
    );

    figma.ui.postMessage({
      type: 'result',
      hu: hu,
      nodeName: node.name
    });
  }

  // Exportar screenshot del frame seleccionado para adjuntar a ClickUp
  if (msg.type === 'export-screenshot') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        type: 'screenshot-error',
        message: 'No hay frame seleccionado para exportar.'
      });
      return;
    }

    const node = selection[0];
    const pngBytes = await exportFrameAsPng(node);
    if (pngBytes) {
      figma.ui.postMessage({
        type: 'screenshot-ready',
        bytes: Array.from(pngBytes),
        fileName: `${node.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
      });
    } else {
      figma.ui.postMessage({
        type: 'screenshot-error',
        message: 'No se pudo exportar el frame como imagen.'
      });
    }
  }

  // Guardar configuracion de ClickUp en clientStorage
  if (msg.type === 'save-clickup-config') {
    await figma.clientStorage.setAsync('clickup_api_token', msg.apiToken || '');
    await figma.clientStorage.setAsync('clickup_workspace_id', msg.workspaceId || '');
    figma.ui.postMessage({ type: 'config-saved' });
  }

  // Cargar configuracion de ClickUp desde clientStorage
  if (msg.type === 'load-clickup-config') {
    const apiToken = await figma.clientStorage.getAsync('clickup_api_token') || '';
    const workspaceId = await figma.clientStorage.getAsync('clickup_workspace_id') || '';
    figma.ui.postMessage({
      type: 'config-loaded',
      apiToken: apiToken,
      workspaceId: workspaceId
    });
  }

  if (msg.type === 'check-selection') {
    const selection = figma.currentPage.selection;
    figma.ui.postMessage({
      type: 'selection-status',
      hasSelection: selection.length > 0,
      selectionName: selection.length > 0 ? selection[0].name : '',
      selectionType: selection.length > 0 ? selection[0].type : ''
    });
  }

  if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Notificar cuando cambie la seleccion
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  figma.ui.postMessage({
    type: 'selection-status',
    hasSelection: selection.length > 0,
    selectionName: selection.length > 0 ? selection[0].name : '',
    selectionType: selection.length > 0 ? selection[0].type : ''
  });
});
