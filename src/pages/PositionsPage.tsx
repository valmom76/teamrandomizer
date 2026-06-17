import { Card, Col, Form, Input, Radio, Row, Space, Table, message, Modal, Popconfirm, Tag } from "antd";
import { useEffect, useState } from "react";
import { http } from "../api/http";
import AppButton from "../components/AppButton";

export interface Position {
  id: string;
  name: string;
  active: boolean;
}

export default function PositionsPage() {
  const [items, setItems] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form] = Form.useForm();

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await http.get<Position[]>("/positions");
      setItems(data);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao carregar posições");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (values: { name: string }) => {
    try {
      await http.post("/positions", values);
      message.success("Posição criada");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar posição");
    }
  };

  const openEdit = (pos: Position) => {
    setEditing(pos);
    form.setFieldsValue({ name: pos.name, active: pos.active });
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const values = await form.validateFields();
      await http.put(`/positions/${editing.id}`, values);
      message.success("Posição atualizada");
      setEditModalOpen(false);
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await http.delete(`/positions/${id}`);
      message.success("Posição excluída");
      refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao excluir");
    }
  };

  const columns = [
    { title: "Nome", dataIndex: "name", key: "name", width: "60%" },
    {
      title: "Ativa",
      dataIndex: "active",
      key: "active",
      width: "20%",
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Sim" : "Não"}</Tag>
      ),
    },
    {
      title: "Ações",
      key: "actions",
      width: "20%",
      render: (_: any, record: Position) => (
        <Space size={[4, 4]} wrap>
          <AppButton tone="save" onClick={() => openEdit(record)} style={{ fontSize: 13 }}>
            Editar
          </AppButton>
          <Popconfirm
            title="Excluir posição?"
            onConfirm={() => handleDelete(record.id)}
            okText="Sim"
            cancelText="Cancelar"
          >
            <AppButton tone="reset" style={{ fontSize: 13 }}>Excluir</AppButton>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const cardBodyStyle = { padding: 'clamp(12px, 3vw, 24px)' };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 800, margin: '0 auto' }}>
      <Space orientation="vertical" style={{ width: "100%" }} size={16}>
        <Card
          title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>Nova Posição</span>}
          styles={{ body: cardBodyStyle }}
        >
          <Form layout="vertical" onFinish={handleCreate}>
            <Row gutter={[12, 8]} align="bottom">
              <Col xs={24} sm={18} md={20}>
                <Form.Item
                  name="name"
                  rules={[{ required: true, message: "Informe o nome da posição" }]}
                  label="Nome"
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Ex: Levantador, Central..." />
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
          title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>Posições</span>}
          styles={{ body: cardBodyStyle }}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={items}
            columns={columns}
            scroll={{ x: 'max-content' }}
            pagination={{ responsive: true, pageSize: 10, showSizeChanger: false }}
          />
        </Card>

        <Modal
          title="Editar Posição"
          open={editModalOpen}
          onCancel={() => setEditModalOpen(false)}
          onOk={handleUpdate}
          okText="Salvar"
          cancelText="Cancelar"
          width="min(90vw, 400px)"
        >
          <Form form={form} layout="vertical">
            <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="active" label="Ativa">
              <Radio.Group>
                <Radio value={true}>Sim</Radio>
                <Radio value={false}>Não</Radio>
              </Radio.Group>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}