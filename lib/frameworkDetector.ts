/**
 * 检测元素所属的框架类型
 */
export const detectFramework = (element: HTMLElement): 'react' | 'vue' | 'native' => {
  // 检测 React
  const reactKeys = Object.keys(element).filter(key => 
    key.startsWith('__react') || key.startsWith('_react')
  );
  if (reactKeys.length > 0) {
    return 'react';
  }
  
  // 检测 Vue
  if ((element as any).__vueParentComponent || (element as any).__vue__) {
    return 'vue';
  }
  
  return 'native';
};

/**
 * 获取元素的原生 value setter（绕过框架劫持）
 */
export const getNativeInputSetter = (element: HTMLInputElement | HTMLTextAreaElement) => {
  const prototype = Object.getPrototypeOf(element);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  return descriptor?.set;
};
