import React from 'react';
import { Card, Table, Tag, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useChampionships } from '../../hooks/useChampionships';

const { Text } = Typography;

const statusMap: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Não iniciado', color: 'orange' },
  IN_PROGRESS: { label: 'Em andamento', color: 'blue' },
  FINISHED: { label: 'Finalizado', color: 'green' },
};

export const ChampionshipList: React.FC = () => {
  const navigate = useNavigate();
  const { useList } = useChampionships();
  const { data, isLoading, error } = useList();

  if (isLoading) return <div style={{ color: '#fff', textAlign: 'center', padding: 40 }}>Carregando...</div>;
  if (error) return <div style={{ color: '#f5222d', textAlign: 'center', padding: 40 }}>Erro ao carregar campeonatos</div>;

  const columns = [
    {
      title: 'Nome',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true,
      render: (name: string) => <Text strong style={{ color: '#fff' }}>{name}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        const info = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: 'Times',
      dataIndex: 'teamCount',
      key: 'teamCount',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Grupos',
      dataIndex: 'groupsCount',
      key: 'groupsCount',
      width: 80,
      align: 'center' as const,
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          ghost
          onClick={() => navigate(`/championships/${record.id}`)}
          style={{ color: '#01ff69', borderColor: '#01ff69' }}
        >
          Detalhes
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 1200, margin: '0 auto' }}>
      <Card
        title={<span style={{ color: '#01ff69', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 'bold' }}>Campeonatos</span>}
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
        styles={{
          header: { borderBottom: '1px solid #333' },
          body: { padding: 'clamp(12px, 3vw, 24px)' },
        }}
      >
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          scroll={{ x: 'max-content' }}
          pagination={{ responsive: true, pageSize: 10, showSizeChanger: false }}
          style={{ backgroundColor: '#1a1a1a' }}
          rowClassName={() => 'dark-row'}
        />
      </Card>
    </div>
  );
};