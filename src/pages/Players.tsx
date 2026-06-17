import { Card, Col, Form, Input, Radio, Table, message, Tag, Modal, Popconfirm, Space, DatePicker, Select, InputNumber, Row } from "antd";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createPlayer, listPlayersWithRatings, updatePlayer, deletePlayer } from "../api/players";
import type { Player } from "../api/players";
import AppButton from "../components/AppButton";
import PlayerRatingsModal from "../features/players/PlayerRatingsModal";
import { CloseOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { http } from "../api/http";

const formatPhone = (digits: string) => {
  if (!digits) return "";
  let formatted = `(${digits.substring(0, 2)}`;
  if (digits.length >= 3) formatted += `) ${digits.substring(2, 7)}`;
  if (digits.length >= 8) formatted += `-${digits.substring(7, 11)}`;
  return formatted;
};

interface Position {
  id: string;
  name: string;
  active: boolean;
}

export default function Players() {
  const [items, setItems] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [ratingsPlayerId, setRatingsPlayerId] = useState<string | null>(null);
  const [ratingsPlayerName, setRatingsPlayerName] = useState<string | undefined>(undefined);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editForm] = Form.useForm();

  const [rawPhone, setRawPhone] = useState("");
  const [editRawPhone, setEditRawPhone] = useState("");

  const [positionsList, setPositionsList] = useState<Position[]>([]);
  const [newPlayerPositions, setNewPlayerPositions] = useState<{ positionId: string; priority: number }[]>([]);
  const [editPlayerPositions, setEditPlayerPositions] = useState<{ positionId: string; priority: number }[]>([]);

  useEffect(() => {
    http.get("/positions").then(res => setPositionsList(res.data)).catch(() => message.error("Erro ao carregar posições"));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listPlayersWithRatings();
      setItems(list);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao listar jogadores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setRawPhone(digits);
  };

  const handleEditPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setEditRawPhone(digits);
  };

  const handleCreate = async (values: any) => {
    try {
      const birthDate = values.birthDate ? (values.birthDate as Dayjs).format("YYYY-MM-DD") : undefined;
      await createPlayer({
        name: values.name,
        sex: values.sex,
        email: values.email || undefined,
        phone: rawPhone || undefined,
        birthDate,
        positions: newPlayerPositions,
      });
      message.success("Jogador criado");
      setRawPhone("");
      setNewPlayerPositions([]);
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao criar jogador");
    }
  };

  const openRatings = (p: Player) => {
    setRatingsPlayerId(p.id);
    setRatingsPlayerName(p.name);
    setRatingsOpen(true);
  };

  const closeRatings = () => {
    setRatingsOpen(false);
    setRatingsPlayerId(null);
    setRatingsPlayerName(undefined);
  };

  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    editForm.setFieldsValue({
      name: player.name,
      sex: player.sex,
      email: player.email ?? "",
      phone: player.phone ? formatPhone(player.phone.replace(/\D/g, "")) : "",
      birthDate: player.birthDate ? dayjs(player.birthDate) : null,
    });
    setEditRawPhone(player.phone?.replace(/\D/g, "") ?? "");
    const existingPositions = (player.positions || []).map(p => ({
      positionId: p.positionId,
      priority: p.priority,
    }));
    setEditPlayerPositions(existingPositions);
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingPlayer) return;
    try {
      const values = await editForm.validateFields();
      const birthDate = values.birthDate ? (values.birthDate as Dayjs).format("YYYY-MM-DD") : undefined;
      await updatePlayer(editingPlayer.id, {
        name: values.name,
        sex: values.sex,
        email: values.email || undefined,
        phone: editRawPhone || undefined,
        birthDate,
        positions: editPlayerPositions,
      });
      message.success("Jogador atualizado");
      setEditModalOpen(false);
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlayer(id);
      message.success("Jogador excluído");
      await refresh();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Erro ao excluir");
    }
  };

  const handleCreatePositionChange = (selectedIds: string[]) => {
    const updated = selectedIds.map((id, idx) => {
      const existing = newPlayerPositions.find(p => p.positionId === id);
      return { positionId: id, priority: existing ? existing.priority : idx + 1 };
    });
    setNewPlayerPositions(updated);
  };

  const handleEditPositionChange = (selectedIds: string[]) => {
    const updated = selectedIds.map((id, idx) => {
      const existing = editPlayerPositions.find(p => p.positionId === id);
      return { positionId: id, priority: existing ? existing.priority : idx + 1 };
    });
    setEditPlayerPositions(updated);
  };

  const columns = useMemo(
    () => [
      { title: "Nome", dataIndex: "name", width: 180, ellipsis: true },
      { title: "Sexo", dataIndex: "sex", width: 70, align: "center" as const },
      {
        title: "Posição",
        key: "position",
        width: 130,
        render: (_: any, p: Player) => {
          if (!p.positions || p.positions.length === 0) return <Tag>—</Tag>;
          const main = p.positions.sort((a, b) => a.priority - b.priority)[0];
          return <Tag color="blue">{main.name}</Tag>;
        },
      },
      {
        title: "Média Rating",
        key: "avg",
        width: 110,
        align: "center" as const,
        render: (_: any, p: Player) => {
          if (p.overall == null) return <Tag color="default">—</Tag>;
          return <span style={{ fontWeight: 900 }}>{p.overall.toFixed(1)}</span>;
        },
      },
      {
        title: "Ações",
        key: "actions",
        width: 240,
        render: (_: any, p: Player) => (
          <Space size={[4, 4]} wrap>
            <AppButton tone="copy" onClick={() => openRatings(p)} style={{ height: 32, lineHeight: "32px", padding: "0 8px", fontSize: 13 }}>
              Ratings
            </AppButton>
            <AppButton tone="save" onClick={() => openEdit(p)} style={{ height: 32, lineHeight: "32px", padding: "0 8px", fontSize: 13 }}>
              Editar
            </AppButton>
            <Popconfirm title="Excluir jogador?" description="Esta ação é irreversível." onConfirm={() => handleDelete(p.id)} okText="Sim" cancelText="Cancelar">
              <AppButton tone="reset" style={{ height: 32, lineHeight: "32px", padding: "0 8px", fontSize: 13 }}>
                Excluir
              </AppButton>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    []
  );

  const cardBodyStyle = { padding: 'clamp(12px, 3vw, 24px)' };

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)', maxWidth: 1400, margin: '0 auto' }}>
      <Space orientation="vertical" style={{ width: "100%" }} size={16}>
        <Card title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>Novo Jogador</span>} styles={{ body: cardBodyStyle }}>
          <Form
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{ sex: "M" }}
          >
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Form.Item
                  name="name"
                  rules={[{ required: true, message: "Informe o nome" }]}
                  label="Nome"
                >
                  <Input placeholder="Nome do jogador" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item
                  name="sex"
                  label="Sexo"
                  rules={[{ required: true }]}
                >
                  <Radio.Group buttonStyle="solid" style={{ width: "100%" }}>
                    <Radio.Button value="M" style={{ width: "50%", textAlign: "center" }}>
                      M
                    </Radio.Button>
                    <Radio.Button value="F" style={{ width: "50%", textAlign: "center" }}>
                      F
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={6}>
                <Form.Item name="email" label="E-mail">
                  <Input type="email" placeholder="email@exemplo.com" />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item name="phone" label="Celular">
                  <Input
                    value={formatPhone(rawPhone)}
                    onChange={handlePhoneChange}
                    placeholder="(99) 99999-9999"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item name="birthDate" label="Nascimento">
                  <DatePicker
                    format="DD/MM/YYYY"
                    placeholder="dd/mm/aaaa"
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} lg={8}>
                <Form.Item label="Posições">
                  <Select
                    mode="multiple"
                    placeholder="Selecione as posições"
                    value={newPlayerPositions.map(p => p.positionId)}
                    onChange={handleCreatePositionChange}
                    style={{ width: "100%" }}
                  >
                    {positionsList.map(pos => (
                      <Select.Option key={pos.id} value={pos.id}>
                        {pos.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {newPlayerPositions
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map(pos => {
                  const posName =
                    positionsList.find(p => p.id === pos.positionId)?.name ||
                    pos.positionId;

                  return (
                    <Col xs={12} sm={8} md={6} lg={4} key={pos.positionId}>
                      <Form.Item label={`Prioridade ${posName}`}>
                        <InputNumber
                          min={1}
                          value={pos.priority}
                          onChange={(val) =>
                            setNewPlayerPositions(prev =>
                              prev.map(p =>
                                p.positionId === pos.positionId
                                  ? { ...p, priority: val || 1 }
                                  : p
                              )
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  );
                })}

              <Col xs={24} sm={12} md={8} lg={4}>
                <Form.Item label=" ">
                  <AppButton
                    tone="generate"
                    htmlType="submit"
                    style={{ width: "100%" }}
                  >
                    Adicionar
                  </AppButton>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>

        <Card
          title={<span style={{ fontSize: 'clamp(16px, 2.5vw, 18px)' }}>Jogadores</span>}
          extra={<AppButton tone="save" onClick={refresh} disabled={loading} style={{ fontSize: 13 }}>Recarregar</AppButton>}
          styles={{ body: cardBodyStyle }}
        >
          <Table
            rowKey="id"
            loading={loading}
            dataSource={items}
            columns={columns as any}
            scroll={{ x: 'max-content' }}
            pagination={{ responsive: true, pageSize: 10, showSizeChanger: false }}
          />
        </Card>
      </Space>

      <Modal
        title="Editar Jogador"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleUpdate}
        okText="Salvar"
        cancelText="Cancelar"
        width="min(90vw, 500px)"
        closeIcon={<CloseOutlined style={{ color: '#01ff69' }} />}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sex" label="Sexo" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio value="M">M</Radio>
              <Radio value="F">F</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="email" label="E-mail">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Celular">
            <Input value={formatPhone(editRawPhone)} onChange={handleEditPhoneChange} placeholder="(99) 99999-9999" />
          </Form.Item>
          <Form.Item name="birthDate" label="Nascimento">
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Posições">
            <Select mode="multiple" placeholder="Selecione" value={editPlayerPositions.map(p => p.positionId)} onChange={handleEditPositionChange} style={{ width: "100%" }}>
              {positionsList.map(pos => <Select.Option key={pos.id} value={pos.id}>{pos.name}</Select.Option>)}
            </Select>
          </Form.Item>
          {editPlayerPositions.sort((a, b) => a.priority - b.priority).map(pos => {
            const posName = positionsList.find(p => p.id === pos.positionId)?.name || pos.positionId;
            return (
              <Form.Item key={pos.positionId} label={`Prioridade ${posName}`}>
                <InputNumber min={1} value={pos.priority} onChange={(val) => setEditPlayerPositions(prev => prev.map(p => p.positionId === pos.positionId ? { ...p, priority: val || 1 } : p))} style={{ width: "100%" }} />
              </Form.Item>
            );
          })}
        </Form>
      </Modal>

      <PlayerRatingsModal
        open={ratingsOpen}
        playerId={ratingsPlayerId}
        playerName={ratingsPlayerName}
        onClose={closeRatings}
        onSaved={async () => {
          if (ratingsPlayerId) await refresh();
        }}
      />
    </div>
  );
}