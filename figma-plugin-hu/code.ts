// Generador de HU Financiero - Figma Plugin
// Analiza la seleccion actual y genera Historias de Usuario en formato jerarquico

figma.showUI(__html__, { width: 520, height: 700 });

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

// Recorre el arbol de nodos y extrae informacion
function extractNodeInfo(node: SceneNode, depth: number = 0): ComponentInfo {
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
    states: detectStates(node)
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
} {
  const result = {
    inputs: [] as ComponentInfo[],
    buttons: [] as ComponentInfo[],
    labels: [] as string[],
    containers: [] as ComponentInfo[],
    lists: [] as ComponentInfo[],
    indicators: [] as ComponentInfo[],
    navigation: [] as ComponentInfo[]
  };

  function walk(node: ComponentInfo) {
    const nameLower = node.name.toLowerCase();

    if (/input|field|text.?field|search|textarea/i.test(nameLower)) {
      result.inputs.push(node);
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

    if (node.texts.length > 0 && node.type === 'TEXT') {
      result.labels.push(...node.texts);
    }

    for (const child of node.children) {
      walk(child);
    }
  }

  walk(info);
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

  // Seccion 5: Validaciones
  hu += `\n5. Validaciones\n`;
  hu += `   a. Campos\n`;
  if (categories.inputs.length > 0) {
    categories.inputs.forEach((inp, idx) => {
      hu += `      ${toRoman(idx + 1)}. "${inp.name}": [DEFINIR regla de validacion]\n`;
    });
  } else {
    hu += `      i. [DEFINIR validaciones de campos si aplica]\n`;
  }
  hu += `   b. Permisos\n`;
  hu += `      i. [DEFINIR que roles pueden ver esta pantalla]\n`;
  hu += `      ii. [DEFINIR que roles pueden interactuar]\n`;

  // Seccion 6: Logica de negocio (si aplica)
  if (huType === 'financial' || huType === 'process') {
    hu += `\n6. Logica de negocio\n`;
    hu += `   a. Calculos\n`;
    hu += `      i. [DEFINIR formulas o calculos que apliquen]\n`;
    hu += `         1. [Desglose del calculo]\n`;
    hu += `   b. Reglas\n`;
    hu += `      i. [DEFINIR reglas de negocio especificas]\n`;
  }

  // Seccion 7: Post-accion
  if (huType === 'process' || huType === 'financial') {
    hu += `\n${huType === 'financial' ? '7' : '6'}. Post-accion\n`;
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

// Escuchar mensajes del UI
figma.ui.onmessage = (msg) => {
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
