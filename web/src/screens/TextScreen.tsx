import { useMemo, useState } from 'react';
import { Box, Button, Card, Checkbox, Group, Stack, Tabs, Text, Textarea, TextInput } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { Phase2Gate } from '../components/Gate';
import { VariantTabs } from '../components/inputs';
import { StillFrame } from '../components/media';
import { ChipGroup, Notice, ScreenHeader } from '../components/ui';
import { api } from '../lib/api';
import { clipTimeline, subtitleCues } from '../lib/clip';
import { mmss } from '../lib/format';
import { voiceLabel } from '../lib/labels';
import { useProjectAction } from '../lib/queries';
import { MAXLEN } from '../lib/rules';
import { useApp } from '../store/app';
import type { Project, Voice } from '../types/domain';

/** Màn 6. Sub, lời dẫn, caption (UC-E.1 đến E.3) */
export function TextScreen() {
  return <Phase2Gate header={<ScreenHeader title="Sub, lời dẫn, caption" />}>{(p) => <TextBody p={p} />}</Phase2Gate>;
}

function TextBody({ p }: { p: Project }) {
  const { activeVariant, setActiveVariant } = useApp();
  const v = p.variants.find((x) => x.key === activeVariant) ?? p.variants[0];
  const tl = useMemo(() => clipTimeline(p, v), [p, v]);
  const patch = useProjectAction((b: Parameters<typeof api.patchProject>[1]) => api.patchProject(p.id, b));
  const rewrite = useProjectAction(() => api.rewriteVoiceOver(p.id), 'AI đã viết lại lời dẫn.');

  return (
    <>
      <VariantTabs project={p} active={v.key} onChange={setActiveVariant} />
      <div className="grid-2">
        <Tabs defaultValue="sub" keepMounted={false}>
          <Tabs.List mb="md">
            <Tabs.Tab value="sub" fz={16}>
              Subtitle lời thoại
            </Tabs.Tab>
            <Tabs.Tab value="vo" fz={16}>
              Lời dẫn (voice-over)
            </Tabs.Tab>
            <Tabs.Tab value="cap" fz={16}>
              Caption trên hình
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sub">
            <Stack gap="sm">
              <Checkbox label="Bật sub" checked={p.subtitleEnabled} onChange={(e) => patch.mutate({ subtitleEnabled: e.currentTarget.checked })} />
              {tl.items.map((it, i) => {
                if (it.kind !== 'segment') return null;
                const sub = p.subtitles.find((s) => s.segmentId === it.seg.id);
                const at = tl.starts[i];
                return (
                  <Group key={it.seg.id} gap="sm" wrap="nowrap" align="center">
                    <Text fz={14} c="dimmed" w={104} className="num" style={{ flex: 'none' }}>
                      {sub ? `${mmss(at + sub.startSec)}–${mmss(at + sub.endSec)}` : `${mmss(at)} · đoạn ${it.index + 1}`}
                    </Text>
                    {sub ? (
                      <TextInput
                        style={{ flex: 1 }}
                        maxLength={MAXLEN.subtitle}
                        defaultValue={sub.text}
                        disabled={!p.subtitleEnabled}
                        aria-label={`Dòng sub đoạn ${it.index + 1}`}
                        onBlur={(e) => {
                          const text = e.currentTarget.value;
                          if (text !== sub.text) patch.mutate({ subtitles: p.subtitles.map((x) => (x.id === sub.id ? { ...x, text } : x)) });
                        }}
                      />
                    ) : (
                      <Text fz={14} c="dimmed" fs="italic">
                        (đoạn không có thoại)
                      </Text>
                    )}
                  </Group>
                );
              })}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="vo">
            <VoiceOverTab p={p} onSave={(vo) => patch.mutate({ voiceOver: vo })} onRewrite={() => rewrite.mutate()} rewriting={rewrite.isPending} />
          </Tabs.Panel>

          <Tabs.Panel value="cap">
            <Stack gap="sm">
              <Text fz={14} c="dimmed">
                Caption AI gợi ý theo phong cách. Caption chứa từ nhạy cảm đã được lọc trước khi hiện.
              </Text>
              {p.captions.map((c) => (
                <Group key={c.id} gap="sm" wrap="nowrap">
                  <Checkbox
                    checked={c.enabled}
                    aria-label={`Bật caption ${c.text}`}
                    onChange={(e) => {
                      const enabled = e.currentTarget.checked;
                      patch.mutate({ captions: p.captions.map((x) => (x.id === c.id ? { ...x, enabled } : x)) });
                    }}
                  />
                  <TextInput
                    style={{ flex: 1 }}
                    maxLength={MAXLEN.caption}
                    defaultValue={c.text}
                    aria-label="Nội dung caption"
                    onBlur={(e) => {
                      const text = e.currentTarget.value;
                      if (text !== c.text) patch.mutate({ captions: p.captions.map((x) => (x.id === c.id ? { ...x, text } : x)) });
                    }}
                  />
                </Group>
              ))}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Box className="sticky-col">
          {/* Khung xem tĩnh: khung đoạn đầu + sub và caption đầu tiên đang bật (không phát) */}
          <StillFrame
            ratio={p.config.ratio}
            item={tl.items.find((it) => it.kind === 'segment')}
            autoCrop={p.autoCrop}
            subtitle={p.subtitleEnabled ? subtitleCues(p, tl)[0]?.text : undefined}
            caption={p.captions.find((c) => c.enabled && c.text.trim())?.text}
          />
          <Text fz={13} c="dimmed" ta="center" mt={6}>
            Xem mẫu khung đầu tiên. Xem cả clip ở bước Xem trước và tải.
          </Text>
          {p.dirty && (
            <Box mt="sm">
              <Notice>Đã lưu chỉnh sửa. Bấm "Dựng lại" trên thanh trên để tạo phiên bản mới.</Notice>
            </Box>
          )}
        </Box>
      </div>
    </>
  );
}

