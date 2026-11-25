import type { CSSProperties } from 'react';
import type { SubtitleTemplate } from '../../types/domain';

export const subtitleTextStyle = (template: SubtitleTemplate): CSSProperties => {
  switch (template) {
    case 'bold':
      return {
        color: '#FFD43B',
        fontWeight: 800,
        textShadow: '0 0 3px #000, 0 0 3px #000, 0 2px 4px #000',
      };
    case 'boxed':
      return {
        color: '#fff',
        fontWeight: 600,
        background: 'rgba(0,0,0,0.72)',
        padding: '0.15em 0.5em',
        borderRadius: 4,
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      };
    case 'cinema':
      return { color: '#F1F3F5', fontWeight: 400, letterSpacing: '0.02em', textShadow: '0 1px 2px rgba(0,0,0,0.9)' };
    default:
      return { color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.95)' };
  }
};
