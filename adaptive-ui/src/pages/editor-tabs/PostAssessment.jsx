import QuestionBank from './QuestionBank'

export default function PostAssessment({ courseId }) {
  return <QuestionBank courseId={courseId} poolType="FINAL_EXAM"
    title="Post-Assessment" icon="✅"
    hint="Final exam questions — used to certify learner mastery after completing the course" />
}
