import { useOutletContext } from "react-router";
import { DosenWaliPortal } from "../components/dosen/DosenWaliPortal";

interface OutletContext {
  user: { email: string; role: string; name: string } | null;
  roleLabel: string;
  token: string;
}

export default function PersetujuanKRS() {
  const { token } = useOutletContext<OutletContext>();

  return <DosenWaliPortal token={token} />;
}
