// The one place to personalise the app. Every name, team or story shown in the UI reads from here.
// TODO(me): replace each {{...}} placeholder.

export const identity = {
  projectName: 'Replean',
  yourName: 'Khushi',
  teamName: 'Bilibuu',
  collegeOrOrg: 'IITR',
  oneLineStory: 'Proofs are the most beautiful things in mathematics, but you never see them happen, only the final answer; I wanted to watch one think.',
  event: 'Syntax Error 2026',
  repoUrl: 'https://github.com/khushijain010/FPLaunchpad_REPLEAN/',
  /** Shown under "Contact" in Help. */
  githubProfile: 'https://github.com/khushijain010',
  // TODO(me): an email (or LinkedIn) to show under "Contact" in Help. Hidden while it's a placeholder.
  contactEmail: 'khushijain010705@gmail.com',
} as const;

/** True while a value is still a `{{PLACEHOLDER}}`, so the UI can hide it gracefully. */
export const isPlaceholder = (value: string): boolean => /^\{\{.*\}\}$/.test(value);
