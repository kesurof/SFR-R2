import { Alert, Card, Checkbox, Input, Space } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import TextArea from "antd/es/input/TextArea";
import { createSponsorship } from "@/app/actions";
import { FormField } from "@/app/components/form-field";
import { PendingButton } from "@/app/components/pending-button";
import { identity, isAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function SponsorPage() {
  await requireMember();
  const actor = await identity();
  const user = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: { sponsorPermission: true },
  });

  if (!isAdmin(actor.discordId) && !user?.sponsorPermission) {
    return (
      <Space direction="vertical" size="large" style={{ display: "flex", maxWidth: 720, margin: "0 auto" }}>
        <div>
          <Text type="secondary">Parrainage</Text>
          <Title level={2} style={{ margin: 0 }}>
            Autorisation requise
          </Title>
        </div>
        <Alert
          type="error"
          showIcon
          message="Parrainage indisponible"
          description="Ton compte Discord n'a pas encore l'autorisation de parrainer. Demande-la à un administrateur sur le serveur."
        />
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ display: "flex", maxWidth: 720, margin: "0 auto" }}>
      <div>
        <Text type="secondary">Parrainage</Text>
        <Title level={2} style={{ margin: 0 }}>
          Nouvelle recommandation
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Indique uniquement des informations utiles à la décision de l&apos;équipe.
        </Paragraph>
      </div>

      <Card>
        <form action={createSponsorship}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <FormField label="Filleul" hint="17 à 20 chiffres pour un ID, ou un pseudo unique du serveur.">
                <Input name="discordId" placeholder="Discord ID, nom ou pseudo serveur" required />
              </FormField>
              <FormField label="Votre relation">
                <Input name="relationship" placeholder="Ami, collègue, famille…" required maxLength={160} />
              </FormField>
              <FormField label="Depuis quand ?">
                <Input name="knownSince" placeholder="Ex. 3 ans" required maxLength={100} />
              </FormField>
              <FormField
                label={
                  <>
                    Commentaire <Text type="secondary">· facultatif</Text>
                  </>
                }
              >
                <Input name="comment" placeholder="Élément complémentaire utile" maxLength={1000} />
              </FormField>
            </div>
            <FormField label="Contexte">
              <TextArea
                name="context"
                placeholder="Comment tu connais cette personne et pourquoi tu la recommandes."
                required
                maxLength={1000}
                rows={4}
              />
            </FormField>
          </Space>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 20, flexWrap: "wrap" }}>
            <Checkbox name="attestationAccepted" value="true">
              Je confirme connaître cette personne et j&apos;assume cette recommandation.
            </Checkbox>
            <PendingButton pendingLabel="Envoi…">Envoyer la demande</PendingButton>
          </div>
        </form>
      </Card>
    </Space>
  );
}
