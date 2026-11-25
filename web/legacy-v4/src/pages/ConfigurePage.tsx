import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Grid, Group, NumberInput, Stack, Text } from '@mantine/core';
import { Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import { useCreateProject, useVod } from '../lib/queries';
import { defaultConfig, makeConfigSchema } from '../lib/schemas';
import { genreLabel } from '../lib/labels';
import { formatDuration } from '../lib/time';
import { ErrorBlock, LoadingBlock, PageHeader } from '../components/common';
import { ExtrasFields, MusicFields, OutputFields, Section, StyleFields } from '../features/config/ConfigFields';
import { PromptToConfig } from '../features/config/PromptToConfig';
import type { GenerationConfig, Vod } from '../types/domain';

export function ConfigurePage() {
  const { vodId } = useParams();
  const { data: vod, isLoading, error } = useVod(vodId);
  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} />;
  if (!vod) return null;
  return <ConfigureForm vod={vod} />;
}

function ConfigureForm({ vod }: { vod: Vod }) {
  const navigate = useNavigate();
  const create = useCreateProject();
  const schema = useMemo(() => makeConfigSchema(vod.durationSec), [vod.durationSec]);
  const { control, setValue, getValues, handleSubmit, formState } = useForm<GenerationConfig>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultConfig,
    mode: 'onChange',
  });
  const prompt = useWatch({ control, name: 'prompt' }) ?? '';
  const values = useWatch({ control }) as GenerationConfig;

  const submit = (mode: 'auto' | 'review') =>
    handleSubmit((config) =>
      create.mutate({ vodId: vod.id, mode, config }, { onSuccess: (p) => navigate(`/projects/${p.id}`) }),
    )();

  const applyPatch = (patch: Partial<GenerationConfig>) => {
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'music') setValue('music', { ...getValues('music'), ...(v as GenerationConfig['music']) });
      else setValue(k as keyof GenerationConfig, v as never, { shouldValidate: true });
    }
  };

  return (
    <>
      <PageHeader
        title={`Cấu hình clip · ${vod.title}`}
        subtitle={`${genreLabel[vod.genre]} · ${formatDuration(vod.durationSec)} · ${vod.resolution}${vod.analyzed ? ' · đã phân tích, dùng lại kết quả' : ''}`}
      />
      <Grid gap="lg">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            <Section title="Mô tả nhu cầu (tùy chọn)" hint="AI đọc mô tả và điền vào các trường bên dưới để bạn xem lại.">
              <PromptToConfig
                current={values}
                prompt={prompt}
                onPromptChange={(v) => setValue('prompt', v)}
                onApply={applyPatch}
              />
            </Section>
            <OutputFields control={control} setValue={setValue} />
            <StyleFields control={control} setValue={setValue} />
            <MusicFields control={control} setValue={setValue} />
            <ExtrasFields control={control} setValue={setValue} />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md" pos="sticky" top={72}>
            <Section title="Phương án" hint="Mỗi phương án dùng một phong cách khác, chung kết quả phân tích.">
              <Controller
                control={control}
                name="variantCount"
                render={({ field }) => (
                  <NumberInput label="Số phương án clip" min={1} max={3} value={field.value} onChange={(v) => field.onChange(Number(v) || 1)} />
                )}
              />
            </Section>
            <Section title="Bắt đầu">
              <Text fz="sm" c="gray.7">
                <b>Tạo tự động</b>: AI chọn đoạn, tạo nhạc và dựng thẳng ra clip.
                <br />
                <b>Tạo và duyệt</b>: dừng ở bước kết quả để bạn xem, điều chỉnh rồi chốt.
              </Text>
              <Group grow>
                <Button variant="default" onClick={() => submit('review')} loading={create.isPending} disabled={!formState.isValid}>
                  Tạo và duyệt
                </Button>
                <Button onClick={() => submit('auto')} loading={create.isPending} disabled={!formState.isValid}>
                  Tạo tự động
                </Button>
              </Group>
            </Section>
          </Stack>
        </Grid.Col>
      </Grid>
    </>
  );
}
