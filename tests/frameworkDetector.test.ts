import { describe, expect, it } from 'vitest';
import { detectFramework, getNativeInputSetter } from '../lib/frameworkDetector';

describe('frameworkDetector', () => {
  it('detects react via react internals on element', () => {
    const element = document.createElement('input') as HTMLInputElement & {
      __reactFiber$test?: object;
    };
    element.__reactFiber$test = {};

    expect(detectFramework(element)).toBe('react');
  });

  it('detects vue via vue internals on element', () => {
    const element = document.createElement('textarea') as HTMLTextAreaElement & {
      __vueParentComponent?: object;
    };
    element.__vueParentComponent = {};

    expect(detectFramework(element)).toBe('vue');
  });

  it('returns native when no framework markers exist', () => {
    const element = document.createElement('input');
    expect(detectFramework(element)).toBe('native');
  });

  it('returns a native setter for input controls', () => {
    const element = document.createElement('input');
    const setter = getNativeInputSetter(element);
    expect(typeof setter).toBe('function');
  });
});
