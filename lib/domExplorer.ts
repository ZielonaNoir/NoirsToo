import type { FormField, FormSchema } from '../types';

/**
 * 深度探测页面中的所有表单字段
 * 支持 Native DOM、React、Vue、Shadow DOM
 */
export const exploreFormFields = (): FormSchema => {
  const fields: FormField[] = [];
  const url = window.location.href;
  let framework: 'react' | 'vue' | 'native' | 'unknown' = 'native';
  
  // 检测框架
  if (document.querySelector('[data-reactroot]') || (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    framework = 'react';
  } else if ((window as any).__VUE__) {
    framework = 'vue';
  }
  
  // 获取所有输入元素
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
  
  inputs.forEach((element) => {
    const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    
    // 跳过隐藏字段和密码字段（安全考虑）
    if (input.type === 'hidden' || input.type === 'password') {
      return;
    }
    
    // 生成唯一选择器
    const selector = generateUniqueSelector(input);
    
    // 提取字段信息
    const field: FormField = {
      selector,
      label: findAssociatedLabel(input),
      placeholder: input.getAttribute('placeholder') || undefined,
      type: input.type || 'text',
      name: input.name || undefined,
      id: input.id || undefined,
      required: input.hasAttribute('required'),
    };
    
    fields.push(field);
  });
  
  // 穿透 Shadow DOM
  const shadowRoots = findAllShadowRoots(document.body);
  shadowRoots.forEach(root => {
    const shadowInputs = root.querySelectorAll('input, textarea, select');
    shadowInputs.forEach((input: any) => {
      if (input.type === 'hidden' || input.type === 'password') return;
      
      fields.push({
        selector: `shadow::${generateUniqueSelector(input)}`,
        label: findAssociatedLabel(input),
        placeholder: input.getAttribute('placeholder') || undefined,
        type: input.type || 'text',
        name: input.name || undefined,
        id: input.id || undefined,
        required: input.hasAttribute('required'),
      });
    });
  });
  
  return { url, fields, framework };
};

/**
 * 生成元素的唯一 CSS 选择器
 */
const generateUniqueSelector = (element: Element): string => {
  if (element.id) {
    return `#${element.id}`;
  }
  
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className) {
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('_')) // 过滤掉框架生成的类
        .join('.');
      if (classes) {
        selector += `.${classes}`;
      }
    }
    
    // 添加 nth-of-type 以确保唯一性
    const siblings = Array.from(current.parentElement?.children || []).filter(
      el => el.tagName === current!.tagName
    );
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-of-type(${index})`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
};

/**
 * 查找输入元素关联的 label 文本
 */
const findAssociatedLabel = (input: HTMLElement): string | undefined => {
  // 方法 1：通过 for 属性
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent?.trim();
  }
  
  // 方法 2：父级 label
  const parentLabel = input.closest('label');
  if (parentLabel) {
    return parentLabel.textContent?.replace(input.textContent || '', '').trim();
  }
  
  // 方法 3：aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  // 方法 4：前一个兄弟节点
  const prevSibling = input.previousElementSibling;
  if (prevSibling && prevSibling.tagName === 'LABEL') {
    return prevSibling.textContent?.trim();
  }
  
  return undefined;
};

/**
 * 递归查找所有 Shadow DOM
 */
const findAllShadowRoots = (root: Element): ShadowRoot[] => {
  const shadowRoots: ShadowRoot[] = [];
  
  const traverse = (element: Element) => {
    if (element.shadowRoot) {
      shadowRoots.push(element.shadowRoot);
      element.shadowRoot.querySelectorAll('*').forEach(traverse);
    }
    element.querySelectorAll('*').forEach(traverse);
  };
  
  traverse(root);
  return shadowRoots;
};
