import { notFound } from "next/navigation";
import {
  exampleQuestions,
} from "../../../features/user-questions/example-questions";
import QuestionWorkspace from "../../../features/user-questions/question-workspace";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;

  const question = exampleQuestions.find(
    (q) => q.slug === slug
  );

  if (!question) {
    notFound();
  }

  return <QuestionWorkspace question={question} />;
}