import { Alert, Card, Space, Steps } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import Paragraph from "antd/es/typography/Paragraph";
import TextArea from "antd/es/input/TextArea";
import { requestKeyReplacementAction } from "@/app/actions";
import { FormField } from "@/app/components/form-field";
import { PendingButton } from "@/app/components/pending-button";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CreateClaimButton } from "@/app/components/create-claim-button";
import { ACCESS_STAGE_STEP, computeAccessStage } from "@/lib/mon-access-rules";

const STEPS = [
  { title: "Demande de parrainage", description: "Soumise par ton parrain" },
  { title: "Validation de l'équipe", description: "Un administrateur examine la demande" },
  { title: "Clé préparée", description: "L'équipe ajoute ta clé R2" },
  { title: "Clé disponible", description: "À récupérer via un lien personnel" },
];

export default async function AccessPage() {
  const actor = await requireMember();
  const user = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: {
      referredRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      accessRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      accessKeys: { where: { status: "ACTIVE" }, take: 1 },
      keyReplacementRequests: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const req = user?.referredRequests[0];
  const directRequest = user?.accessRequests[0];
  const hasActiveKey = (user?.accessKeys.length ?? 0) > 0;
  const replacement = user?.keyReplacementRequests[0];

  const stage = computeAccessStage({
    hasActiveKey,
    sponsorshipStatus: req?.status,
    accessRequestStatus: directRequest?.status,
  });
  const done = ACCESS_STAGE_STEP[stage];

  const rejectionReason =
    directRequest?.status === "REJECTED" ? directRequest.decisionComment : req?.status === "REJECTED" ? req.rejectionReason : null;

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      <div>
        <Text type="secondary">Votre accès</Text>
        <Title level={2} style={{ margin: 0 }}>
          Récupérer votre clé
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Suivi de ton compte et génération d&apos;un lien personnel à usage unique.
        </Paragraph>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 16, alignItems: "start" }}>
        <Card title="Statut du compte">
          <Steps
            direction="vertical"
            size="small"
            current={done}
            status={stage === "revoked" || stage === "rejected" ? "error" : "process"}
            items={STEPS}
          />
        </Card>

        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          {hasActiveKey && (
            <Card title="Remplacer ma clé">
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {replacement?.status === "PENDING" ? (
                  <Alert type="warning" showIcon message="Ta demande de remplacement est en cours d'examen par l'équipe." />
                ) : (
                  <>
                    {replacement?.status === "REJECTED" && (
                      <Alert
                        type="error"
                        showIcon
                        message="Dernière demande refusée"
                        description={replacement.decisionComment || "Tu peux envoyer une nouvelle demande si nécessaire."}
                      />
                    )}
                    <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                      Explique pourquoi tu souhaites recevoir une nouvelle clé. L&apos;ancienne reste active tant que l&apos;équipe n&apos;a pas effectué le remplacement.
                    </Paragraph>
                    <form action={requestKeyReplacementAction}>
                      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <FormField label="Motif du remplacement" hint="500 caractères maximum.">
                          <TextArea name="reason" required maxLength={500} rows={3} placeholder="Décris brièvement le problème rencontré avec ta clé…" />
                        </FormField>
                        <PendingButton pendingLabel="Envoi…" className="sfr-action">Demander le remplacement</PendingButton>
                      </Space>
                    </form>
                  </>
                )}
              </Space>
            </Card>
          )}

          <Card title="Générer mon lien">
            {stage === "ready" ? (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                  Ta clé est prête. Crée un lien personnel pour l&apos;afficher une seule fois.
                </Paragraph>
                <CreateClaimButton />
                <Alert type="warning" showIcon message="Le lien expire dans 15 minutes et ne fonctionne qu'une seule fois." />
              </Space>
            ) : stage === "revoked" ? (
              <Alert type="error" showIcon message="Ta clé a été révoquée. Contacte l'équipe sur Discord pour en obtenir une nouvelle." />
            ) : stage === "rejected" ? (
              <Alert
                type="error"
                showIcon
                message="Ta demande a été refusée."
                description={
                  <>
                    {rejectionReason ? <p>{rejectionReason}</p> : null}
                    <Text type="secondary">Tu peux en discuter avec ton parrain, ou soumettre une nouvelle demande d&apos;accès.</Text>
                  </>
                }
              />
            ) : stage === "none" ? (
              <Alert type="info" showIcon message="Aucun accès n'a encore été préparé. Fais-toi parrainer ou soumets une demande d'accès sur le serveur Discord." />
            ) : (
              <Alert type="warning" showIcon message="Ta demande suit son cours. Tu pourras générer ton lien dès que la clé sera prête." />
            )}
          </Card>

          <Card title="Où utiliser la clé">
            <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12.5 }}>
              Ouvre la configuration de <strong>StreamFusion Reborn</strong> et colle la clé dans le champ{" "}
              <Text code>R2 access key</Text>, puis valide.
            </Paragraph>
          </Card>
        </Space>
      </div>
    </Space>
  );
}
