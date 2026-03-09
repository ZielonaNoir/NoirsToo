import { assessFieldRisk } from '../lib/prompt-graph/risk';
import type { PickSession, PickedField, TargetNode } from '../types/prompt-graph';

type FillMode = 'empty-only' | 'force';

interface PickerRuntime {
  state: PickSession['state'];
  highlight?: HTMLDivElement;
  currentTarget?: HTMLElement;
  selectedTarget?: TargetNode;
  tabId: number;
  sessionId: string;
  listenersAttached: boolean;
  lastHoverEmitAt: number;
}

const runtime: PickerRuntime = {
  state: 'idle',
  tabId: -1,
  sessionId: '',
  listenersAttached: false,
  lastHoverEmitAt: 0,
};

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    if (window.top !== window.self) {
      emitEvent('ERROR', { message: 'Embedded frame context detected. Picker limited to top document.' });
      return;
    }

    void browser.runtime.sendMessage({ type: 'CONTENT_READY', href: window.location.href })
      .then((response) => {
        if (response && typeof response.tabId === 'number') {
          runtime.tabId = response.tabId;
        }
      })
      .catch(() => {
        // Keep optional: background may not be listening in tests.
      });

    browser.runtime.onMessage.addListener((message) => {
      if (!message || typeof message !== 'object') return;

      if (message.type === 'PICK_START') {
        startPicker(message.sessionId ?? `session-${Date.now()}`);
      }

      if (message.type === 'PICK_STOP') {
        stopPicker('idle');
      }

      if (message.type === 'INJECT_REQUEST') {
        void injectDirtyData(message.mode === 'force' ? 'force' : 'empty-only');
      }
    });
  },
});

const startPicker = (sessionId: string) => {
  runtime.sessionId = sessionId;
  runtime.state = 'picking';

  if (!runtime.highlight) {
    const highlight = document.createElement('div');
    highlight.style.position = 'fixed';
    highlight.style.pointerEvents = 'none';
    highlight.style.border = '2px solid #14b8a6';
    highlight.style.background = 'rgba(20, 184, 166, 0.14)';
    highlight.style.boxShadow = '0 0 0 1px rgba(15, 23, 42, 0.45)';
    highlight.style.zIndex = '2147483647';
    highlight.style.transition = 'all 60ms ease';
    highlight.style.display = 'none';
    document.documentElement.appendChild(highlight);
    runtime.highlight = highlight;
  }

  runtime.highlight.style.display = 'block';

  if (!runtime.listenersAttached) {
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeydown, true);
    runtime.listenersAttached = true;
  }

  emitEvent('PICK_START', { url: window.location.href });
};

const stopPicker = (nextState: PickSession['state']) => {
  runtime.state = nextState;
  runtime.currentTarget = undefined;

  if (runtime.listenersAttached) {
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeydown, true);
    runtime.listenersAttached = false;
  }

  if (runtime.highlight) {
    runtime.highlight.style.display = 'none';
  }

  emitEvent('PICK_STOP', { state: nextState });
};

const handleMouseMove = (event: MouseEvent) => {
  if (runtime.state !== 'picking') return;

  const target = event.target instanceof HTMLElement ? event.target : undefined;
  if (!target || target === runtime.highlight) return;

  runtime.currentTarget = getContainerTarget(target) ?? undefined;
  if (!runtime.currentTarget) return;

  const rect = runtime.currentTarget.getBoundingClientRect();
  if (runtime.highlight) {
    runtime.highlight.style.left = `${rect.left}px`;
    runtime.highlight.style.top = `${rect.top}px`;
    runtime.highlight.style.width = `${rect.width}px`;
    runtime.highlight.style.height = `${rect.height}px`;
  }

  const now = Date.now();
  if (now - runtime.lastHoverEmitAt < 80) return;
  runtime.lastHoverEmitAt = now;

  emitEvent('PICK_HOVER', {
    selector: getSelector(runtime.currentTarget),
    tagName: runtime.currentTarget.tagName.toLowerCase(),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  });
};

const handleClick = (event: MouseEvent) => {
  if (runtime.state !== 'picking') return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const selectedEl = runtime.currentTarget || (event.target instanceof HTMLElement ? getContainerTarget(event.target) : null);
  if (!selectedEl) {
    emitEvent('ERROR', { message: 'Unable to resolve a selectable container.' });
    stopPicker('error');
    return;
  }

  const rect = selectedEl.getBoundingClientRect();
  const targetNode: TargetNode = {
    selector: getSelector(selectedEl),
    xpath: getXPath(selectedEl),
    domPath: getDomPath(selectedEl),
    boundingBox: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    tagName: selectedEl.tagName.toLowerCase(),
    fields: collectFields(selectedEl),
  };

  runtime.selectedTarget = targetNode;
  runtime.state = 'selected';
  stopPicker('selected');
  emitEvent('PICK_SELECT', targetNode);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && runtime.state === 'picking') {
    event.preventDefault();
    stopPicker('idle');
  }
};

