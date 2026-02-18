import { redirect } from "next/navigation";
import { getCurrentUserAndRole } from "@/lib/supabase/roles";
import DeviceLayoutEditor from "@/components/DeviceLayoutEditor";

export default async function DeviceSetupPage() {
  const { isAdmin } = await getCurrentUserAndRole();
  if (!isAdmin) {
    redirect("/bookcase");
  }

  return (
    <main className="bookcase-scene">
      <DeviceLayoutEditor />
    </main>
  );
}
