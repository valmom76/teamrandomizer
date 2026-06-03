import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Typography, Statistic, Table, Input, Select, Space, Tag, Modal, Spin, Button } from 'antd';
import {
  TrophyOutlined,
  UserOutlined,
  StarOutlined,
  RiseOutlined,
  SearchOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { http } from '../api/http';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const { Title } = Typography;

interface PlayerPerformance {
  id: string;
  name: string;
  sex: string;
  overall: number;
  nivel: string;
  bestSkill: string;
  worstSkill: string;
  skills: Record<string, number>;
  lastUpdate: string;
}

const LEVEL_COLORS: Record<string, string> = {
  Elite: '#f59e0b',
  'Muito alto': '#38bdf8',
  Alto: '#22c55e',
  Médio: '#a78bfa',
  'A desenvolver': '#ef4444',
  Iniciante: '#fb7185',
};

const SKILL_COLORS: Record<number, string> = {
  5: '#10b981',
  4: '#38bdf8',
  3: '#a78bfa',
  2: '#f59e0b',
  1: '#ef4444',
  0: '#6b7280',
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
}> = ({ icon, title, value, color }) => (
  <Card
    style={{
      borderLeft: `4px solid ${color}`,
      backgroundColor: '#1a1a1a',
      borderColor: '#333',
      borderRadius: 8,
    }}
  >
    <Statistic
      title={<span style={{ color: '#aaa', fontSize: 16 }}>{title}</span>}
      value={value}
      valueStyle={{ color, fontSize: 36, fontWeight: 'bold' }}
      prefix={icon}
    />
  </Card>
);

export default function PlayerPerformancePage() {
  const [data, setData] = useState<PlayerPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string | undefined>(undefined);
  const [sortSkill, setSortSkill] = useState<string>('overall');
  const [evolutionData, setEvolutionData] = useState<any[]>([]);
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [evolutionSkills, setEvolutionSkills] = useState<string[]>([]);
  const [evolutionLoading, setEvolutionLoading] = useState(false);

  useEffect(() => {
    http
      .get('/players/performance')
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleViewEvolution = async (playerId: string) => {
    setEvolutionLoading(true);
    try {
      const res = await http.get(`/players/${playerId}/evolution`);
      const evolutions = res.data as { skillName: string; points: { date: string; rating: number }[] }[];

      const dateSet = new Set<string>();
      const skillsSet = new Set<string>();
      evolutions.forEach(skill => {
        skillsSet.add(skill.skillName);
        skill.points.forEach(p => dateSet.add(p.date));
      });

      const sortedDates = Array.from(dateSet).sort();
      const skillsArray = Array.from(skillsSet);

      const chartData = sortedDates.map(dateStr => {
        const point: any = {
          date: new Date(dateStr).toLocaleDateString('pt-BR'),
        };
        evolutions.forEach(skill => {
          const found = skill.points.find(p => p.date === dateStr);
          point[skill.skillName] = found ? found.rating : null;
        });
        return point;
      });

      setEvolutionSkills(skillsArray);
      setEvolutionData(chartData);
      setEvolutionModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setEvolutionLoading(false);
    }
  };

  const filtered = data
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (!levelFilter || p.nivel === levelFilter)
    )
    .sort((a, b) => {
      if (sortSkill === 'overall') return b.overall - a.overall;
      const aVal = a.skills[sortSkill] || 0;
      const bVal = b.skills[sortSkill] || 0;
      return bVal - aVal || b.overall - a.overall;
    });

  const kpis = {
    total: data.length,
    avgOverall: data.length
      ? Math.round(
          (data.reduce((s, p) => s + p.overall, 0) / data.length) * 10
        ) / 10
      : 0,
    elite: data.filter((p) => p.nivel === 'Elite').length,
    developing: data.filter(
      (p) => p.nivel === 'A desenvolver' || p.nivel === 'Iniciante'
    ).length,
  };

  const allSkills = data.length > 0 ? Object.keys(data[0].skills) : [];

  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: any, __: any, index: number) => (
        <span
          style={{
            fontWeight: 800,
            color:
              index < 3
                ? ['#f59e0b', '#9ca3af', '#cd7f32'][index]
                : '#aaa',
          }}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Atleta',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#fff', fontWeight: 600 }}>{name}</span>
      ),
    },
    {
      title: 'Overall',
      dataIndex: 'overall',
      key: 'overall',
      sorter: (a: PlayerPerformance, b: PlayerPerformance) =>
        a.overall - b.overall,
      render: (val: number) => (
        <Tag color={val >= 4 ? 'green' : val >= 3 ? 'gold' : 'red'}>
          {val.toFixed(1)}
        </Tag>
      ),
    },
    ...allSkills.map((skill) => ({
      title: skill,
      dataIndex: ['skills', skill],
      key: skill,
      render: (val: number) =>
        val != null ? (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 6,
              backgroundColor: `${SKILL_COLORS[val] || '#374151'}22`,
              color: SKILL_COLORS[val] || '#fff',
              fontWeight: 700,
            }}
          >
            {val}
          </span>
        ) : (
          <span style={{ color: '#4b5563' }}>—</span>
        ),
    })),
    {
      title: 'Nível',
      dataIndex: 'nivel',
      key: 'nivel',
      render: (nivel: string) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 12px',
            borderRadius: 999,
            backgroundColor: `${LEVEL_COLORS[nivel]}22`,
            border: `1px solid ${LEVEL_COLORS[nivel]}55`,
            color: LEVEL_COLORS[nivel],
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {nivel}
        </span>
      ),
    },
    {
      title: 'Progresso',
      key: 'bar',
      render: (_: any, record: PlayerPerformance) => (
        <div
          style={{
            width: 80,
            height: 8,
            background: '#21314d',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${(record.overall / 5) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, #38bdf8, #22c55e)`,
              borderRadius: 99,
            }}
          />
        </div>
      ),
    },
    {
      title: 'Evolução',
      key: 'evolution',
      render: (_: any, record: PlayerPerformance) => (
        <Button
          icon={<LineChartOutlined />}
          size="small"
          onClick={() => handleViewEvolution(record.id)}
        >
          Evolução
        </Button>
      ),
    },
  ];

  if (loading)
    return <Spin size="large" style={{ display: 'block', marginTop: 50 }} />;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ color: '#2bd96b', marginBottom: 24 }}>
        🏐 Desempenho dos Atletas
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<UserOutlined />}
            title="ATLETAS"
            value={kpis.total}
            color="#2bd96b"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<StarOutlined />}
            title="MÉDIA GERAL"
            value={kpis.avgOverall}
            color="#38bdf8"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<TrophyOutlined />}
            title="ELITE"
            value={kpis.elite}
            color="#f59e0b"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            icon={<RiseOutlined />}
            title="A DESENVOLVER"
            value={kpis.developing}
            color="#ef4444"
          />
        </Col>
      </Row>

      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar atleta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 250 }}
        />
        <Select
          placeholder="Filtrar por nível"
          allowClear
          style={{ width: 180 }}
          value={levelFilter}
          onChange={setLevelFilter}
          options={[
            'Elite',
            'Muito alto',
            'Alto',
            'Médio',
            'A desenvolver',
            'Iniciante',
          ].map((n) => ({ value: n, label: n }))}
        />
        <Select
          placeholder="Ordenar por"
          style={{ width: 200 }}
          value={sortSkill}
          onChange={setSortSkill}
          options={[
            { value: 'overall', label: 'Overall' },
            ...allSkills.map((s) => ({ value: s, label: s })),
          ]}
        />
      </Space>

      <Card
        title={
          <span style={{ color: '#2bd96b', fontSize: 20 }}>Ranking Geral</span>
        }
        style={{
          backgroundColor: '#1a1a1a',
          borderColor: '#333',
          borderRadius: 8,
        }}
        styles={{ body: { padding: 0 }}}
      >
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          scroll={{ x: 1000 }}
          style={{ backgroundColor: '#1a1a1a' }}
          rowClassName={() => 'dark-row'}
        />
      </Card>

      <Modal
        title={<span style={{ color: '#2bd96b' }}>Evolução dos Ratings</span>}
        open={evolutionModalOpen}
        onCancel={() => setEvolutionModalOpen(false)}
        footer={null}
        width={900}
        style={{ top: 20 }}
        styles={{ body: { backgroundColor: '#1a1a1a', padding: '24px' }}}
      >
        {evolutionLoading ? (
          <Spin />
        ) : evolutionData.length > 0 ? (
          <div style={{ width: '100%', height: 400 }}>
            <LineChart
              width={800}
              height={400}
              data={evolutionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#aaa" />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="#aaa" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 8,
                }}
              />
              <Legend />
              {evolutionSkills.map((skill, idx) => (
                <Line
                  key={skill}
                  type="monotone"
                  dataKey={skill}
                  stroke={
                    ['#38bdf8', '#22c55e', '#f59e0b', '#a78bfa', '#ef4444'][idx % 5]
                  }
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
            Nenhum dado de evolução disponível para este atleta.
          </div>
        )}
      </Modal>
    </div>
  );
}