"use client";

import { useState } from "react";
import { Button, Descriptions, Drawer, Space, Typography } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { StatusBadge } from "@/app/components/status-badge";

export function AccessRequestDetails({
  request,
}: {
  request: { name: string; id: string; status: string; communities: string; motivations: string; selfHosting: string; discovery: string | null };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" icon={<EyeOutlined />} onClick={() => setOpen(true)}>
        Voir
      </Button>
      <Drawer title={request.name} open={open} onClose={() => setOpen(false)} width={560} destroyOnHidden>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <StatusBadge status={request.status} />

          <Descriptions
            size="small"
            column={1}
            bordered
            title="Demandeur"
            items={[{ key: "id", label: "Discord ID", children: <Typography.Text code>{request.id}</Typography.Text> }]}
          />

          <div>
            <Typography.Title level={5}>Discords et trackers</Typography.Title>
            <Typography.Paragraph>{request.communities}</Typography.Paragraph>
          </div>
          <div>
            <Typography.Title level={5}>Motivations</Typography.Title>
            <Typography.Paragraph>{request.motivations}</Typography.Paragraph>
          </div>
          <div>
            <Typography.Title level={5}>Parcours self-hosting</Typography.Title>
            <Typography.Paragraph>{request.selfHosting}</Typography.Paragraph>
          </div>
          <div>
            <Typography.Title level={5}>Découverte</Typography.Title>
            <Typography.Paragraph>{request.discovery || "Non renseigné"}</Typography.Paragraph>
          </div>
        </Space>
      </Drawer>
    </>
  );
}
