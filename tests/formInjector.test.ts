import { describe, expect, it, vi } from 'vitest';
import { fillFormField, fillMultipleFields } from '../lib/formInjector';

describe('formInjector', () => {
  it('returns false when selector is missing', async () => {
    const ok = await fillFormField('#missing-target', 'hello');
    expect(ok).toBe(false);
  });

  it('fills a native input and emits input events', async () => {
    document.body.innerHTML = '<input id="name" />';
    const input = document.querySelector('#name') as HTMLInputElement;
    const onInput = vi.fn();
    input.addEventListener('input', onInput);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const ok = await fillFormField('#name', 'abc', { typingSpeed: 0, autoFocus: false });
    randomSpy.mockRestore();

    expect(ok).toBe(true);
    expect(input.value).toBe('abc');
    expect(onInput).toHaveBeenCalled();
  });

  it('tracks success and failure in batch fill', async () => {
    document.body.innerHTML = '<input id="email" />';

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = await fillMultipleFields([
      { selector: '#email', value: 'a@b.com' },
      { selector: '#does-not-exist', value: 'x' },
    ]);
    randomSpy.mockRestore();

    expect(result).toEqual({ success: 1, failed: 1 });
  });
});
