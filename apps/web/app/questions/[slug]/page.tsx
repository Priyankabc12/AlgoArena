import QuestionWorkspace from "../../../features/user-questions/question-workspace";

type Props = { params: Promise<{ slug: string }> };

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  return <QuestionWorkspace slug={slug} />;
}
