// The one place to personalise the app. Every name, team or story shown in the UI reads from here.
// TODO(me): replace each {{...}} placeholder.

export const identity = {
  projectName: 'Lemmascope',
  yourName: '{{YOUR_NAME}}',
  teamName: '{{TEAM_NAME}}',
  collegeOrOrg: '{{COLLEGE_OR_ORG}}',
  oneLineStory: '{{ONE_LINE_STORY}}',
  event: 'Syntax Error 2026',
  repoUrl: '{{REPO_URL}}',
} as const;

/** True while a value is still a `{{PLACEHOLDER}}`, so the UI can hide it gracefully. */
export const isPlaceholder = (value: string): boolean => /^\{\{.*\}\}$/.test(value);
