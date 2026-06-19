import { Card, Col, Form, Input, Row, Space, Table, message } from "antd";
import { useEffect, useState } from "react";
import { createSkill, listSkills } from "../api/skills";
import type { Skill } from "../api/skills";
import AppButton from "../components/AppButton";

export default function Skills() {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await listSkills());
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? "Erro ao listar skills");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate(values: any) {
    try {
      await createSkill(values);
      message.success("Skill criada");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? "Erro ao criar skill");
    }
  }

  const cardBodyStyle = { padding: 'clamp(12px, 3vw, 24px)' };

  return (
    <div style={{ padding: 'clamp(8px, 2vw, 24px)', maxWidth: 800, margin: '0 auto' }}>
      <Space orientation="vertical" style={{ width: "100%" }} size={16}>
        <Card
          title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)', color: '#01ff69' }}>Nova Skill</span>}
          styles={{
            body: cardBodyStyle,
            header: { borderBottom: '1px solid #333' },
          }}
          style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
        >
          <Form layout="vertical" onFinish={onCreate}>
            <Row gutter={[12, 8]} align="bottom">
              <Col xs={24} sm={18} md={20}>
                <Form.Item
                  name="name"
                  rules={[{ required: true, message: "Informe o nome da skill" }]}
                  label="Nome"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Ex: Saque, Ataque, Defesa..." />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6} md={4}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <AppButton tone="generate" htmlType="submit" style={{ width: "100%" }}>
                    Adicionar
                  </AppButton>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)', color: '#01ff69' }}>Skills</span>}
          styles={{
            body: cardBodyStyle,
            header: { borderBottom: '1px solid #333' },
          }}
          style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={items}
            columns={[
              { title: "Nome", dataIndex: "name", width: "60%", ellipsis: true },
              { title: "Ativa", dataIndex: "active", width: "40%", render: (v) => (v ? "Sim" : "Não") },
            ]}
            scroll={{ x: 'max-content' }}
            pagination={{ responsive: true, pageSize: 10, showSizeChanger: false }}
            style={{ backgroundColor: '#1a1a1a' }}
            rowClassName={() => 'dark-row'}
          />
        </Card>
      </Space>
    </div>
  );
}