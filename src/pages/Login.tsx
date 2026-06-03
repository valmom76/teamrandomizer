import { Card, Form, Input, message } from "antd";
import { loginBySlug } from "../api/auth";
import { authStore } from "../auth/store";
import { useNavigate } from "react-router-dom";
import AppButton from "../components/AppButton";

export default function Login() {
  const [form] = Form.useForm();
  const nav = useNavigate();

  async function onFinish(values: any) {
    try {
      const res = await loginBySlug(values);

      authStore.set({
        token: res.token,
        tenantId: res.tenantId,
        userId: res.userId,
        role: res.role,
        tenantSlug: values.tenantSlug,
        userName: res.userName,
        primaryColor: res.primaryColor,      // ← NOVO
        secondaryColor: res.secondaryColor,  // ← NOVO
        logoUrl: res.logoUrl,                // ← NOVO
      });

      message.success("Bem-vindo!");
      nav(`/t/${values.tenantSlug}/dashboard`);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Falha no login");
    }
  }

  return (
    <Card title="Entrar no grupo" style={{ maxWidth: 520 }}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        initialValues={{
          tenantSlug: authStore.getTenantSlug() ?? "",
        }}
      >
        <Form.Item
          label="Grupo"
          name="tenantSlug"
          rules={[{ required: true, message: "Informe o grupo" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[{ required: true, type: "email" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Senha"
          name="password"
          rules={[{ required: true }]}
        >
          <Input.Password />
        </Form.Item>

        <AppButton tone="generate" htmlType="submit" block>
          Entrar
        </AppButton>
      </Form>
    </Card>
  );
}