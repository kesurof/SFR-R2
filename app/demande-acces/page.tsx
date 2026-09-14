import { Card, Input, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import TextArea from "antd/es/input/TextArea";
import { createAccessRequest } from "@/app/actions";
import { FormField } from "@/app/components/form-field";
import { PendingButton } from "@/app/components/pending-button";
import { StatusBadge } from "@/app/components/status-badge";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function AccessRequestPage() {
  const actor = await requireMember();
  const latest = await prisma.accessRequest.findFirst({ where: { requester: { discordId: actor.discordId } }, orderBy: { createdAt: "desc" } });
  const locked = latest && ["PENDING", "APPROVED", "KEY_READY"].includes(latest.status);

  return (
    <Space direction="vertical" size="large" style={{ display: "flex", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <Text type="secondary">Accès privé</Text>
        <Title level={2} style={{ margin: 0 }}>
          Demander un accès
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Répondez brièvement : ces informations sont examinées uniquement dans le portail.
        </Paragraph>
      </div>

      {locked ? (
        <Card>
          <Space direction="vertical" size="small">
            <StatusBadge status={latest.status} />
            <Paragraph style={{ marginBottom: 0 }}>
              {latest.status === "PENDING"
                ? "Votre demande est en cours d’examen."
                : latest.status === "APPROVED"
                  ? "Votre demande est acceptée. L’équipe prépare votre clé."
                  : "Votre clé est prête : rendez-vous dans Mon accès."}
            </Paragraph>
          </Space>
        </Card>
      ) : (
        <Card>
          <form action={createAccessRequest}>
            {latest?.status === "REJECTED" && (
              <Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
                {`Dernière demande refusée${
                  latest.decisionComment ? ` : ${latest.decisionComment}` : ". Vous pouvez déposer une nouvelle demande si votre situation a changé."
                }`}
              </Paragraph>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField label="Serveurs Discord et trackers" hint="600 caractères maximum.">
                  <TextArea
                    name="communitiesAndTrackers"
                    required
                    maxLength={600}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    placeholder="Les communautés ou trackers que vous fréquentez."
                  />
                </FormField>
              </div>
              <FormField label="Vos motivations" hint="1 000 caractères maximum.">
                <TextArea
                  name="motivations"
                  required
                  maxLength={1000}
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  placeholder="Pourquoi souhaitez-vous accéder au service ?"
                />
              </FormField>
              <FormField label="Votre parcours self-hosting" hint="1 000 caractères maximum.">
                <TextArea
                  name="selfHostingExperience"
                  required
                  maxLength={1000}
                  autoSize={{ minRows: 2, maxRows: 5 }}
                  placeholder="Vos usages, projets ou expérience d’auto-hébergement."
                />
              </FormField>
              <div style={{ gridColumn: "1 / -1" }}>
                <FormField
                  label={
                    <>
                      Comment avez-vous connu le service <Text type="secondary">· facultatif</Text>
                    </>
                  }
                >
                  <Input name="discoverySource" maxLength={300} placeholder="Une personne, une communauté…" />
                </FormField>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
              <Text type="secondary">Votre identité Discord est associée automatiquement.</Text>
              <PendingButton pendingLabel="Envoi…" className="sfr-action">Envoyer la demande</PendingButton>
            </div>
          </form>
        </Card>
      )}
    </Space>
  );
}
