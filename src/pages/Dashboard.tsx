import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Typography, Statistic, Button, Spin, Tag, Modal, Table, Space, Avatar, Tooltip
} from 'antd';
import {
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  CloseOutlined,
  CrownOutlined,
  StarFilled,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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
  tooltip?: string;
}> = ({ icon, title, value, color, onClick, tooltip }) => (
  <Card
    style={{
      borderLeft: `4px solid ${color}`,
      backgroundColor: '#1a1a1a',
      borderColor: '#333',
      borderRadius: 8,
      cursor: onClick ? 'pointer' : 'default',
      height: '100%',
    }}
    onClick={onClick}
  >
    <Statistic
      title={
        <span style={{ color: '#aaa', fontSize: 16 }}>
          {title}
          {tooltip && (
            <Tooltip title={tooltip}>
              <InfoCircleOutlined style={{ marginLeft: 8, color: '#888' }} />
            </Tooltip>
          )}
        </span>
      }
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

  const planName = auth.planName || 'Free';
  const features = auth.features || [];
  const isFreePlan = planName === 'Free';
  const isElitePlan = planName === 'Elite';

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
        const inactiveList: InactivePlayer[] = inactiveRes.data.map((item: any) => ({
          name: item.name,
          lastParticipation: item.lastParticipation,
        }));
        setStats({
          finishedChampionships: finished,
          activePlayers: playersRes.data.length,
          inactivePlayers: inactiveList.length,
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

  // Atualiza o plano dinamicamente após possível mudança
  useEffect(() => {
    const updatePlan = async () => {
      try {
        const { data } = await http.get('/checkout/status');
        if (data.active && data.planName !== authStore.get().planName) {
          authStore.set({ ...authStore.get(), planName: data.planName });
        }
      } catch {}
    };
    updatePlan();
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

  const planColors: Record<string, string> = {
    Free: '#01ff69',
    Pro: '#1890ff',
    Elite: '#ff9f1a',
  };

  const planLimits: Record<string, { players: string; championships: string }> = {
    Free: { players: '20 jogadores', championships: 'Sem campeonatos' },
    Pro: { players: 'Ilimitados', championships: 'Até 2 campeonatos' },
    Elite: { players: 'Ilimitados', championships: 'Ilimitados' },
  };
  const limits = planLimits[planName] || planLimits.Free;

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 1400, margin: '0 auto' }}>
      {/* Saudação com avatar - responsivo */}
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 32 }}>
        <Col xs={24} sm={6} md={4} lg={3} style={{ textAlign: 'center' }}>
          <Avatar
            size={{ xs: 48, sm: 64, md: 64 }}
            style={{
              backgroundColor: auth.primaryColor || '#01ff69',
              fontSize: 28,
              fontWeight: 'bold',
            }}
          >
            {auth.userName?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
        </Col>
        <Col xs={24} sm={18} md={20} lg={21}>
          <Title
            level={2}
            style={{
              color: '#01ff69',
              marginBottom: 4,
              fontSize: 'clamp(18px, 5vw, 28px)',
            }}
          >
            Seja bem vindo(a), {auth.userName?.toUpperCase()}
          </Title>
          <Space wrap size={[8, 8]}>
            <Tag color={planColors[planName] || '#01ff69'} style={{ fontSize: 14, padding: '2px 12px' }}>
              <StarFilled style={{ marginRight: 4 }} /> Plano {planName}
            </Tag>
            {auth.emailVerified ? (
              <Tag color="green" style={{ fontSize: 12 }}>E-mail verificado</Tag>
            ) : (
              <Tag color="orange" style={{ fontSize: 12 }}>E-mail não verificado</Tag>
            )}
          </Space>
        </Col>
      </Row>

      {/* Card do plano atual - responsivo */}
      <Card
        style={{
          backgroundColor: '#1a1a1a',
          borderColor: planColors[planName] || '#ff9f1a',
          borderLeft: `4px solid ${planColors[planName] || '#ff9f1a'}`,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} sm={16} md={18}>
            <Space orientation="vertical" size={4}>
              <Text style={{ color: planColors[planName], fontWeight: 'bold', fontSize: 'clamp(14px, 2.5vw, 16px)' }}>
                <CrownOutlined /> Plano {planName}
                {isFreePlan ? ' — Recursos Limitados' : ''}
              </Text>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'clamp(12px, 1.8vw, 13px)' }}>
                <Text style={{ color: '#aaa' }}>🏐 {limits.players}</Text>
                <Text style={{ color: '#aaa' }}>🏆 {limits.championships}</Text>
                <Text style={{ color: '#aaa' }}>✅ {features.length} funcionalidades</Text>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={6} style={{ textAlign: 'right' }}>
            {isFreePlan ? (
              <Button
                type="primary"
                icon={<ArrowUpOutlined />}
                block
                style={{
                  backgroundColor: '#ff9f1a',
                  borderColor: '#ff9f1a',
                  color: '#000',
                  fontWeight: 'bold',
                  height: 44,
                  fontSize: 14,
                }}
                onClick={() => navigate('/upgrade')}
              >
                Fazer Upgrade
              </Button>
            ) : (
              <Space orientation="vertical" style={{ width: '100%' }} size={8}>
                <Button
                  type="default"
                  icon={<ArrowDownOutlined />}
                  block
                  style={{ borderColor: '#f5222d', color: '#f5222d', fontWeight: 'bold', height: 40 }}
                  onClick={() => navigate('/upgrade')}
                >
                  Gerenciar Plano
                </Button>
                {!isElitePlan && (
                  <Button
                    type="primary"
                    icon={<ArrowUpOutlined />}
                    block
                    style={{ backgroundColor: '#ff9f1a', borderColor: '#ff9f1a', color: '#000', fontWeight: 'bold', height: 40 }}
                    onClick={() => navigate('/upgrade')}
                  >
                    Upgrade p/ Elite
                  </Button>
                )}
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {/* Cards principais - sempre em grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <StatCard icon={<TrophyOutlined />} title="CAMPEONATOS FINALIZADOS" value={stats.finishedChampionships} color="#01ff69" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard icon={<UserOutlined />} title="ATLETAS ATIVOS" value={stats.activePlayers} color="#faad14" tooltip={limits.players} />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            icon={<WarningOutlined />}
            title="AUSENTES >30 DIAS"
            value={stats.inactivePlayers}
            color="#f5222d"
            onClick={() => setInactiveModalOpen(true)}
          />
        </Col>
      </Row>

      {/* Ações rápidas - grid responsivo */}
      <Row gutter={[12, 12]} style={{ marginBottom: 32 }}>
        {features.includes('campeonatos') && (
          <Col xs={12} sm={6} md={6}>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigate('/manual-teams')}
              block
              style={{ backgroundColor: '#01ff69', borderColor: '#01ff69', color: '#1a1a1a', fontWeight: 'bold', height: 48, whiteSpace: 'normal' }}
            >
              CRIAR CAMPEONATO
            </Button>
          </Col>
        )}
        <Col xs={12} sm={6} md={6}>
          <Button
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/generator')}
            block
            style={{ borderColor: '#01ff69', color: '#01ff69', fontWeight: 'bold', height: 48, whiteSpace: 'normal' }}
          >
            TIMES AVULSOS
          </Button>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Button
            size="large"
            icon={<UserOutlined />}
            onClick={() => navigate('/players')}
            block
            style={{ borderColor: '#faad14', color: '#faad14', fontWeight: 'bold', height: 48 }}
          >
            ATLETAS
          </Button>
        </Col>
        <Col xs={12} sm={6} md={6}>
          <Button
            size="large"
            icon={<SettingOutlined />}
            onClick={() => navigate('/skills')}
            block
            style={{ borderColor: '#1890ff', color: '#1890ff', fontWeight: 'bold', height: 48 }}
          >
            SKILLS
          </Button>
        </Col>
      </Row>

      {/* Últimos campeonatos - tabela responsiva */}
      <Card
        title={<span style={{ color: '#01ff69', fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 'bold' }}>ÚLTIMOS CAMPEONATOS</span>}
        style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
        styles={{ header: { borderBottom: '1px solid #333' } }}
      >
        {championships.length > 0 ? (
          championships.map((champ) => (
            <div
              key={champ.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #333',
                padding: '16px 0',
                cursor: 'pointer',
                flexWrap: 'wrap',
                gap: 8,
              }}
              onClick={() => navigate(`/championships/${champ.id}`)}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <Text strong style={{ color: '#fff', fontSize: 'clamp(16px, 2vw, 18px)' }}>{champ.name}</Text>
                <div>
                  <Text style={{ color: '#aaa', fontSize: 'clamp(12px, 1.5vw, 14px)' }}>
                    {champ.teamCount} times · {champ.groupsCount} grupos
                  </Text>
                  <br />
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    {new Date(champ.createdAt).toLocaleDateString()}
                  </Text>
                </div>
              </div>
              <Tag color={statusColor[champ.status]} style={{ fontSize: 14, padding: '4px 12px' }}>
                {statusLabel[champ.status]}
              </Tag>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: '#aaa' }}>Nenhum campeonato</div>
        )}
      </Card>

      {/* Modal de inativos */}
      <Modal
        title={<span style={{ color: '#f5222d' }}>Jogadores Inativos (mais de 30 dias)</span>}
        open={inactiveModalOpen}
        onCancel={() => setInactiveModalOpen(false)}
        footer={null}
        width="min(90vw, 600px)"
        styles={{ body: { backgroundColor: '#1a1a1a' } }}
        closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
      >
        <Table
          dataSource={inactiveList}
          rowKey="name"
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Nome', dataIndex: 'name' },
            {
              title: 'Última participação',
              dataIndex: 'lastParticipation',
              render: (val: string | null) => (
                <span style={{ color: val ? '#aaa' : '#f5222d' }}>{formatTimeAgo(val)}</span>
              ),
            },
          ]}
          pagination={{ pageSize: 10, responsive: true }}
          style={{ backgroundColor: '#1a1a1a' }}
          rowClassName={() => 'dark-row'}
        />
      </Modal>
    </div>
  );
};