function VoiceOverTab({ p, onSave, onRewrite, rewriting }: { p: Project; onSave: (vo: Project['voiceOver']) => void; onRewrite: () => void; rewriting: boolean }) {
  const [text, setText] = useState(p.voiceOver.text);
  const [last, setLast] = useState(p.voiceOver.text);
  if (p.voiceOver.text !== last) {
    // AI viết lại → cập nhật ô nhập
    setLast(p.voiceOver.text);
    setText(p.voiceOver.text);
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <Stack gap="sm">
      <Checkbox label="Dùng lời dẫn" checked={p.voiceOver.enabled} onChange={(e) => onSave({ ...p.voiceOver, enabled: e.currentTarget.checked })} />
      <Textarea
        autosize
        minRows={5}
        maxLength={MAXLEN.voiceOver}
        aria-label="Lời dẫn"
        value={text}
        disabled={!p.voiceOver.enabled}
        onChange={(e) => setText(e.currentTarget.value)}
        onBlur={() => text !== p.voiceOver.text && onSave({ ...p.voiceOver, text })}
        description="Do AI viết, không lộ kết phim."
      />
      <Text fz={14} c="dimmed" className="num">
        {words} từ, khoảng {Math.round(words / 2.5)} giây đọc · {text.length}/{MAXLEN.voiceOver}
      </Text>
      <Text fz={15} fw={600}>
        Giọng đọc
      </Text>
      <ChipGroup
        label="Giọng đọc"
        options={(Object.keys(voiceLabel) as Voice[]).map((value) => ({ value, label: voiceLabel[value] }))}
        value={p.voiceOver.voice}
        onChange={(voice) => onSave({ ...p.voiceOver, voice })}
        disabled={!p.voiceOver.enabled}
      />
      <Group>
        <Button variant="default" leftSection={<IconSparkles size={18} />} onClick={onRewrite} loading={rewriting} disabled={!p.voiceOver.enabled}>
          AI viết lại
        </Button>
      </Group>
      <Card padding={12} className="tinted">
        <Text fz={14} c="dimmed">
          Lời dẫn được đặt vào các khoảng không có thoại gốc; nhạc tự hạ khi có lời dẫn nếu bật ducking ở màn Nhạc AI.
        </Text>
      </Card>
    </Stack>
  );
}
