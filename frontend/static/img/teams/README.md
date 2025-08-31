Place NBA team SVG logos in this folder, named by slug.

Naming convention:
- File path: `/static/img/teams/<team-slug>.svg`
- Slug: team name lowercased, punctuation removed, spaces to hyphens.
  Examples: `los-angeles-lakers.svg`, `golden-state-warriors.svg`, `boston-celtics.svg`

Fallback:
- If a specific team logo is missing, the UI hides the broken image gracefully.
- You can also duplicate `unknown.svg` to a team slug temporarily if needed.

Tip:
- If you already have assets, you can bulk copy them here so Django/Whitenoise serves them at `/static/img/teams/`.
