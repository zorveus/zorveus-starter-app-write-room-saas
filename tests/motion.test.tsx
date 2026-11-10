// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Disclosure } from '../src/Disclosure';
import { revealEdit } from '../src/motion';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('keeps collapsed disclosure actions out of the accessible tree and restores them on expansion', () => {
  render(<Disclosure label="Allowance details"><button>Read policy help</button></Disclosure>);
  const toggle = screen.getByRole('button', { name: 'Allowance details' });
  expect(screen.queryByRole('button', { name: 'Read policy help' })).toBeNull();
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Read policy help' })).toBeTruthy();
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(toggle);
  expect(screen.queryByRole('button', { name: 'Read policy help' })).toBeNull();
});

it('does not animate editor replacements when reduced motion is requested', () => {
  const element = document.createElement('textarea');
  const animate = vi.fn();
  element.animate = animate;
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  revealEdit(element);
  expect(animate).not.toHaveBeenCalled();
});
