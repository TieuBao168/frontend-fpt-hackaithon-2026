import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Chip, Drawer, Group, SegmentedControl, Stack, Text, Textarea } from '@mantine/core';
import { useCreateRevision } from '../../lib/queries';
import { makeConfigSchema } from '../../lib/schemas';
import { MusicFields, OutputFields, Section, StyleFields } from '../config/ConfigFields';
import type { AdjustScope, GenerationConfig, Project, Variant } from '../../types/domain';

const QUICK_CONTENT = ['Nhịp nhanh hơn', 'Hook mạnh hơn', 'Tập trung nhân vật chính', 'Bớt cảnh tĩnh', 'Kết treo hơn', 'Rút còn 30 giây'];
const QUICK_MUSIC = ['Nhạc buồn hơn', 'Nhạc dồn dập hơn', 'Nhạc nhẹ nhàng hơn', 'Thêm trống', 'Cao trào sớm hơn'];
const QUICK_SUB = ['Câu ngắn hơn', 'Sửa lỗi nhận dạng', 'Bỏ câu cảm thán'];

type DrawerScope = Extract<AdjustScope, 'content' | 'music' | 'subtitle'>;
type AdjustForm = GenerationConfig & { adjustPrompt: string; scope: DrawerScope };

interface Props {
  opened: boolean;
  onClose: () => void;
  project: Project;
  variant: Variant;
  vodDurationSec: number;
  /** Giai đoạn 1: chọn lại đoạn. Giai đoạn 2: tạo lại nhạc / phụ đề. */
  phase: 'video' | 'audio';
  initialScope?: DrawerScope;
}

/** Điều chỉnh nội dung bằng tham số / prompt → AI tạo phiên bản mới. Không chỉnh tay video. */
export function AdjustDrawer({ opened, onClose, project, variant, vodDurationSec, phase, initialScope }: Props) {
  const create = useCreateRevision();
  const schema = useMemo(() => makeConfigSchema(vodDurationSec), [vodDurationSec]);
  const initial: AdjustForm = {
    ...project.config,
    style: variant.style,
    adjustPrompt: '',
    scope: initialScope ?? (phase === 'video' ? 'content' : 'music'),
  };
  const { control, setValue, handleSubmit, reset } = useForm<AdjustForm>({
    // raw: giữ nguyên adjustPrompt/scope (schema chỉ kiểm tra phần cấu hình)
    resolver: zodResolver(schema, undefined, { raw: true }) as never,
    defaultValues: initial,
  });
  const prompt = useWatch({ control, name: 'adjustPrompt' });
  const scope = useWatch({ control, name: 'scope' });

  useEffect(() => {
    if (opened) reset(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialScope]);

  const quick = scope === 'content' ? QUICK_CONTENT : scope === 'music' ? QUICK_MUSIC : QUICK_SUB;
  const addQuick = (q: string) => setValue('adjustPrompt', prompt ? `${prompt.replace(/[.\s]+$/, '')}, ${q.toLowerCase()}` : q);

  const submit = handleSubmit(({ adjustPrompt, scope: sc, ...config }) => {
    const before = initial as unknown as Record<string, unknown>;
    const configDiff = Object.fromEntries(
      Object.entries(config).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])),
    ) as Partial<GenerationConfig>;
    create.mutate(
      { projectId: project.id, variantId: variant.id, adjustment: { scope: sc, configDiff, prompt: adjustPrompt?.trim() || undefined } },
      { onSuccess: onClose },
    );
  });

  const title = phase === 'video' ? 'Điều chỉnh nội dung video' : 'Tạo lại nhạc / phụ đề';

  return (
    <Drawer opened={opened} onClose={onClose} position="right" size={480} title={<Text fw={600}>{title}</Text>}>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Alert color="blue" variant="light" p="xs">
            <Text fz="xs">
              AI sẽ chạy lại {phase === 'video' ? 'bước chọn đoạn và dựng video' : 'bước tạo nhạc hoặc phụ đề'}, mất khoảng vài phút. Muốn đổi kiểu hiển
              thị hoặc âm lượng thì dùng các tab trên preview – thấy ngay, không cần chờ.
            </Text>
          </Alert>
          {phase === 'audio' && (
            <Section title="Tạo lại phần nào">
              <SegmentedControl
                value={scope}
                onChange={(v) => setValue('scope', v as DrawerScope)}
                data={[
                  { value: 'music', label: 'Nhạc' },
                  { value: 'subtitle', label: 'Phụ đề' },
                ]}
              />
            </Section>
          )}
          <Section title="Yêu cầu điều chỉnh" hint="Mô tả điều muốn đổi, AI sẽ tạo lại phiên bản mới.">
            <Textarea
              autosize
              minRows={2}
              placeholder={scope === 'content' ? 'vd: mở đầu bằng câu thoại ở phút 67, bớt cảnh tình cảm' : scope === 'music' ? 'vd: nhạc piano buồn, cao trào ở giây 40' : 'vd: viết ngắn gọn hơn'}
              value={prompt}
              onChange={(e) => setValue('adjustPrompt', e.currentTarget.value)}
            />
            <Group gap={6}>
              {quick.map((q) => (
                <Chip key={q} size="xs" checked={false} onChange={() => addQuick(q)} color="blue" variant="outline">
                  {q}
                </Chip>
              ))}
            </Group>
          </Section>

          {scope === 'content' && (
            <>
              <OutputFields control={control as never} setValue={setValue as never} compact />
              <StyleFields control={control as never} setValue={setValue as never} />
            </>
          )}
          {scope === 'music' && <MusicFields control={control as never} setValue={setValue as never} />}

          <Group justify="flex-end" pos="sticky" bottom={0} py="sm" bg="white">
            <Button variant="default" onClick={onClose}>
              Đóng
            </Button>
            <Button type="submit" loading={create.isPending}>
              Tạo lại
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
