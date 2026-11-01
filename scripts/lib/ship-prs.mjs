// One document should have one open PR even when separate worktrees choose different fix branches.
export const isDocBranch = (name, slug) => name === `doc/${slug}` || name?.startsWith(`doc/${slug}-fix-`);

export function classifyDocPrs(prs, slug, branch) {
  const related = prs.filter((pr) => isDocBranch(pr.headRefName, slug));
  return {
    current: related.find((pr) => pr.headRefName === branch) || null,
    conflicts: related.filter((pr) => pr.headRefName !== branch),
  };
}
