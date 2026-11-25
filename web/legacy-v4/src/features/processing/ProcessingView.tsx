import { Alert, Badge, Button, Card, Group, Progress, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconLoader2, IconPlayerStop, IconRefresh } from '@tabler/icons-react';
import { useCancelProject, useRetryStep } from '../../lib/queries';
import { phaseTitle, stepLabel, stepStatusColor, stepStatusLabel } from '../../lib/labels';
import { formatDuration } from '../../lib/time';
import { RUNNING_STATUSES, STEP_PHASE, type Phase, type Project, type Step } from '../../types/domain';

const PHASES: Phase[] = ['video', 'audio', 'export'];

export function ProcessingView({ project }: { project: Project }) {
  const cancel = useCancelProject();
  const retry = useRetryStep();
  const running = RUNNING_STATUSES.includes(project.status);
  const failed = project.steps.find((s) => s.status === 'error');
  // chỉ tính các giai đoạn đã/đang chạy
  const relevant = project.steps.filter((s) => s.status !== 'pending' || STEP_PHASE[s.name] === project.phase);
  const overall = Math.round(
    (relevant.reduce((sum, s) => sum + (s.status === 'done' ? 100 : s.progress), 0) / Math.max(1, relevant.length * 100)) * 100,
  );

  return (
    <Stack gap="md" maw={760}>
      <Card>
        <Group justify="space-between" mb="xs">
          <Text fw={600}>{phaseTitle[project.phase]}</Text>
          <Text className="mono" c="gray.7">
            {overall}%
          </Text>
        </Group>
        <Progress value={overall} color={failed ? 'red' : running ? 'blue' : 'green'} size="md" animated={running} />
        <Text fz="xs" c="gray.6" mt="xs">
          {project.mode === 'auto'
            ? 'Chế độ tự động: chạy liền video → âm thanh & phụ đề → xuất.'
            : project.phase === 'video'
              ? 'Âm thanh và phụ đề sẽ được thêm sau khi bạn chốt video.'
              : 'Đang xử lý theo yêu cầu, xong sẽ quay lại màn xem trước.'}
          {project.variants.length > 1 && project.phase === 'video' && ` Đang tạo ${project.variants.length} phương án, dùng chung kết quả phân tích.`}
        </Text>
      </Card>

      {failed && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title={`Bước "${stepLabel[failed.name]}" bị lỗi`}>
          <Stack gap="xs">
            <Text fz="sm">{failed.error}</Text>
            <Group>
              <Button
                size="xs"
                color="red"
                variant="white"
                leftSection={<IconRefresh size={14} />}
                loading={retry.isPending}
                onClick={() => retry.mutate({ id: project.id, step: failed.name })}
              >
                Chạy lại bước này
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {project.status === 'cancelled' && (
        <Alert color="gray" title="Dự án đã bị hủy">
          Kết quả các bước đã xong vẫn được giữ.
        </Alert>
      )}

      {PHASES.map((ph) => {
        const steps = project.steps.filter((s) => STEP_PHASE[s.name] === ph);
        const allDone = steps.every((s) => s.status === 'done');
        const waiting = steps.every((s) => s.status === 'pending');
        return (
          <Card key={ph} p={0}>
            <Group px="md" py="xs" justify="space-between" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Text fw={600} fz="sm">
                {phaseTitle[ph]}
              </Text>
              {allDone ? (
                <Badge color="green">Xong</Badge>
              ) : waiting ? (
                <Badge color="gray">{ph === 'audio' && project.mode === 'review' ? 'Sau khi chốt video' : ph === 'export' && project.mode === 'review' ? 'Sau khi chốt & xuất' : 'Chờ'}</Badge>
              ) : (
                <Badge color={steps.some((s) => s.status === 'error') ? 'red' : 'blue'}>
                  {steps.some((s) => s.status === 'error') ? 'Lỗi' : 'Đang chạy'}
                </Badge>
              )}
            </Group>
            {steps.map((s, i) => (
              <StepRow key={s.name} step={s} last={i === steps.length - 1} />
            ))}
          </Card>
        );
      })}

      <SimpleGrid cols={2}>
        <Card>
          <Text fz="xs" c="gray.6">
            Thời gian xử lý
          </Text>
          <Text fw={600} fz="lg" className="mono">
            {formatDuration(project.metrics.totalSec)}
          </Text>
        </Card>
        <Card>
          <Text fz="xs" c="gray.6">
            Chi phí ước tính
          </Text>
          <Text fw={600} fz="lg" className="mono">
            ${project.metrics.costUsd.toFixed(3)}
          </Text>
        </Card>
      </SimpleGrid>

      {running && (
        <Group>
          <Button variant="subtle" color="gray" leftSection={<IconPlayerStop size={16} />} onClick={() => cancel.mutate(project.id)} loading={cancel.isPending}>
            Hủy dự án
          </Button>
        </Group>
      )}
    </Stack>
  );
}

function StepRow({ step, last }: { step: Step; last: boolean }) {
  const color = stepStatusColor[step.status];
  const icon =
    step.status === 'done' ? <IconCheck size={16} /> : step.status === 'running' ? <IconLoader2 size={16} /> : step.status === 'error' ? <IconAlertTriangle size={16} /> : null;
  return (
    <Group px="md" py="sm" gap="md" wrap="nowrap" style={{ borderBottom: last ? undefined : '1px solid var(--mantine-color-gray-2)' }}>
      <ThemeIcon color={color} variant={step.status === 'pending' ? 'outline' : 'light'} radius="xl" size={28}>
        {icon}
      </ThemeIcon>
      <Text fw={500} w={140}>
        {stepLabel[step.name]}
      </Text>
      <Progress value={step.status === 'done' ? 100 : step.progress} color={color} style={{ flex: 1 }} size="sm" animated={step.status === 'running'} />
      <Badge color={color} w={92}>
        {step.status === 'running' ? `${step.progress}%` : stepStatusLabel[step.status]}
      </Badge>
    </Group>
  );
}