const injectDirtyData = async (mode: FillMode) => {
  if (!runtime.selectedTarget) {
    emitEvent('ERROR', { message: 'No selected target. Start pick mode first.' });
    return;
  }

  runtime.state = 'injecting';
  emitEvent('INJECT_REQUEST', { mode, total: runtime.selectedTarget.fields.length });

  let filled = 0;
  let skipped = 0;
  const riskFlags = new Set<string>();

  const startedAt = performance.now();

  for (const field of runtime.selectedTarget.fields) {
    const risk = assessFieldRisk(field);
    risk.riskFlags.forEach((flag) => riskFlags.add(flag));

    if (risk.blocked) {
      skipped += 1;
      emitEvent('RISK_BLOCKED', {
        message: risk.reason,
        selector: field.selector,
      });
      continue;
    }

    const element = document.querySelector(field.selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (!element) {
      skipped += 1;
      continue;
    }

    const existing = 'value' in element ? String(element.value ?? '') : '';
    if (mode === 'empty-only' && existing.trim().length > 0) {
      skipped += 1;
      continue;
    }

    const value = buildDirtyValue(field, element);
    applyValue(element, value);
    filled += 1;
  }

  runtime.state = 'done';
  emitEvent('INJECT_RESULT', {
    mode,
    filled,
    skipped,
    total: runtime.selectedTarget.fields.length,
    durationMs: Math.round(performance.now() - startedAt),
    riskFlags: Array.from(riskFlags),
  });
};

const collectFields = (container: HTMLElement): PickedField[] => {
  const fields = Array.from(container.querySelectorAll('input, textarea, select, [contenteditable="true"]'));
  return fields
    .map((node) => {
      const el = node as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
      return {
        selector: getSelector(el),
        type: (el as HTMLInputElement).type || (el.tagName.toLowerCase() === 'textarea' ? 'textarea' : el.tagName.toLowerCase()),
        name: (el as HTMLInputElement).name || undefined,
        id: el.id || undefined,
        label: getLabel(el),
        placeholder: (el as HTMLInputElement).placeholder || undefined,
        value: 'value' in el ? String((el as HTMLInputElement).value ?? '') : el.textContent?.trim() || undefined,
      } as PickedField;
    })
    .filter((field) => field.selector.length > 0);
};

const applyValue = (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement, value: string) => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (element instanceof HTMLSelectElement) {
    if (element.options.length > 0) {
      const pick = element.options[Math.min(1, element.options.length - 1)]?.value || element.options[0].value;
      element.value = pick;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }

  element.textContent = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
};

const buildDirtyValue = (field: PickedField, element: Element): string => {
  const hint = `${field.label ?? ''} ${field.name ?? ''} ${field.id ?? ''} ${field.placeholder ?? ''} ${field.type}`.toLowerCase();

  if (/email/.test(hint)) return `chaos.${Date.now()}@example.com`;
  if (/phone|tel|mobile/.test(hint)) return `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
  if (/date|birth/.test(hint) && element instanceof HTMLInputElement && element.type === 'date') return '1996-06-16';
  if (/zip|postal/.test(hint)) return `${Math.floor(Math.random() * 90000 + 10000)}`;
  if (/city/.test(hint)) return 'Neon Harbor';
  if (/state|province/.test(hint)) return 'CA';
  if (/country/.test(hint)) return 'United States';
  if (/name/.test(hint)) return 'Dragon Operator';
  if (/company|org/.test(hint)) return 'NoirsToo Labs';
  if (/address/.test(hint)) return '88 Ember Street';
  if (/url|website/.test(hint)) return 'https://example.org/prompt-graph';
  if (/number|qty|amount/.test(hint)) return `${Math.floor(Math.random() * 900 + 100)}`;

  return `dirty-${Math.random().toString(36).slice(2, 10)}`;
};

const getContainerTarget = (target: HTMLElement): HTMLElement | null => {
  const preferred = target.closest('form, section, article, [role="form"], .form, .container, main, div');
  return preferred as HTMLElement | null;
};

const getSelector = (element: Element): string => {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const path: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    if (current.classList.length > 0) {
      selector += `.${Array.from(current.classList).slice(0, 2).map((token) => CSS.escape(token)).join('.')}`;
    }
    const parentElement: Element | null = current.parentElement;
    if (parentElement) {
      const sameTagSiblings = Array.from(parentElement.children as HTMLCollectionOf<Element>)
        .filter((node) => node.tagName === current!.tagName);
      if (sameTagSiblings.length > 1) {
        selector += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }
    }
    path.unshift(selector);
    current = parentElement;
  }

  return path.join(' > ');
};

const getXPath = (element: Element): string => {
  if (element.id) return `//*[@id="${element.id}"]`;

  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((node) => node.tagName === current!.tagName)
      : [];
    const index = siblings.length > 1 ? `[${siblings.indexOf(current) + 1}]` : '';
    parts.unshift(`${current.tagName.toLowerCase()}${index}`);
    current = current.parentElement;
  }

  return `/${parts.join('/')}`;
};

const getDomPath = (element: Element): string[] => {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    path.unshift(current.tagName.toLowerCase());
    current = current.parentElement;
  }

  return path;
};

const getLabel = (element: Element): string | undefined => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    if (element.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (byFor?.textContent) return byFor.textContent.trim();
    }
  }

  const closestLabel = element.closest('label');
  if (closestLabel?.textContent) return closestLabel.textContent.trim();

  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  return undefined;
};

const emitEvent = (event: string, payload?: unknown) => {
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record = {
    tabId: runtime.tabId,
    sessionId: runtime.sessionId,
    event,
    state: runtime.state,
    timestamp: Date.now(),
    traceId,
  };
  console.info('[PromptGraph:content]', record);
  void browser.runtime.sendMessage({
    type: 'PICK_EVENT',
    tabId: runtime.tabId,
    event,
    payload,
    sessionId: runtime.sessionId,
    timestamp: Date.now(),
    state: runtime.state,
    traceId,
  });
};
