import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import {
  Card,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
} from '@mantine/core';
import { DURATION_RANGE, goalLabel, pacingLabel, styleLabel } from '../../lib/labels';
import { formatDuration } from '../../lib/time';
import type { GenerationConfig, OutputType } from '../../types/domain';

const toOptions = (rec: Record<string, string>) => Object.entries(rec).map(([value, label]) => ({ value, label }));

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <Stack gap="sm">
        <div>
          <Text fw={600}>{title}</Text>
          {hint && (
            <Text fz="xs" c="gray.6">
              {hint}
            </Text>
          )}
        </div>
        {children}
      </Stack>
    </Card>
  );
}

interface Props {
  control: Control<GenerationConfig>;
  setValue: UseFormSetValue<GenerationConfig>;
  /** Dùng trong bảng điều chỉnh: ẩn các trường không đổi được sau khi đã tạo */
  compact?: boolean;
}

export function OutputFields({ control, setValue, compact }: Props) {
  const outputType = useWatch({ control, name: 'outputType' });
  const range = DURATION_RANGE[outputType];

  return (
    <Section title="Đầu ra" hint="Video ngắn 15–90 giây (9:16). Video dài 3–10 phút (16:9 hoặc 9:16).">
      {!compact && (
        <Controller
          control={control}
          name="goal"
          render={({ field }) => <Select label="Mục tiêu clip" data={toOptions(goalLabel)} allowDeselect={false} {...field} />}
        />
      )}
      <SimpleGrid cols={compact ? 1 : 2}>
        {!compact && (
          <Controller
            control={control}
            name="outputType"
            render={({ field }) => (
              <Stack gap={4}>
                <Text fz="sm" fw={500}>
                  Loại đầu ra
                </Text>
                <SegmentedControl
                  value={field.value}
                  onChange={(v) => {
                    const t = v as OutputType;
                    field.onChange(t);
                    setValue('durationSec', DURATION_RANGE[t].default, { shouldValidate: true });
                    setValue('ratio', t === 'short' ? '9:16' : '16:9', { shouldValidate: true });
                  }}
                  data={[
                    { value: 'short', label: 'Video ngắn' },
                    { value: 'long', label: 'Video dài' },
                  ]}
                />
              </Stack>
            )}
          />
        )}
        {!compact && (
          <Controller
            control={control}
            name="ratio"
            render={({ field, fieldState }) => (
              <Stack gap={4}>
                <Text fz="sm" fw={500}>
                  Tỉ lệ khung hình
                </Text>
                <SegmentedControl
                  value={field.value}
                  onChange={field.onChange}
                  data={[
                    { value: '9:16', label: '9:16 dọc' },
                    { value: '16:9', label: '16:9 ngang', disabled: outputType === 'short' },
                  ]}
                />
                {fieldState.error && (
                  <Text fz="xs" c="red.7">
                    {fieldState.error.message}
                  </Text>
                )}
              </Stack>
            )}
          />
        )}
      </SimpleGrid>
      <Controller
        control={control}
        name="durationSec"
        render={({ field, fieldState }) => (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="sm" fw={500}>
                Thời lượng mục tiêu
              </Text>
              <Text className="mono" c="gray.7">
                {formatDuration(field.value)}
              </Text>
            </Group>
            <Slider
              min={range.min}
              max={range.max}
              step={outputType === 'short' ? 5 : 15}
              value={field.value}
              onChange={field.onChange}
              label={(v) => formatDuration(v)}
              marks={[
                { value: range.min, label: formatDuration(range.min) },
                { value: range.max, label: formatDuration(range.max) },
              ]}
              mb="md"
            />
            {fieldState.error && (
              <Text fz="xs" c="red.7">
                {fieldState.error.message}
              </Text>
            )}
          </Stack>
        )}
      />
    </Section>
  );
}

