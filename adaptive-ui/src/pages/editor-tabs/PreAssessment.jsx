import QuestionBank from './QuestionBank'

export default function PreAssessment({ courseId }) {
  return <QuestionBank courseId={courseId} poolType="ADAPTIVE_ROUND"
    title="Pre-Assessment" icon="📝"
    hint="Adaptive round questions — used to gauge learner knowledge before the course" />
}
