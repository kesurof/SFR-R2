"use client";

import { useFormStatus } from "react-dom";
import { Button } from "antd";

export function PendingButton({
  children,
  pendingLabel,
  className,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="primary"
      htmlType="submit"
      loading={pending}
      disabled={pending}
      name={name}
      value={value}
      className={className}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
