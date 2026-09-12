"use client";

import { useState } from "react";
import { Alert, Button, Descriptions, Drawer, List, Space, Typography } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import { StatusBadge } from "@/app/components/status-badge";

type Audit = { event: string; actorDiscordId: string | null; createdAt: string };
export type RequestDetailsData = {
  referredName: string; referredUsername: string; referredId: string; referredNickname: string | null;
  sponsorName: string; sponsorId: string; relationship: string; knownSince: string; context: string; comment: string | null;
  attestationAccepted: boolean; attestationAcceptedAt: string | null; createdAt: string; decidedAt: string | null; decidedByDiscordId: string | null; audits: Audit[];
  status?: string;
  rejectionReason?: string | null;
};
const value = (text: string | null | undefined) => text?.trim() || "Non renseigné";
const dateTime = (iso: string) => new Date(iso).toLocaleString("fr-FR");
const labels: Record<string, string> = { SPONSOR_REQUEST_CREATED: "Demande créée", SPONSOR_REQUEST_APPROVED: "Demande acceptée", SPONSOR_REQUEST_REJECTED: "Demande refusée", SPONSOR_REQUEST_ARCHIVED: "Demande archivée", ACCESS_KEY_CREATED: "Clé enregistrée", SPONSOR_REQUEST_KEY_READY: "Clé disponible", ACCESS_KEY_REVOKED: "Clé révoquée", SPONSOR_REQUEST_KEY_REVOKED: "Accès révoqué" };

export function RequestDetails({ request }: { request: RequestDetailsData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" icon={<EyeOutlined />} onClick={() => setOpen(true)}>
        Voir
      </Button>
      <Drawer title={request.referredName} open={open} onClose={() => setOpen(false)} width={560} destroyOnHidden>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space>
            {request.status && <StatusBadge status={request.status} />}
            <Typography.Text type="secondary">
              Soumise le {new Date(request.createdAt).toLocaleDateString("fr-FR")}
            </Typography.Text>
          </Space>

          <Descriptions
            size="small"
            column={1}
            bordered
            title="Filleul"
            items={[
              { key: "username", label: "Nom Discord", children: value(request.referredUsername) },
              { key: "nickname", label: "Pseudo serveur", children: value(request.referredNickname) },
              { key: "id", label: "Discord ID", children: <Typography.Text code>{request.referredId}</Typography.Text> },
            ]}
          />

          <Descriptions
            size="small"
            column={1}
            bordered
            title="Parrain"
            items={[
              { key: "name", label: "Nom", children: value(request.sponsorName) },
              { key: "id", label: "Discord ID", children: <Typography.Text code>{request.sponsorId}</Typography.Text> },
              {
                key: "attestation",
                label: "Attestation",
                children:
                  `${request.attestationAccepted ? "Confirmée" : "Non confirmée"}${
                    request.attestationAcceptedAt ? ` · ${dateTime(request.attestationAcceptedAt)}` : ""
                  }`,
              },
            ]}
          />

          <Descriptions
            size="small"
            column={1}
            bordered
            title="Recommandation"
            items={[
              { key: "relationship", label: "Relation", children: value(request.relationship) },
              { key: "knownSince", label: "Connu depuis", children: value(request.knownSince) },
            ]}
          />

          <div>
            <Typography.Title level={5}>Contexte</Typography.Title>
            <Typography.Paragraph>{value(request.context)}</Typography.Paragraph>
          </div>
          <div>
            <Typography.Title level={5}>Commentaire</Typography.Title>
            <Typography.Paragraph>{value(request.comment)}</Typography.Paragraph>
          </div>

          <Descriptions
            size="small"
            column={1}
            bordered
            title="Décision"
            items={[
              {
                key: "status",
                label: "État",
                children: request.status ? <StatusBadge status={request.status} /> : "Pas encore décidée",
              },
              {
                key: "date",
                label: "Date",
                children: request.decidedAt ? dateTime(request.decidedAt) : "En attente de traitement",
              },
              { key: "by", label: "Traitée par", children: value(request.decidedByDiscordId) },
            ]}
          />

          {request.rejectionReason && (
            <Alert type="error" showIcon message="Motif du refus" description={request.rejectionReason} />
          )}

          {request.audits.length > 0 && (
            <div>
              <Typography.Title level={5}>Historique</Typography.Title>
              <List
                size="small"
                dataSource={request.audits}
                renderItem={(audit) => (
                  <List.Item>
                    <List.Item.Meta
                      title={labels[audit.event] ?? audit.event}
                      description={`${dateTime(audit.createdAt)}${audit.actorDiscordId ? ` · ${audit.actorDiscordId}` : ""}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          )}
        </Space>
      </Drawer>
    </>
  );
}
