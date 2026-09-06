return {
  question_text:
    question.question_text,

  option_a:
    question.option_a,

  option_b:
    question.option_b,

  option_c:
    question.option_c,

  option_d:
    question.option_d,

  correct_answer:
    question.correct_answer,

  explanation:
    question.explanation,

  tip:
    question.tip,

  difficulty:
    question.difficulty,

  category_id:
    question.category_id,

  source:
    "PDF" as const,

  source_document:
    data.sourceDocument,

  source_page:
    question.page,

  import_id:
    data.importId,

  image_url:
    question.image_url,

  needs_review:
    needsReview,

  is_published:
    !needsReview,

  is_verified:
    false,
};
