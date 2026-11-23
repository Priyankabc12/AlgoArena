import SubmissionDetails from "../../../features/user-questions/submission-details";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionDetails id={id} />;
}
