import { useState } from 'react';
import { Anchor, Box, Button, Card, Checkbox, Group, Radio, Stack, TagsInput, Text, Textarea, TextInput, Title } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { Phase2Gate } from '../components/Gate';
import { Notice, ScreenHeader, StatusPill } from '../components/ui';
import { api } from '../lib/api';
import { platformLabel } from '../lib/labels';
import { keys, toast, usePlatforms, useProjectAction } from '../lib/queries';
import { MAXLEN, TIKTOK_TAG_SOFT_MAX } from '../lib/rules';
import type { Platform, Project } from '../types/domain';

const PLATFORMS: Platform[] = ['facebook', 'tiktok', 'youtube'];

/** Màn 8. Đăng bài (UC-H.1 đến H.3) */
export function PublishScreen() {
  return <Phase2Gate header={<ScreenHeader title="Đăng bài" />}>{(p) => <PublishBody key={p.postDraft?.titles.join('|') ?? 'none'} p={p} />}</Phase2Gate>;
}

function PublishBody({ p }: { p: Project }) {
  const qc = useQueryClient();
  const { data: platforms } = usePlatforms();
  const suggest = useProjectAction(() => api.suggestPost(p.id));
  const publish = useProjectAction((body: Parameters<typeof api.publish>[1]) => api.publish(p.id, body));
  const d = p.postDraft;
  const [title, setTitle] = useState(d?.title ?? '');
  const [desc, setDesc] = useState(d?.desc ?? '');
  const [tags, setTags] = useState<string[]>(d?.tags ?? []);
  const [chosen, setChosen] = useState<string>(d ? '0' : '');
  const [selected, setSelected] = useState<Platform[]>(['facebook', 'tiktok', 'youtube']);
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState('');
  const [reconnecting, setReconnecting] = useState<Platform | null>(null);

  const titleTooLong = title.length > MAXLEN.title; // V16
  const tiktokTags = selected.includes('tiktok') && tags.length >= TIKTOK_TAG_SOFT_MAX;
  const canPost = !!d && !p.dirty && !titleTooLong && !!title.trim() && selected.length > 0 && (when === 'now' || !!at); // V15, V16
  const result = (pl: Platform) => p.posts.find((x) => x.platform === pl);
  const failed = p.posts.filter((x) => x.status === 'error' && selected.includes(x.platform));

  const reconnect = async (pl: Platform) => {
    setReconnecting(pl);
    try {
      await api.connect(pl);
      await qc.invalidateQueries({ queryKey: keys.platforms });
      toast(`Đã kết nối lại ${platformLabel[pl]}.`, 'ok');
    } catch (e) {
      toast((e as Error).message, 'bad');
    } finally {
      setReconnecting(null);
    }
  };

  if (!d) {
    return (
      <Card padding={14} maw={640}>
        <Stack gap="sm">
          <Text>AI đề xuất 3 tiêu đề, mô tả và hashtag dựa trên phim, các đoạn đã chọn và phong cách clip.</Text>
          <Group>
            <Button leftSection={<IconSparkles size={18} />} loading={suggest.isPending} onClick={() => suggest.mutate()}>
              AI đề xuất nội dung
            </Button>
          </Group>
        </Stack>
      </Card>
    );
  }

  return (
    <>
      {p.dirty && (
        <Box mb="md">
          <Notice tone="warn">Có thay đổi chưa dựng. Dựng lại trước khi đăng.</Notice>
        </Box>
      )}
      <div className="grid-2">
        <Card padding={14}>
          <Stack gap="md">
            <Radio.Group
              label={<Text fw={700} fz={17}>AI đề xuất 3 tiêu đề</Text>}
              value={chosen}
              onChange={(v) => {
                setChosen(v);
                setTitle(d.titles[Number(v)]);
              }}
            >
              <Stack gap={10} mt="sm">
                {d.titles.map((t, i) => (
                  <Radio key={t} value={String(i)} label={t} />
                ))}
              </Stack>
            </Radio.Group>
            <TextInput
              label="Tiêu đề"
              value={title}
              onChange={(e) => {
                setTitle(e.currentTarget.value);
                setChosen('');
              }}
              error={titleTooLong ? 'Tiêu đề tối đa 100 ký tự.' : undefined}
              description={`${title.length}/${MAXLEN.title} (YouTube)`}
            />
            <Textarea label="Mô tả" autosize minRows={4} value={desc} onChange={(e) => setDesc(e.currentTarget.value)} />
            <TagsInput
              label="Hashtag"
              value={tags}
              onChange={(v) => setTags(v.map((x) => x.replace(/^#/, '')))}
              description={`${tags.length} thẻ, TikTok nên dưới ${TIKTOK_TAG_SOFT_MAX}`}
              error={tiktokTags ? `TikTok nên dưới ${TIKTOK_TAG_SOFT_MAX} hashtag.` : undefined}
            />
            <Group>
              <Button variant="default" leftSection={<IconSparkles size={18} />} loading={suggest.isPending} onClick={() => suggest.mutate()}>
                Tạo lại giọng văn khác
              </Button>
            </Group>
          </Stack>
        </Card>

        <Stack gap="md">
          <Card padding={14}>
            <Title order={3} fz={17} mb="sm">
              Nền tảng
            </Title>
            <Stack gap="sm">
              {PLATFORMS.map((pl) => {
                const st = platforms?.find((x) => x.platform === pl);
                const r = result(pl);
                return (
                  <Box key={pl} p={10} style={{ border: '1px solid var(--line)', borderRadius: 9 }}>
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Checkbox
                        label={platformLabel[pl]}
                        checked={selected.includes(pl)}
                        onChange={(e) => {
                          const on = e.currentTarget.checked; // đọc trước: currentTarget = null trong hàm cập nhật
                          setSelected((s) => (on ? [...s, pl] : s.filter((x) => x !== pl)));
                        }}
                      />
                      {st?.connected ? <StatusPill tone="ok" label="Đã kết nối" /> : <StatusPill tone="bad" label="Token hết hạn" />}
                    </Group>
                    {r && (
                      <Text fz={14} mt={6} c={r.status === 'error' ? 'var(--bad)' : 'var(--ok)'}>
                        {r.status === 'ok' && (
                          <>
                            Đã đăng.{' '}
                            <Anchor href={r.url} target="_blank" fz={14}>
                              Xem bài (sandbox)
                            </Anchor>
                          </>
                        )}
                        {r.status === 'scheduled' && `Đã hẹn giờ đăng lúc ${new Date(r.scheduleAt!).toLocaleString('vi-VN')}.`}
                        {r.status === 'error' && r.error}
                      </Text>
                    )}
                    {!st?.connected && (
                      <Button mt={8} size="sm" variant="default" loading={reconnecting === pl} onClick={() => reconnect(pl)}>
                        Kết nối lại {platformLabel[pl]}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Card>
          <Card padding={14}>
            <Radio.Group label={<Text fw={700} fz={17}>Thời điểm</Text>} value={when} onChange={(v) => setWhen(v as 'now' | 'later')}>
              <Group mt="sm" gap="lg">
                <Radio value="now" label="Đăng ngay" />
                <Radio value="later" label="Hẹn giờ" />
              </Group>
            </Radio.Group>
            {when === 'later' && <TextInput mt="sm" type="datetime-local" aria-label="Thời điểm đăng" value={at} onChange={(e) => setAt(e.currentTarget.value)} />}
            {failed.length > 0 && (
              <Box mt="md">
                <Notice tone="warn">
                  {failed.map((f) => `${platformLabel[f.platform]}: ${f.error}`).join(' ')} Các nền tảng khác vẫn đăng bình thường.
                </Notice>
              </Box>
            )}
            <Button
              mt="md"
              fullWidth
              size="lg"
              disabled={!canPost}
              loading={publish.isPending}
              onClick={() =>
                publish.mutate({ platforms: selected, title: title.trim(), desc, tags, scheduleAt: when === 'later' ? new Date(at).toISOString() : undefined })
              }
            >
              Duyệt và đăng
            </Button>
          </Card>
        </Stack>
      </div>
      <Text fz={14} c="dimmed" mt="lg" ta="center">
        Demo chạy ở chế độ sandbox, không đăng thật.
      </Text>
    </>
  );
}
