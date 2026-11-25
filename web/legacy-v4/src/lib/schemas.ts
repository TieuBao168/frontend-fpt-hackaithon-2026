import { z } from 'zod';
import { DURATION_RANGE } from './labels';
import type { GenerationConfig } from '../types/domain';

/** Schema form cấu hình. Kiểm tra BR-01 (khung thời lượng, tỉ lệ) và không dài hơn VOD. */
export function makeConfigSchema(vodDurationSec: number) {
  return z
    .object({
      goal: z.enum(['trailer', 'teaser', 'best_scenes', 'character_intro']),
      outputType: z.enum(['short', 'long']),
      durationSec: z.number(),
      ratio: z.enum(['9:16', '16:9']),
      style: z.enum(['cinematic', 'dramatic', 'funny', 'energetic']).optional(),
      pacing: z.enum(['slow', 'medium', 'fast']).optional(),
      focusCharacters: z.array(z.string()).optional(),
      spoilerGuard: z.boolean(),
      avoidSensitive: z.boolean(),
      music: z
        .object({
          mood: z.string().optional(),
          tempo: z.number().optional(),
          instruments: z.array(z.string()).optional(),
          volumeRatio: z.number().min(0).max(1).optional(),
        })
        .optional(),
      extras: z.object({
        subtitle: z.boolean(),
        voiceover: z.boolean(),
        caption: z.boolean(),
        smartCrop: z.boolean(),
      }),
      prompt: z.string().max(1000).optional(),
      variantCount: z.number().int().min(1).max(3),
    })
    .superRefine((v, ctx) => {
      const range = DURATION_RANGE[v.outputType];
      if (v.durationSec < range.min || v.durationSec > range.max) {
        ctx.addIssue({
          code: 'custom',
          path: ['durationSec'],
          message: `Thời lượng phải từ ${range.min} đến ${range.max} giây với loại đầu ra này.`,
        });
      }
      if (v.durationSec > vodDurationSec) {
        ctx.addIssue({ code: 'custom', path: ['durationSec'], message: 'Không được dài hơn VOD gốc.' });
      }
      if (v.outputType === 'short' && v.ratio !== '9:16') {
        ctx.addIssue({ code: 'custom', path: ['ratio'], message: 'Video ngắn chỉ hỗ trợ tỉ lệ 9:16.' });
      }
    });
}

export const defaultConfig: GenerationConfig = {
  goal: 'trailer',
  outputType: 'short',
  durationSec: DURATION_RANGE.short.default,
  ratio: '9:16',
  style: undefined,
  pacing: 'medium',
  focusCharacters: [],
  spoilerGuard: true,
  avoidSensitive: true,
  music: { mood: '', volumeRatio: 0.35 },
  extras: { subtitle: true, voiceover: false, caption: false, smartCrop: true },
  prompt: '',
  variantCount: 1,
};
