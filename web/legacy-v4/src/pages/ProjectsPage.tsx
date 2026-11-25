import { Button, Card, Table, Text } from '@mantine/core';
import { useNavigate } from 'react-router';
import { useProjects } from '../lib/queries';
import { formatDateTime } from '../lib/time';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatusBadge } from '../components/common';

export function ProjectsPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Dự án" subtitle="Các lần tạo clip gần đây." />
      {isLoading && <LoadingBlock />}
      {error && <ErrorBlock error={error} onRetry={refetch} />}
      {data?.length === 0 && (
        <EmptyState
          title="Chưa có dự án nào"
          description="Chọn một phim trong thư viện để tạo clip đầu tiên."
          action={<Button onClick={() => navigate('/')}>Mở thư viện</Button>}
        />
      )}
      {!!data?.length && (
        <Card p={0}>
          <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Phim</Table.Th>
                <Table.Th>Đầu ra</Table.Th>
                <Table.Th>Chế độ</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th>Tạo lúc</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((p) => (
                <Table.Tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}`)}>
                  <Table.Td fw={500}>{p.vodTitle}</Table.Td>
                  <Table.Td>
                    {p.outputType === 'short' ? 'Video ngắn' : 'Video dài'} · {p.ratio}
                  </Table.Td>
                  <Table.Td>{p.mode === 'auto' ? 'Tự động' : 'Có duyệt'}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={p.status} />
                  </Table.Td>
                  <Table.Td>
                    <Text fz="sm" c="gray.6">
                      {formatDateTime(p.createdAt)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
