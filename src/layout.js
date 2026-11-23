// Shared grid for the page template and the README builder.
// The page is PAGE_WIDTH CSS px wide, split into 12 spans of 74 px.
export const PAGE_WIDTH = 888;
export const SPAN_PX = PAGE_WIDTH / 12;

export const ROWS = [
  [{ id: 'masthead', span: 12 }],
  [{ id: 'lead', span: 8 }, { id: 'side', span: 4 }],
  [{ id: 'activity', span: 12 }],
  [{ id: 'projects-bar', span: 12 }],
  [{ id: 'project-newspapercn', span: 6 }, { id: 'project-sleight', span: 6 }],
  [{ id: 'business-bar', span: 12 }],
  [{ id: 'biz-f2f', span: 3 }, { id: 'biz-bizcopilot', span: 3 }, { id: 'biz-pos', span: 3 }, { id: 'biz-mmtrails', span: 3 }],
  [{ id: 'classifieds', span: 7 }, { id: 'weather', span: 5 }],
];
