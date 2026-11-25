import { useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Grid,
  Group,
  Image,
  SegmentedControl,
  Stack,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router';
import { BRAND } from '../app/brand';
import { api } from '../lib/api';
import { usePublish, useProject, useSuggestPosts } from '../lib/queries';
import { platformLabel, platformLimits } from '../lib/labels';
import { AiTag, EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/common';
import type { Platform, PostDraft } from '../types/domain';

const PLATFORMS: Platform[] = ['tiktok', 'youtube', 'facebook'];

function errorsOf(d: PostDraft): string[] {
  const lim = platformLimits[d.platform];
  const e: string[] = [];
  if (!d.title.trim()) e.push('Thiếu tiêu đề');
  if (d.title.length > lim.title) e.push(`Tiêu đề vượt ${lim.title} ký tự`);
  if (d.description.length > lim.description) e.push(`Mô tả vượt ${lim.description} ký tự`);
  if (d.hashtags.length > lim.hashtags) e.push(`Tối đa ${lim.hashtags} hashtag`);
  return e;
}

/** UC-H.1–H.3: gợi ý bài đăng → sửa → đăng (sandbox khi demo). */
export function PublishPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);
  const suggest = useSuggestPosts();
  const publish = usePublish();
  const [platforms, setPlatforms] = useState<string[]>(['tiktok', 'youtube']);
  // Bản sửa tại chỗ, phủ lên bản nháp từ server; xóa sau khi gợi ý lại hoặc đăng
  const [edits, setEdits] = useState<Partial<Record<Platform, PostDraft>>>({});
  const [active, setActive] = useState<Platform>('tiktok');

  if (isLoading) return <LoadingBlock />;
  if (error) return <ErrorBlock error={error} />;
  if (!project) return null;

  if (project.status !== 'ready' && project.status !== 'published') {
    return (
      <EmptyState
        title="Chưa thể đăng bài"
        description="Cần chốt & xuất clip trước khi đăng."
        action={<Button onClick={() => navigate(`/projects/${project.id}`)}>Về dự án</Button>}
      />
    );
  }

  const drafts: Partial<Record<Platform, PostDraft>> = {};
  for (const p of project.posts ?? []) drafts[p.platform] = p.status === 'published' ? p : (edits[p.platform] ?? p);
  const list = PLATFORMS.filter((p) => drafts[p]);
  const current = (drafts[active] ?? drafts[list[0]])!;
  const update = (d: PostDraft) => setEdits((s) => ({ ...s, [d.platform]: d }));
  const ready = list.filter((p) => platforms.includes(p) && drafts[p]!.status !== 'published' && errorsOf(drafts[p]!).length === 0);

  const doPublish = async () => {
    for (const p of ready) await api.savePost(project.id, drafts[p]!);
    publish.mutate({ projectId: project.id, platforms: ready }, { onSuccess: () => setEdits({}) });
  };

  return (
    <>
      <PageHeader
        title={`Đăng bài · ${project.vodTitle}`}
        subtitle="AI gợi ý tiêu đề, mô tả, hashtag theo từng nền tảng. Sửa trực tiếp rồi đăng."
        actions={
          <Button variant="default" onClick={() => navigate(`/projects/${project.id}`)}>
            Về dự án
          </Button>
        }
      />
      <Alert color="blue" variant="light" mb="md">
        Bản demo đăng ở chế độ <b>sandbox</b>: không đăng lên tài khoản thật, chỉ trả về link giả lập.
      </Alert>

      <Card mb="md">
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm">
            <Text fw={600} fz="sm">
              Nền tảng
            </Text>
            <Chip.Group multiple value={platforms} onChange={setPlatforms}>
              <Group gap={6}>
                {PLATFORMS.map((p) => (
                  <Chip key={p} value={p} size="sm">
                    {platformLabel[p]}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          </Group>
          <Button
            variant="light"
            color="blue"
            leftSection={<IconSparkles size={16} />}
            loading={suggest.isPending}
            disabled={!platforms.length}
            onClick={() => {
              suggest.mutate({ projectId: project.id, platforms: platforms as Platform[] }, { onSuccess: () => setEdits({}) });
              setActive(platforms[0] as Platform);
            }}
          >
            {list.length ? 'Gợi ý lại' : 'AI gợi ý nội dung'}
          </Button>
        </Group>
      </Card>

      {!list.length ? (
        <EmptyState title="Chưa có bản nháp" description="Chọn nền tảng rồi bấm “AI gợi ý nội dung”." />
      ) : (
        <Grid gap="lg">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md">
              <SegmentedControl
                value={current.platform}
                onChange={(v) => setActive(v as Platform)}
                data={list.map((p) => ({
                  value: p,
                  label: `${platformLabel[p]}${drafts[p]!.status === 'published' ? ' ✓' : errorsOf(drafts[p]!).length ? ' ⚠' : ''}`,
                }))}
              />
              <PostEditor draft={current} onChange={update} />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="md">
              <PostPreview draft={current} />
              <Card>
                <Stack gap="xs">
                  <Text fw={600} fz="sm">
                    Đăng
                  </Text>
                  {list.map((p) => {
                    const d = drafts[p]!;
                    const errs = errorsOf(d);
                    return (
                      <Group key={p} justify="space-between" wrap="nowrap">
                        <Text fz="sm">{platformLabel[p]}</Text>
                        {d.status === 'published' ? (
                          <Anchor href={d.url} target="_blank" fz="xs">
                            Đã đăng (sandbox)
                          </Anchor>
                        ) : errs.length ? (
                          <Text fz="xs" c="red.7">
                            {errs[0]}
                          </Text>
                        ) : platforms.includes(p) ? (
                          <Badge color="green" variant="light">
                            Sẵn sàng
                          </Badge>
                        ) : (
                          <Badge color="gray">Không chọn</Badge>
                        )}
                      </Group>
                    );
                  })}
                  <Button mt="xs" leftSection={<IconCheck size={16} />} disabled={!ready.length} loading={publish.isPending} onClick={doPublish}>
                    Duyệt & đăng {ready.length ? `(${ready.length})` : ''}
                  </Button>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      )}
    </>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return (
    <Text fz="xs" c={n > max ? 'red.7' : 'gray.6'} className="mono">
      {n}/{max}
    </Text>
  );
}

function PostEditor({ draft, onChange }: { draft: PostDraft; onChange: (d: PostDraft) => void }) {
  const lim = platformLimits[draft.platform];
  const locked = draft.status === 'published';
  return (
    <Card>
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap={6}>
            <AiTag />
            <Text fw={600} fz="sm">
              Phương án gợi ý
            </Text>
          </Group>
          <SegmentedControl
            size="xs"
            disabled={locked}
            value={String(draft.chosen)}
            onChange={(v) => {
              const o = draft.options[Number(v)];
              onChange({ ...draft, chosen: Number(v), title: o.title, description: o.description, hashtags: o.hashtags });
            }}
            data={draft.options.map((_, i) => ({ value: String(i), label: `${i + 1}` }))}
          />
        </Group>
        <TextInput
          label="Tiêu đề"
          disabled={locked}
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.currentTarget.value })}
          rightSection={<Counter n={draft.title.length} max={lim.title} />}
          rightSectionWidth={64}
          error={draft.title.length > lim.title ? `Vượt giới hạn ${lim.title} ký tự của ${platformLabel[draft.platform]}` : undefined}
        />
        <Box>
          <Textarea
            label="Mô tả"
            disabled={locked}
            autosize
            minRows={3}
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.currentTarget.value })}
            error={draft.description.length > lim.description ? `Vượt giới hạn ${lim.description} ký tự` : undefined}
          />
          <Group justify="flex-end" mt={2}>
            <Counter n={draft.description.length} max={lim.description} />
          </Group>
        </Box>
        <TagsInput
          label="Hashtag"
          disabled={locked}
          value={draft.hashtags}
          onChange={(v) => onChange({ ...draft, hashtags: v.map((x) => x.replace(/^#/, '')) })}
          description={`Tối đa ${lim.hashtags}`}
          error={draft.hashtags.length > lim.hashtags ? `Đang có ${draft.hashtags.length} hashtag` : undefined}
        />
      </Stack>
    </Card>
  );
}

function PostPreview({ draft }: { draft: PostDraft }) {
  return (
    <Card>
      <Text fz="xs" c="gray.6" mb="xs">
        Xem trước · {platformLabel[draft.platform]} (mô phỏng)
      </Text>
      <Box bg="var(--player-bg)" h={160} style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Image src={BRAND.logoUrl} alt={BRAND.logoAlt} w={120} fit="contain" />
      </Box>
      <Text fw={600} mt="sm" lineClamp={2}>
        {draft.title || '(chưa có tiêu đề)'}
      </Text>
      <Text fz="sm" c="gray.7" lineClamp={3}>
        {draft.description}
      </Text>
      <Text fz="sm" c="blue.7" mt={4}>
        {draft.hashtags.map((h) => `#${h}`).join(' ')}
      </Text>
    </Card>
  );
}
