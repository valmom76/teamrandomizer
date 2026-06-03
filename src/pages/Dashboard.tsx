import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Button, Spin, Tag, List, Modal, Table
} from 'antd';
import {
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { http } from '../api/http';
import { authStore } from '../auth/store';

const { Title, Text } = Typography;

interface InactivePlayer {
  name: string;
  lastParticipation: string | null;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
  onClick?: () => void;
}> = ({ icon, title, value, color, onClick }) => (
  <Card
    style={{
      borderLeft: `4px solid ${color}`,
      backgroundColor: '#1a1a1a',
      borderColor: '#333',
      borderRadius: 8,
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
  >
    <Statistic
      title={<span style={{ color: '#aaa', fontSize: 16 }}>{title}</span>}
      value={value}
      styles={{ content: { color, fontSize: 36, fontWeight: 'bold' } }}
      prefix={icon}
    />
  </Card>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = authStore.get();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    finishedChampionships: 0,
    activePlayers: 0,
    inactivePlayers: 0,
  });
  const [inactiveList, setInactiveList] = useState<InactivePlayer[]>([]);
  const [inactiveModalOpen, setInactiveModalOpen] = useState(false);
  const [championships, setChampionships] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [champsRes, playersRes, inactiveRes] = await Promise.all([
          http.get('/championships'),
          http.get('/players'),
          http.get('/dashboard/inactive-players'),
        ]);

        const allChampionships = champsRes.data;
        const finished = allChampionships.filter((c: any) => c.status === 'FINISHED').length;
        const activePlayers = playersRes.data.length;
        const inactiveList: InactivePlayer[] = inactiveRes.data.map((item: any) => ({
          name: item.name,
          lastParticipation: item.lastParticipation,
        }));
        const inactiveCount = inactiveList.length;

        setStats({
          finishedChampionships: finished,
          activePlayers,
          inactivePlayers: inactiveCount,
        });
        setInactiveList(inactiveList);

        const sorted = [...allChampionships].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setChampionships(sorted.slice(0, 5));
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca participou';
    const now = new Date();
    const then = new Date(dateStr);
    const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    return `${diffDays} dias atrás`;
  };

  const statusColor: Record<string, string> = {
    CREATED: 'orange',
    IN_PROGRESS: 'blue',
    FINISHED: 'green',
  };
  const statusLabel: Record<string, string> = {
    CREATED: 'Em criação',
    IN_PROGRESS: 'Em andamento',
    FINISHED: 'Finalizado',
  };

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  return (
    <div style={{ padding: '24px' }}>
      {/* Saudação */}
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ color: '#2bd96b', marginBottom: 8 }}>
          Seja bem vindo(a), {auth.userName?.toUpperCase()}
        </Title>
        <Text style={{ color: '#aaa', fontSize: 16 }}>
          Resumo geral da sua organização esportiva
        </Text>
      </div>

      {/* Cards principais */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} md={8}>
          <StatCard
            icon={<TrophyOutlined style={{ fontSize: 28 }} />}
            title="CAMPEONATOS FINALIZADOS"
            value={stats.finishedChampionships}
            color="#2bd96b"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatCard
            icon={<UserOutlined style={{ fontSize: 28 }} />}
            title="ATLETAS ATIVOS"
            value={stats.activePlayers}
            color="#faad14"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatCard
            icon={<WarningOutlined style={{ fontSize: 28 }} />}
            title="ATLETAS AUSENTES (>30 DIAS)"
            value={stats.inactivePlayers}
            color="#f5222d"
            onClick={() => setInactiveModalOpen(true)}
          />
        </Col>
      </Row>

      {/* Ações rápidas */}
      <div style={{ marginBottom: 32, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate('/manual-teams')}
          style={{
            backgroundColor: '#2bd96b',
            borderColor: '#2bd96b',
            color: '#1a1a1a',
            fontWeight: 'bold',
            borderRadius: 6,
            height: 48,
            fontSize: 16,
          }}
        >
          CRIAR NOVO CAMPEONATO
        </Button>
        <Button
          size="large"
          icon={<ThunderboltOutlined />}
          onClick={() => navigate('/generator')}
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: '#2bd96b',
            color: '#2bd96b',
            fontWeight: 'bold',
            borderRadius: 6,
            height: 48,
            fontSize: 16,
          }}
        >
          GERAR TIMES AVULSOS
        </Button>
        <Button
          size="large"
          icon={<UserOutlined />}
          onClick={() => navigate('/players')}
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: '#faad14',
            color: '#faad14',
            fontWeight: 'bold',
            borderRadius: 6,
            height: 48,
            fontSize: 16,
          }}
        >
          ATLETAS
        </Button>
        <Button
          size="large"
          icon={<SettingOutlined />}
          onClick={() => navigate('/skills')}
          style={{
            backgroundColor: '#1a1a1a',
            borderColor: '#1890ff',
            color: '#1890ff',
            fontWeight: 'bold',
            borderRadius: 6,
            height: 48,
            fontSize: 16,
          }}
        >
          SKILLS
        </Button>
      </div>

      {/* Últimos campeonatos */}
      <Card
        title={
          <span style={{ color: '#2bd96b', fontSize: 20, fontWeight: 'bold' }}>
            ÚLTIMOS CAMPEONATOS
          </span>
        }
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: 8,
        }}
        styles={{ header: { borderBottom: "1px solid #333" } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {championships.length > 0 ? (
            championships.map((champ: any) => (
              <div
                key={champ.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #333',
                  padding: '16px 0',
                  cursor: 'pointer',
                }}
                onClick={() => navigate(`/championships/${champ.id}`)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text strong style={{ color: '#fff', fontSize: 18 }}>
                    {champ.name}
                  </Text>
                  <div>
                    <Text style={{ color: '#aaa' }}>
                      {champ.teamCount} times · {champ.groupsCount} grupos
                    </Text>
                    <br />
                    <Text style={{ color: '#888', fontSize: 12 }}>
                      Criado em {new Date(champ.createdAt).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
                <Tag
                  color={statusColor[champ.status]}
                  style={{ fontSize: 14, padding: '4px 12px', alignSelf: 'center' }}
                >
                  {statusLabel[champ.status]}
                </Tag>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>
              Nenhum campeonato encontrado
            </div>
          )}
        </div>
      </Card>

      <Modal
        title={<span style={{ color: '#f5222d' }}>Jogadores Inativos (mais de 30 dias)</span>}
        open={inactiveModalOpen}
        onCancel={() => setInactiveModalOpen(false)}
        footer={null}
        width={600}
        style={{ top: 20 }}
        styles={{ body: { backgroundColor: '#1a1a1a' }}}
        closeIcon={<CloseOutlined style={{ color: '#2bd96b' }} />}
      >
        <Table
          dataSource={inactiveList}
          rowKey="name"
          columns={[
            { title: 'Nome', dataIndex: 'name', key: 'name' },
            {
              title: 'Última participação',
              dataIndex: 'lastParticipation',
              key: 'lastParticipation',
              render: (val: string | null) => (
                <span style={{ color: val ? '#aaa' : '#f5222d' }}>
                  {formatTimeAgo(val)}
                </span>
              ),
            },
          ]}
          pagination={{ pageSize: 10 }}
          style={{ backgroundColor: '#1a1a1a' }}
          rowClassName={() => 'dark-row'}
        />
      </Modal>
    </div>
  );
};