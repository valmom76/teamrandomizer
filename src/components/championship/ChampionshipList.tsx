import React from 'react';
import { Card, Table, Tag, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useChampionships } from '../../hooks/useChampionships';

const { Text } = Typography;

// Mapeamento de status para exibição em português e cores
const statusMap: Record<string, { label: string; color: string }> = {
  CREATED: { label: 'Não iniciado', color: 'orange' },
  IN_PROGRESS: { label: 'Em andamento', color: 'blue' },
  FINISHED: { label: 'Finalizado', color: 'green' },
};

export const ChampionshipList: React.FC = () => {
  const navigate = useNavigate();
  const { useList } = useChampionships();
  const { data, isLoading, error } = useList();

  if (isLoading) return <div style={{ color: '#fff' }}>Carregando...</div>;
  if (error) return <div style={{ color: '#f5222d' }}>Erro ao carregar campeonatos</div>;

  const columns = [
    { 
      title: 'Nome', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string) => <Text strong style={{ color: '#fff' }}>{name}</Text>
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status: string) => {
        const info = statusMap[status] || { label: status, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      } 
    },
    { title: 'Times', dataIndex: 'teamCount', key: 'teamCount' },
    { title: 'Grupos', dataIndex: 'groupsCount', key: 'groupsCount' },
    {
      title: 'Ações',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          ghost 
          onClick={() => navigate(`/championships/${record.id}`)}
          style={{ color: '#2bd96b', borderColor: '#2bd96b' }}
        >
          Detalhes
        </Button>
      ),
    },
  ];

  return (
    <Card 
      title={<span style={{ color: '#2bd96b', fontSize: 24, fontWeight: 'bold' }}>Campeonatos</span>}
      style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
      styles={{ header: { borderBottom: '1px solid #333' } }}
    >
      <Table 
        dataSource={data} 
        columns={columns} 
        rowKey="id"
        style={{ backgroundColor: '#1a1a1a' }}
        rowClassName={() => 'dark-row'}
      />
    </Card>
  );
};