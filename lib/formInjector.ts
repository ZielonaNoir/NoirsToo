import { detectFramework, getNativeInputSetter } from './frameworkDetector';

/**
 * 模拟人类输入行为填充表单字段
 * 支持 React/Vue 受控组件
 */
export const fillFormField = async (
  selector: string,
  value: string,
  options: {
    typingSpeed?: number; // 每个字符的输入延迟（ms）
    autoFocus?: boolean;  // 是否自动聚焦
  } = {}
): Promise<boolean> => {
  const { typingSpeed = 50, autoFocus = true } = options;
  
  try {
    // 处理 Shadow DOM
    let element: HTMLInputElement | HTMLTextAreaElement | null = null;
    
    if (selector.startsWith('shadow::')) {
      const realSelector = selector.replace('shadow::', '');
      // TODO: 实现 Shadow DOM 查询
      element = document.querySelector(realSelector) as HTMLInputElement;
    } else {
      element = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
    }
    
    if (!element) {
      console.warn(`Element not found: ${selector}`);
      return false;
    }
    
    // 检测框架
    const framework = detectFramework(element);
    
    // 1. Focus 事件
    if (autoFocus) {
      element.focus();
      element.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
      await delay(100);
    }
    
    // 2. 清空现有值
    element.value = '';
    
    // 3. 模拟逐字符输入
    for (let i = 0; i < value.length; i++) {
      const char = value[i];
      const currentValue = element.value + char;
      
      // 根据框架类型设置值
      if (framework === 'react') {
        // React: 使用原生 setter 绕过劫持
        const nativeSetter = getNativeInputSetter(element);
        if (nativeSetter) {
          nativeSetter.call(element, currentValue);
        } else {
          element.value = currentValue;
        }
        
        // 触发 React 事件
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (framework === 'vue') {
        // Vue: 直接修改 value 并触发 input 事件
        element.value = currentValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Native: 标准方式
        element.value = currentValue;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // 模拟真实输入速度（随机化）
      const delay_ms = typingSpeed + Math.random() * 50 - 25;
      await delay(delay_ms);
    }
    
    // 4. Change 事件（表单提交时触发）
    element.dispatchEvent(new Event('change', { bubbles: true }));
    
    // 5. Blur 事件
    await delay(100);
    element.blur();
    element.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    
    return true;
  } catch (error) {
    console.error(`Failed to fill field ${selector}:`, error);
    return false;
  }
};

/**
 * 批量填充表单
 */
export const fillMultipleFields = async (
  mappings: Array<{ selector: string; value: string }>,
  options?: { sequentialDelay?: number }
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;
  
  for (const mapping of mappings) {
    const result = await fillFormField(mapping.selector, mapping.value);
    if (result) {
      success++;
    } else {
      failed++;
    }
    
    // 字段间延迟
    if (options?.sequentialDelay) {
      await delay(options.sequentialDelay);
    }
  }
  
  return { success, failed };
};

/**
 * 延迟工具函数
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