export function StyleFields({ control }: Props) {
  return (
    <Section title="Phong cách & nội dung" hint="Để trống phong cách: hệ thống tự gợi ý theo thể loại phim.">
      <SimpleGrid cols={2}>
        <Controller
          control={control}
          name="style"
          render={({ field }) => (
            <Select
              label="Phong cách"
              placeholder="Tự gợi ý"
              clearable
              data={toOptions(styleLabel)}
              value={field.value ?? null}
              onChange={(v) => field.onChange(v ?? undefined)}
            />
          )}
        />
        <Controller
          control={control}
          name="pacing"
          render={({ field }) => (
            <Stack gap={4}>
              <Text fz="sm" fw={500}>
                Nhịp cắt
              </Text>
              <SegmentedControl value={field.value ?? 'medium'} onChange={field.onChange} data={toOptions(pacingLabel)} />
            </Stack>
          )}
        />
      </SimpleGrid>
      <Controller
        control={control}
        name="focusCharacters"
        render={({ field }) => (
          <TagsInput
            label="Nhân vật ưu tiên"
            placeholder="Nhập tên rồi Enter"
            description="Sau khi phân tích, danh sách nhân vật AI nhận diện sẽ hiện để chọn."
            value={field.value ?? []}
            onChange={field.onChange}
          />
        )}
      />
      <Group gap="xl">
        <Controller
          control={control}
          name="spoilerGuard"
          render={({ field }) => (
            <Switch
              label="Tránh spoil"
              description="Không dùng cảnh thuộc 15% cuối phim"
              checked={field.value}
              onChange={(e) => field.onChange(e.currentTarget.checked)}
              color="green"
            />
          )}
        />
        <Controller
          control={control}
          name="avoidSensitive"
          render={({ field }) => (
            <Switch
              label="Tránh cảnh nhạy cảm"
              checked={field.value}
              onChange={(e) => field.onChange(e.currentTarget.checked)}
              color="green"
            />
          )}
        />
      </Group>
    </Section>
  );
}

export function MusicFields({ control }: Props) {
  return (
    <Section title="Nhạc AI" hint="Nhạc luôn do AI tạo mới. Để trống: AI tự suy ra từ phong cách và nhịp clip.">
      <SimpleGrid cols={2}>
        <Controller
          control={control}
          name="music.mood"
          render={({ field }) => (
            <TextInput label="Mood" placeholder="vd: hồi hộp, da diết" value={field.value ?? ''} onChange={field.onChange} />
          )}
        />
        <Controller
          control={control}
          name="music.tempo"
          render={({ field }) => (
            <NumberInput
              label="Tempo (BPM)"
              placeholder="Tự động"
              min={50}
              max={180}
              value={field.value ?? ''}
              onChange={(v) => field.onChange(typeof v === 'number' ? v : undefined)}
            />
          )}
        />
      </SimpleGrid>
      <Controller
        control={control}
        name="music.volumeRatio"
        render={({ field }) => (
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="sm" fw={500}>
                Âm lượng nhạc so với âm gốc
              </Text>
              <Text className="mono" c="gray.7">
                {Math.round((field.value ?? 0.35) * 100)}%
              </Text>
            </Group>
            <Slider min={0} max={1} step={0.05} value={field.value ?? 0.35} onChange={field.onChange} label={null} color="blue" />
            <Text fz="xs" c="gray.6">
              Nhạc tự giảm khi có thoại hoặc voice-over.
            </Text>
          </Stack>
        )}
      />
    </Section>
  );
}

export function ExtrasFields({ control }: Props) {
  const items: { name: keyof GenerationConfig['extras']; label: string }[] = [
    { name: 'subtitle', label: 'Phụ đề lời thoại' },
    { name: 'voiceover', label: 'Voice-over lời dẫn' },
    { name: 'caption', label: 'Caption trên hình' },
    { name: 'smartCrop', label: 'Tự crop theo nhân vật' },
  ];
  return (
    <Section title="Kèm theo">
      <SimpleGrid cols={2}>
        {items.map((it) => (
          <Controller
            key={it.name}
            control={control}
            name={`extras.${it.name}`}
            render={({ field }) => (
              <Switch label={it.label} checked={field.value} onChange={(e) => field.onChange(e.currentTarget.checked)} />
            )}
          />
        ))}
      </SimpleGrid>
    </Section>
  );
}
