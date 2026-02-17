import { redirect } from "next/navigation";

type EpisodePageProps = {
  params: { id: string };
};

export default function EpisodePage(_props: EpisodePageProps) {
  redirect("/bookcase");
}

